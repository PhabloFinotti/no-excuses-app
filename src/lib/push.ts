import { must, supabase } from './supabase'

const b64ToBytes = (s: string) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/').padEnd(Math.ceil(s.length / 4) * 4, '=')), (c) => c.charCodeAt(0))

export async function enablePush() {
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) throw new Error('Este navegador não suporta push')
  if ((await Notification.requestPermission()) !== 'granted') throw new Error('Permissão de notificação negada')
  const reg = await navigator.serviceWorker.ready
  const sub =
    (await reg.pushManager.getSubscription()) ??
    (await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: b64ToBytes(import.meta.env.VITE_VAPID_PUBLIC_KEY) }))
  const { endpoint, keys } = sub.toJSON()
  must(await supabase.from('push_subscriptions').upsert({ endpoint, p256dh: keys!.p256dh, auth: keys!.auth }, { onConflict: 'endpoint' }))
}

export async function sendTestPush() {
  must(await supabase.functions.invoke('push-test'))
}
