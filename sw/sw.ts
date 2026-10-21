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
      silent: d.level === 'attention',
      vibrate: d.level === 'attention' ? undefined : [200, 100, 200, 100, 200],
      requireInteraction: d.level === 'urgent' || d.level === 'overdue',
    }),
  )
})

sw.addEventListener('notificationclick', (e: any) => {
  e.notification.close()
  e.waitUntil(
    sw.clients.matchAll({ type: 'window' }).then((wins: any[]) => (wins[0] ? wins[0].focus() : sw.clients.openWindow('/'))),
  )
})
