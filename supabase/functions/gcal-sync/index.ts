// Sincroniza UMA tarefa com o Google Agenda (criar/atualizar/apagar), ou desconecta. Chamada pelo app após cada mudança.
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

  const { itemId, disconnect } = (await req.json().catch(() => ({}))) as { itemId?: string; disconnect?: boolean }
  const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)

  const { data: link } = await db.from('google_calendar_links').select('*').eq('user_id', user.id).maybeSingle()
  if (!link) return json({ skipped: 'not connected' })

  const forget = async () => {
    await db.from('calendar_events').delete().eq('user_id', user.id)
    await db.from('google_calendar_links').delete().eq('user_id', user.id)
    await db.from('profiles').update({ calendar_connected: false }).eq('user_id', user.id)
  }
  if (disconnect) {
    await revoke(link.refresh_token)
    await forget()
    return json({ disconnected: true })
  }
  if (!itemId) return json({ error: 'itemId required' }, 400)

  let token: string
  try {
    token = await accessToken(link.refresh_token)
  } catch (e) {
    if (e instanceof InvalidGrant) { // acesso revogado no Google: volta ao estado desconectado
      await forget()
      return json({ error: 'reconnect' }, 409)
    }
    throw e
  }

  const [{ data: item }, { data: map }] = await Promise.all([
    db.from('items').select('*').eq('id', itemId).eq('user_id', user.id).maybeSingle(),
    db.from('calendar_events').select('event_id').eq('item_id', itemId).maybeSingle(),
  ])
  const cal = encodeURIComponent(link.calendar_id)
  const removeEvent = async () => {
    if (map) {
      await api(token, 'DELETE', `/calendars/${cal}/events/${map.event_id}`) // 404/410 = já não existe, ok
      await db.from('calendar_events').delete().eq('item_id', itemId)
    }
  }

  if (!item || item.kind !== 'task') { await removeEvent(); return json({ skipped: 'not a task' }) }
  const { data: completion } = await db.from('item_completions').select('done, skipped').eq('item_id', itemId).order('day', { ascending: false }).limit(1).maybeSingle()
  if (item.archived || (completion?.skipped && !completion.done)) { await removeEvent(); return json({ removed: true }) }

  const { data: profile } = await db.from('profiles').select('tz').eq('user_id', user.id).maybeSingle()
  const event = eventFromTask(item, profile?.tz ?? 'America/Sao_Paulo', !!completion?.done)

  let res = map ? await api(token, 'PATCH', `/calendars/${cal}/events/${map.event_id}`, event) : null
  if (!res || res.status === 404 || res.status === 410) {
    res = await api(token, 'POST', `/calendars/${cal}/events`, event)
    if (res.status === 404) { // calendário apagado no Google: recria e tenta de novo
      const calendarId = await createCalendar(token, profile?.tz ?? 'America/Sao_Paulo')
      await db.from('google_calendar_links').update({ calendar_id: calendarId }).eq('user_id', user.id)
      res = await api(token, 'POST', `/calendars/${encodeURIComponent(calendarId)}/events`, event)
    }
  }
  if (!res.ok) return json({ error: `google ${res.status}` }, 502)
  await db.from('calendar_events').upsert({ item_id: itemId, user_id: user.id, event_id: res.json.id })
  return json({ synced: true })
})
