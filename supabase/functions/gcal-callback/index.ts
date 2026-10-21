// O Google redireciona o navegador para cá com ?code&state. Troca o código por tokens, cria o calendário e guarda o refresh token.
import { createClient } from 'npm:@supabase/supabase-js@2'
import { createCalendar, exchangeCode, revoke } from '../_shared/google.ts'
import { verifyState } from '../_shared/oauthState.ts'

const back = (result: string) => Response.redirect(`${Deno.env.get('APP_URL')}/?calendar=${result}`, 302)

Deno.serve(async (req) => {
  const url = new URL(req.url)
  if (url.searchParams.get('error')) return back('denied')
  const code = url.searchParams.get('code')
  const userId = await verifyState(url.searchParams.get('state') ?? '', Deno.env.get('GCAL_STATE_SECRET')!, Date.now())
  if (!code || !userId) return new Response('invalid request', { status: 400 })

  try {
    const db = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!)
    const tokens = await exchangeCode(code, `${Deno.env.get('SUPABASE_URL')}/functions/v1/gcal-callback`)
    if (!tokens.refresh_token) return back('error') // o Google só manda no 1º consentimento; prompt=consent deveria forçar

    const { data: profile } = await db.from('profiles').select('tz').eq('user_id', userId).maybeSingle()
    const { data: old } = await db.from('google_calendar_links').select('refresh_token').eq('user_id', userId).maybeSingle()
    if (old) await revoke(old.refresh_token) // reconexão: invalida o token anterior

    const calendarId = await createCalendar(tokens.access_token, profile?.tz ?? 'America/Sao_Paulo')
    await db.from('google_calendar_links').upsert({ user_id: userId, refresh_token: tokens.refresh_token, calendar_id: calendarId })
    await db.from('profiles').update({ calendar_connected: true }).eq('user_id', userId)
    return back('connected')
  } catch (e) {
    console.error('gcal-callback', (e as Error).message)
    return back('error')
  }
})
