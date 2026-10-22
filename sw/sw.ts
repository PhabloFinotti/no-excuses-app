// Service worker: cache do app + recebimento de push. Compilado só pelo vite-plugin-pwa (fora do tsconfig do app).
import { precacheAndRoute } from 'workbox-precaching'

const sw = self as any
precacheAndRoute((self as any).__WB_MANIFEST) // o plugin procura o literal self.__WB_MANIFEST

sw.addEventListener('install', () => sw.skipWaiting())
sw.addEventListener('activate', (e: any) => e.waitUntil(sw.clients.claim()))

sw.addEventListener('push', (e: any) => {
  const d = e.data?.json() ?? {}
  e.waitUntil(
    sw.registration.showNotification(d.title ?? 'No Excuses', {
      body: d.body,
      tag: d.tag, // mesmo tag substitui a notificação anterior do mesmo item
      icon: '/icon-192.png',
      silent: d.level === 'attention' || d.level === 'summary',
      vibrate: d.level === 'attention' || d.level === 'summary' ? undefined : [200, 100, 200, 100, 200],
      data: { itemId: d.itemId },
      actions: d.itemId ? [{ action: 'done', title: 'Feito' }, { action: 'snooze', title: 'Adiar 10 min' }] : [],
      requireInteraction: d.level === 'urgent' || d.level === 'overdue',
    }),
  )
})

sw.addEventListener('notificationclick', (e: any) => {
  e.notification.close()
  // As ações abrem o app com ?action=...&item=...; a tela aplica com a sessão do usuário (sem token no SW).
  const id = e.notification.data?.itemId
  const url = e.action && id ? `/?action=${e.action}&item=${id}` : '/'
  e.waitUntil(
    sw.clients.matchAll({ type: 'window' }).then(async (wins: any[]) => {
      if (!wins[0]) return sw.clients.openWindow(url)
      if (e.action && id) await wins[0].navigate(url) // clique simples só traz o app à frente, sem recarregar
      return wins[0].focus()
    }),
  )
})
