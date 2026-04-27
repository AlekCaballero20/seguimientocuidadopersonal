'use strict';

/* =============================================================================
  sw.js · Cuidado Personal
  -----------------------------------------------------------------------------
  Service Worker para PWA estática:
  - Cachea archivos principales de la app.
  - Funciona offline cuando ya se abrió al menos una vez.
  - No se rompe si faltan assets opcionales como íconos.
  - Responde al mensaje SKIP_WAITING desde main.js.
============================================================================= */

const APP_NAME = 'Cuidado Personal';
const CACHE_VERSION = 'v1.0.0';
const STATIC_CACHE = `cuidado-personal-static-${CACHE_VERSION}`;
const RUNTIME_CACHE = `cuidado-personal-runtime-${CACHE_VERSION}`;

const CORE_ASSETS = [
  './',
  './index.html',
  './main.js',
  './src/app.js',
  './src/db.js',
  './src/ui.js',
  './styles/theme.css',
  './styles/app.css',
  './manifest.webmanifest'
];

const OPTIONAL_ASSETS = [
  './icons/icon-192.png',
  './icons/icon-512.png'
];

const ALL_CACHES = [
  STATIC_CACHE,
  RUNTIME_CACHE
];

self.addEventListener('install', (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(STATIC_CACHE);

      await cacheCoreAssets(cache);
      await cacheOptionalAssets(cache);

      await self.skipWaiting();
    })()
  );
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      await deleteOldCaches();
      await self.clients.claim();
    })()
  );
});

self.addEventListener('message', (event) => {
  const type = event.data?.type;

  if (type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

self.addEventListener('fetch', (event) => {
  const request = event.request;

  if (request.method !== 'GET') return;

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) return;

  if (request.mode === 'navigate') {
    event.respondWith(handleNavigationRequest(request));
    return;
  }

  if (isStaticAsset(request)) {
    event.respondWith(cacheFirst(request));
    return;
  }

  event.respondWith(staleWhileRevalidate(request));
});

// =============================================================================
// Estrategias
// =============================================================================

async function handleNavigationRequest(request) {
  try {
    const networkResponse = await fetch(request);
    const cache = await caches.open(RUNTIME_CACHE);
    await cache.put(request, networkResponse.clone());
    return networkResponse;
  } catch {
    const cachedRequest = await caches.match(request);
    if (cachedRequest) return cachedRequest;

    const cachedIndex = await caches.match('./index.html');
    if (cachedIndex) return cachedIndex;

    return offlineFallback();
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;

  try {
    const response = await fetch(request);
    await putRuntimeCache(request, response.clone());
    return response;
  } catch {
    return offlineFallback();
  }
}

async function staleWhileRevalidate(request) {
  const cached = await caches.match(request);

  const networkPromise = fetch(request)
    .then(async (response) => {
      await putRuntimeCache(request, response.clone());
      return response;
    })
    .catch(() => null);

  return cached || await networkPromise || offlineFallback();
}

// =============================================================================
// Cache helpers
// =============================================================================

async function cacheCoreAssets(cache) {
  const results = await Promise.allSettled(
    CORE_ASSETS.map(async (asset) => {
      const request = new Request(asset, {
        cache: 'reload'
      });

      const response = await fetch(request);

      if (!response.ok) {
        throw new Error(`No se pudo cachear ${asset}`);
      }

      await cache.put(request, response);
    })
  );

  const failed = results.filter((result) => result.status === 'rejected');

  if (failed.length) {
    console.warn(`${APP_NAME}: algunos archivos principales no se pudieron cachear.`, failed);
  }
}

async function cacheOptionalAssets(cache) {
  const results = await Promise.allSettled(
    OPTIONAL_ASSETS.map(async (asset) => {
      const request = new Request(asset, {
        cache: 'reload'
      });

      const response = await fetch(request);

      if (!response.ok) {
        throw new Error(`Asset opcional no disponible: ${asset}`);
      }

      await cache.put(request, response);
    })
  );

  const failed = results.filter((result) => result.status === 'rejected');

  if (failed.length) {
    console.info(`${APP_NAME}: algunos assets opcionales no existen todavía. Cero tragedia.`, failed);
  }
}

async function putRuntimeCache(request, response) {
  if (!response || !response.ok) return;

  const cache = await caches.open(RUNTIME_CACHE);
  await cache.put(request, response);
}

async function deleteOldCaches() {
  const keys = await caches.keys();

  await Promise.all(
    keys.map((key) => {
      if (ALL_CACHES.includes(key)) return null;
      if (!key.startsWith('cuidado-personal-')) return null;
      return caches.delete(key);
    })
  );
}

// =============================================================================
// Utilidades
// =============================================================================

function isStaticAsset(request) {
  const url = new URL(request.url);
  const pathname = url.pathname;

  return (
    pathname.endsWith('.html') ||
    pathname.endsWith('.js') ||
    pathname.endsWith('.css') ||
    pathname.endsWith('.json') ||
    pathname.endsWith('.webmanifest') ||
    pathname.endsWith('.png') ||
    pathname.endsWith('.jpg') ||
    pathname.endsWith('.jpeg') ||
    pathname.endsWith('.svg') ||
    pathname.endsWith('.webp') ||
    pathname.endsWith('.ico')
  );
}

function offlineFallback() {
  return new Response(
    `
      <!doctype html>
      <html lang="es-CO">
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <title>Cuidado Personal · Offline</title>
          <style>
            body {
              margin: 0;
              min-height: 100vh;
              display: grid;
              place-items: center;
              font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
              background:
                radial-gradient(circle at top left, rgba(217,70,239,.16), transparent 34%),
                radial-gradient(circle at top right, rgba(124,58,237,.14), transparent 34%),
                #fff8fd;
              color: #24143d;
            }

            main {
              width: min(92vw, 460px);
              padding: 24px;
              border: 1px solid rgba(124,58,237,.18);
              border-radius: 24px;
              background: rgba(255,255,255,.88);
              box-shadow: 0 18px 48px rgba(74,42,120,.13);
              text-align: center;
            }

            h1 {
              margin: 0 0 8px;
              font-size: 24px;
            }

            p {
              margin: 0;
              line-height: 1.5;
              color: rgba(36,20,61,.68);
            }
          </style>
        </head>

        <body>
          <main>
            <h1>Sin conexión 🌸</h1>
            <p>
              Abre la app una vez con internet para dejarla guardada offline.
              Sí, hasta el autocuidado necesita cargar primero. Qué mundo.
            </p>
          </main>
        </body>
      </html>
    `,
    {
      headers: {
        'Content-Type': 'text/html; charset=utf-8'
      }
    }
  );
}