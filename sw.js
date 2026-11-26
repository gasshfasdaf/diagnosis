/* ============================================================
   Service Worker — кэш app-shell + push
   ============================================================ */

const CACHE_NAME = 'diag-pwa-v1';
const ASSETS = [
    './',
    './index.html',
    './manifest.json',
    './assets/styles.css',
    './assets/app.js',
    './icons/icon-192.png',
    './icons/icon-512.png'
];

// ---------- УСТАНОВКА ----------
self.addEventListener('install', (event) => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then((cache) => cache.addAll(ASSETS))
            .catch((err) => console.warn('SW: cache addAll failed', err))
    );
    self.skipWaiting();
});

// ---------- АКТИВАЦИЯ ----------
self.addEventListener('activate', (event) => {
    event.waitUntil(
        caches.keys().then((keys) =>
            Promise.all(
                keys.filter((key) => key !== CACHE_NAME)
                    .map((key) => caches.delete(key))
            )
        )
    );
    self.clients.claim();
});

// ---------- FETCH ----------
self.addEventListener('fetch', (event) => {
    const req = event.request;

    // Не кэшируем не-GET
    if (req.method !== 'GET') return;

    // Для навигационных запросов — сначала сеть, потом кэш
    if (req.mode === 'navigate') {
        event.respondWith(
            fetch(req)
                .then((res) => {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                    return res;
                })
                .catch(() => caches.match('./index.html'))
        );
        return;
    }

    // Для остальных — cache-first
    event.respondWith(
        caches.match(req).then((cached) => {
            if (cached) return cached;
            return fetch(req).then((res) => {
                if (res && res.status === 200 && res.type === 'basic') {
                    const copy = res.clone();
                    caches.open(CACHE_NAME).then((cache) => cache.put(req, copy));
                }
                return res;
            }).catch(() => cached);
        })
    );
});

// ---------- PUSH ----------
self.addEventListener('push', (event) => {
    let data = { title: 'Диагностика', body: 'Новое событие' };
    try {
        if (event.data) data = event.data.json();
    } catch (e) {
        if (event.data) data.body = event.data.text();
    }

    const options = {
        body: data.body || 'Новое событие',
        icon: './icons/icon-192.png',
        badge: './icons/icon-192.png',
        vibrate: [200, 100, 200],
        tag: data.tag || 'diag-notification',
        renotify: true,
        data: { url: data.url || './' }
    };

    event.waitUntil(self.registration.showNotification(data.title, options));
});

// ---------- CLICK НА УВЕДОМЛЕНИЕ ----------
self.addEventListener('notificationclick', (event) => {
    event.notification.close();
    const targetUrl = (event.notification.data && event.notification.data.url) || './';

    event.waitUntil(
        clients.matchAll({ type: 'window', includeUncontrolled: true }).then((clientList) => {
            for (const client of clientList) {
                if (client.url.includes(self.registration.scope) && 'focus' in client) {
                    return client.focus();
                }
            }
            if (clients.openWindow) {
                return clients.openWindow(targetUrl);
            }
        })
    );
});