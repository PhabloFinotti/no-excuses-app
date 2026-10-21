// `state` do OAuth: "<payload>.<hmac>", com o usuário e uma validade. Impede que alguém use o callback com um state forjado.
const enc = new TextEncoder()
const b64 = (bytes: ArrayBuffer | string) => {
  const arr = typeof bytes === 'string' ? enc.encode(bytes) : new Uint8Array(bytes)
  return btoa(String.fromCharCode(...arr)).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
const unb64 = (s: string) => new TextDecoder().decode(Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)))

async function mac(secret: string, data: string) {
  const key = await crypto.subtle.importKey('raw', enc.encode(secret), { name: 'HMAC', hash: 'SHA-256' }, false, ['sign'])
  return b64(await crypto.subtle.sign('HMAC', key, enc.encode(data)))
}

export async function signState(userId: string, secret: string, nowMs: number, ttlMs = 10 * 60_000): Promise<string> {
  const payload = `${userId}.${nowMs + ttlMs}`
  return `${b64(payload)}.${await mac(secret, payload)}`
}

// Devolve o userId se a assinatura confere e não expirou; senão null.
export async function verifyState(state: string, secret: string, nowMs: number): Promise<string | null> {
  const [p, sig] = state.split('.')
  if (!p || !sig) return null
  let payload: string
  try { payload = unb64(p) } catch { return null }
  if ((await mac(secret, payload)) !== sig) return null
  const [userId, exp] = payload.split('.')
  return userId && Number(exp) > nowMs ? userId : null
}
