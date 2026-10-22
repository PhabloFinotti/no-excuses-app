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

// Tira da bandeja o alerta de um item (o push usa o id do item como tag).
export async function clearNotification(tag: string) {
  try {
    const reg = await navigator.serviceWorker?.getRegistration()
    ;(await reg?.getNotifications({ tag }))?.forEach((n) => n.close())
  } catch {
    // sem service worker (ex.: modo demo): não há o que fechar
  }
}

export interface PushDiagnostics {
  permission: NotificationPermission | 'unsupported'
  localSubscription: boolean
  devices: number
  lastOkAt?: string
  lastError?: string
  lastErrorAt?: string
}

// Estado de ponta a ponta do push neste aparelho; "aceito pelo provedor" não prova que a notificação apareceu.
export async function pushDiagnostics(): Promise<PushDiagnostics> {
  const supported = 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window
  const reg = supported ? await navigator.serviceWorker.getRegistration() : undefined
  const local = !!(await reg?.pushManager.getSubscription())
  const rows = (must(await supabase.from('push_subscriptions').select('last_ok_at, last_error, last_error_at')) ?? []) as { last_ok_at: string | null; last_error: string | null; last_error_at: string | null }[]
  const latest = (pick: (r: (typeof rows)[number]) => string | null) => rows.map(pick).filter((v): v is string => !!v).sort().at(-1)
  return {
    permission: supported ? Notification.permission : 'unsupported',
    localSubscription: local,
    devices: rows.length,
    lastOkAt: latest((r) => r.last_ok_at),
    lastErrorAt: latest((r) => r.last_error_at),
    lastError: rows.find((r) => r.last_error_at && r.last_error_at === latest((x) => x.last_error_at))?.last_error ?? undefined,
  }
}
