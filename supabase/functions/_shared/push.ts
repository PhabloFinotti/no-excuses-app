import webpush from 'npm:web-push@3.6.7'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'
import type { PushPayload } from './pushPayload.ts'

export type { PushPayload }

export function configurePush() {
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
}

// Envia para todos os aparelhos do usuário; remove subscriptions expiradas (404/410).
// `attempted` = aparelhos tentados: com attempted > 0 e sent === 0, a entrega falhou e vale tentar de novo.
export async function sendToUser(db: SupabaseClient, userId: string, payload: PushPayload): Promise<{ sent: number; attempted: number }> {
  const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', userId)
  let sent = 0
  let attempted = 0
  for (const s of subs ?? []) {
    attempted++
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
        urgency: 'high', // evita que o Doze atrase a entrega
        TTL: 600, // alerta velho não vale a pena: descarta após 10 min
      })
      sent++
      await db.from('push_subscriptions').update({ last_ok_at: new Date().toISOString(), last_error: null, last_error_at: null }).eq('id', s.id)
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) {
        attempted-- // aparelho morto: não conta como falha de entrega
        await db.from('push_subscriptions').delete().eq('id', s.id)
      } else {
        console.error('push failed', code, (e as Error).message)
        await db.from('push_subscriptions').update({ last_error: `${code ?? 'erro'}: ${(e as Error).message}`.slice(0, 200), last_error_at: new Date().toISOString() }).eq('id', s.id)
      }
    }
  }
  return { sent, attempted }
}
