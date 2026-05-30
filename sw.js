/* eslint-disable no-restricted-globals */
const CACHE_VERSION = 'dbc-p11-social-fast-tap-v1';
const CACHE_NAME = `digital-business-card-${CACHE_VERSION}`;
const OFFLINE_URL = '/offline.html';

const PRECACHE_URLS = [
  OFFLINE_URL,
  '/manifest.webmanifest',
  '/assets/icons/favicon/png/android-chrome-192x192.png',
  '/assets/icons/favicon/png/android-chrome-512x512.png'
];

function isNetworkOnly(url) {
  const path = url.pathname;
  return path.endsWith('/sw.js') || path.endsWith('/manifest.webmanifest');
}

function isNetworkFirst(url) {
  const path = url.pathname;
  return (
    path === '/' ||
    path === '/index.html' ||
    path.startsWith('/js/') ||
    path.startsWith('/scripts/') ||
    path.startsWith('/styles/') ||
    path.startsWith('/data/')
  );
}

function isNavigation(request) {
  return request.mode === 'navigate';
}

async function networkFirst(request) {
  try {
    const response = await fetch(request);
    if (response && response.status === 200) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await caches.match(request);
    if (cached) return cached;
    throw error;
  }
}

async function networkOnly(request) {
  return fetch(request);
}

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches
      .open(CACHE_NAME)
      .then((cache) => Promise.allSettled(PRECACHE_URLS.map((url) => cache.add(url))))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key)))
      )
      .then(() => self.clients.claim())
  );
});

self.addEventListener('message', (event) => {
  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  if (event.request.method !== 'GET') return;

  const url = new URL(event.request.url);

  if (url.origin !== self.location.origin) return;

  if (isNetworkOnly(url)) {
    event.respondWith(networkOnly(event.request));
    return;
  }

  if (isNavigation(event.request) || isNetworkFirst(url)) {
    event.respondWith(
      networkFirst(event.request).catch(async () => {
        const offline = await caches.match(OFFLINE_URL);
        if (offline) return offline;
        const shell = await caches.match('/index.html');
        if (shell) return shell;
        return new Response('Offline', { status: 503, statusText: 'Offline' });
      })
    );
    return;
  }

  event.respondWith(
    caches.match(event.request).then((cached) => {
      if (cached) return cached;
      return fetch(event.request).then((response) => {
        if (response && response.status === 200 && response.type === 'basic') {
          const copy = response.clone();
          caches.open(CACHE_NAME).then((cache) => cache.put(event.request, copy));
        }
        return response;
      });
    })
  );
});
