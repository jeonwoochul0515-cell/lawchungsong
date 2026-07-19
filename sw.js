const CACHE_NAME = 'cheongsong-v7';
const ASSETS = [
    '/',
    '/index.html',
    '/css/tailwind.min.css',
    '/style.css',
    '/main.js',
    '/images/logo.jpg',
    '/images/icon-192x192.png',
    '/images/icon-512x512.png',
    '/images/lawyer-profile.jpg',
    '/images/lawyer-profile.webp',
    '/images/hero-bg.jpg',
    '/images/hero-bg.webp'
];

// Install - cache core assets
self.addEventListener('install', event => {
    event.waitUntil(
        caches.open(CACHE_NAME)
            .then(cache => cache.addAll(ASSETS))
            .then(() => self.skipWaiting())
    );
});

// Activate - clean old caches
self.addEventListener('activate', event => {
    event.waitUntil(
        caches.keys().then(keys =>
            Promise.all(keys.filter(k => k !== CACHE_NAME).map(k => caches.delete(k)))
        ).then(() => self.clients.claim())
    );
});

// Fetch - network first, fallback to cache
self.addEventListener('fetch', event => {
    event.respondWith(
        fetch(event.request)
            .then(response => {
                const clone = response.clone();
                caches.open(CACHE_NAME).then(cache => cache.put(event.request, clone));
                return response;
            })
            .catch(() => caches.match(event.request))
    );
});
