import webpush from 'npm:web-push@3.6.7'
import type { SupabaseClient } from 'npm:@supabase/supabase-js@2'

export interface PushPayload {
  title: string
  body: string
  tag?: string
  level?: 'attention' | 'urgent' | 'overdue' | 'test'
}

export function configurePush() {
  webpush.setVapidDetails(Deno.env.get('VAPID_SUBJECT')!, Deno.env.get('VAPID_PUBLIC_KEY')!, Deno.env.get('VAPID_PRIVATE_KEY')!)
}

// Envia para todos os aparelhos do usuário; remove subscriptions expiradas (404/410).
export async function sendToUser(db: SupabaseClient, userId: string, payload: PushPayload): Promise<number> {
  const { data: subs } = await db.from('push_subscriptions').select('*').eq('user_id', userId)
  let sent = 0
  for (const s of subs ?? []) {
    try {
      await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, JSON.stringify(payload), {
        urgency: 'high', // evita que o Doze atrase a entrega
        TTL: 600, // alerta velho não vale a pena: descarta após 10 min
      })
      sent++
    } catch (e) {
      const code = (e as { statusCode?: number }).statusCode
      if (code === 404 || code === 410) await db.from('push_subscriptions').delete().eq('id', s.id)
      else console.error('push failed', code, (e as Error).message)
    }
  }
  return sent
}
