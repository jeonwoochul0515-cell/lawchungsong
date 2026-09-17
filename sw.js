const CACHE_NAME = 'cheongsong-v8';
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

// 캐시에 넣지 않을 것 — 스크롤 시퀀스 프레임.
// 한 장면이 데스크톱 31장·모바일 21장이라 여기 들어오면 캐시가 수십 MB로 불어난다.
// 브라우저 HTTP 캐시로 충분하고, 오프라인에서까지 재생될 필요는 없다.
const NO_CACHE = /\/images\/pear\/seq\//;

// Fetch - network first, fallback to cache
self.addEventListener('fetch', event => {
    if (NO_CACHE.test(new URL(event.request.url).pathname)) return;
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
