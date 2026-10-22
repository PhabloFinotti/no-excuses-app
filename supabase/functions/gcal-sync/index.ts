// Sincroniza tarefas com o Google Agenda (criar/atualizar/apagar), uma ou várias por chamada, ou desconecta.
// Chamada pelo app após cada mudança.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { eventFromTask } from '../_shared/calendarEvent.ts'
import { accessToken, api, createCalendar, InvalidGrant, revoke } from '../_shared/google.ts'

const cors = { 'Access-Control-Allow-Origin': '*', 'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type' }
const json = (body: unknown, status = 200) => Response.json(body, { status, headers: cors })

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: cors })
  const authed = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_ANON_KEY')!, { global: { headers: { Authorization: req.headers.get('Authorization')! } } })
  const { data: { user } } = await authed.auth.getUser()
  if (!user) return json({ error: 'unauthorized' }, 401)

  const body = (await req.json().catch(() => ({}))) as { itemId?: string; itemIds?: string[]; disconnect?: boolean }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: link } = await db.from('google_calendar_links').select('*').eq('user_id', user.id).maybeSingle()
  if (!link) return json({ skipped: 'not connected' })

  const forget = async () => {
    await db.from('calendar_events').delete().eq('user_id', user.id)
    await db.from('google_calendar_links').delete().eq('user_id', user.id)
    await db.from('profiles').update({ calendar_connected: false }).eq('user_id', user.id)
  }
  if (body.disconnect) {
    await revoke(link.refresh_token)
    await forget()
    return json({ disconnected: true })
  }
  const ids = body.itemIds ?? (body.itemId ? [body.itemId] : [])
  if (!ids.length) return json({ error: 'itemId required' }, 400)

  let token: string // um refresh por chamada, mesmo em lote
  try {
    token = await accessToken(link.refresh_token)
  } catch (e) {
    if (e instanceof InvalidGrant) { // acesso revogado no Google: volta ao estado desconectado
      await forget()
      return json({ error: 'reconnect' }, 409)
    }
    throw e
  }

  let calendarId: string = link.calendar_id
  const cal = () => encodeURIComponent(calendarId)

  async function syncOne(itemId: string): Promise<'synced' | 'removed' | 'skipped' | 'error'> {
    const [{ data: item }, { data: map }] = await Promise.all([
      db.from('items').select('*').eq('id', itemId).eq('user_id', user!.id).maybeSingle(),
      db.from('calendar_events').select('event_id').eq('item_id', itemId).maybeSingle(),
    ])
    const removeEvent = async () => {
      if (!map) return
      await api(token, 'DELETE', `/calendars/${cal()}/events/${map.event_id}`) // 404/410 = já não existe, ok
      await db.from('calendar_events').delete().eq('item_id', itemId)
    }

    if (!item || item.kind !== 'task') { await removeEvent(); return 'skipped' }
    const { data: completion } = await db.from('item_completions').select('done, skipped').eq('item_id', itemId).order('day', { ascending: false }).limit(1).maybeSingle()
    if (item.archived || (completion?.skipped && !completion.done)) { await removeEvent(); return 'removed' }

    const { data: profile } = await db.from('profiles').select('tz').eq('user_id', user!.id).maybeSingle()
    const tz = profile?.tz ?? 'America/Sao_Paulo'
    const event = { ...eventFromTask(item, tz, !!completion?.done), status: 'confirmed' } // confirmed também "ressuscita" um evento cancelado

    // O id do evento é fixo por tarefa (32 hex = válido no Google). Duas sincronizações ao mesmo tempo
    // não criam dois eventos: a segunda recebe 409 e só atualiza.
    const fixedId = itemId.replaceAll('-', '')
    let eventId = map?.event_id ?? fixedId
    let res = await api(token, 'PATCH', `/calendars/${cal()}/events/${eventId}`, event)
    if (res.status === 404 || res.status === 410) {
      eventId = fixedId
      res = await api(token, 'POST', `/calendars/${cal()}/events`, { ...event, id: fixedId })
      if (res.status === 404) { // calendário apagado no Google: recria e tenta de novo
        calendarId = await createCalendar(token, tz)
        await db.from('google_calendar_links').update({ calendar_id: calendarId }).eq('user_id', user!.id)
        res = await api(token, 'POST', `/calendars/${cal()}/events`, { ...event, id: fixedId })
      }
      if (res.status === 409) { // o id já existe (criado agora por outra chamada, ou cancelado antes)
        res = await api(token, 'PATCH', `/calendars/${cal()}/events/${fixedId}`, event)
        if (!res.ok) { // não deu para reaproveitar: cria um evento novo com id gerado pelo Google
          res = await api(token, 'POST', `/calendars/${cal()}/events`, event)
          eventId = res.json?.id
        }
      }
    }
    if (!res.ok) return 'error'
    await db.from('calendar_events').upsert({ item_id: itemId, user_id: user!.id, event_id: eventId })
    return 'synced'
  }

  const results: Record<string, string> = {}
  for (const id of ids) results[id] = await syncOne(id)
  const failed = Object.values(results).filter((r) => r === 'error').length
  return json({ results, failed }, failed ? 502 : 200)
})
