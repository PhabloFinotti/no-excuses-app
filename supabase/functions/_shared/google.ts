// Chamadas ao Google (OAuth + Calendar). Só roda no servidor, com o client secret.
const TOKEN_URL = 'https://oauth2.googleapis.com/token'
export const SCOPE = 'https://www.googleapis.com/auth/calendar.app.created'

export class InvalidGrant extends Error {}

const env = (k: string) => Deno.env.get(k)!

export function authUrl(state: string, redirectUri: string) {
  const q = new URLSearchParams({
    client_id: env('GOOGLE_CLIENT_ID'), redirect_uri: redirectUri, response_type: 'code', scope: SCOPE, state,
    access_type: 'offline', prompt: 'consent', // sem isso o Google não devolve refresh_token
  })
  return `https://accounts.google.com/o/oauth2/v2/auth?${q}`
}

async function tokenRequest(params: Record<string, string>) {
  const res = await fetch(TOKEN_URL, {
    method: 'POST', headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({ client_id: env('GOOGLE_CLIENT_ID'), client_secret: env('GOOGLE_CLIENT_SECRET'), ...params }),
  })
  const json = await res.json()
  if (!res.ok) {
    if (json.error === 'invalid_grant') throw new InvalidGrant(json.error_description ?? 'invalid_grant')
    throw new Error(`google token: ${json.error ?? res.status}`)
  }
  return json as { access_token: string; refresh_token?: string }
}

export const exchangeCode = (code: string, redirectUri: string) => tokenRequest({ code, redirect_uri: redirectUri, grant_type: 'authorization_code' })
export const accessToken = async (refreshToken: string) => (await tokenRequest({ refresh_token: refreshToken, grant_type: 'refresh_token' })).access_token

export const revoke = (token: string) => fetch(`https://oauth2.googleapis.com/revoke?token=${encodeURIComponent(token)}`, { method: 'POST' }).catch(() => {})

const API = 'https://www.googleapis.com/calendar/v3'
export async function api(token: string, method: string, path: string, body?: unknown) {
  const res = await fetch(`${API}${path}`, {
    method, headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' }, body: body ? JSON.stringify(body) : undefined,
  })
  return { status: res.status, ok: res.ok, json: res.status === 204 ? null : await res.json().catch(() => null) }
}

export async function createCalendar(token: string, tz: string): Promise<string> {
  const r = await api(token, 'POST', '/calendars', { summary: 'No Excuses', description: 'Tarefas do app No Excuses', timeZone: tz })
  if (!r.ok) throw new Error(`google calendar create: ${r.status}`)
  return r.json.id as string
}
