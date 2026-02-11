/**
 * Service Worker
 * PWA support with caching strategies
 */

const CACHE_VERSION = 'v1.0.0';
const CACHE_PREFIX = 'salary-tracker-';

// Cache names
const CACHES = {
  static: `${CACHE_PREFIX}static-${CACHE_VERSION}`,
  dynamic: `${CACHE_PREFIX}dynamic-${CACHE_VERSION}`,
  images: `${CACHE_PREFIX}images-${CACHE_VERSION}`,
  api: `${CACHE_PREFIX}api-${CACHE_VERSION}`
};

// Cache limits
const CACHE_LIMITS = {
  dynamic: 50,
  images: 30,
  api: 20
};

// Static assets to cache on install
const STATIC_ASSETS = [
  '/',
  '/index.html',
  '/css/style.css',
  '/js/config.js',
  '/js/utils.js',
  '/js/state-manager.js',
  '/js/salary-calculator.js',
  '/js/validators.js',
  '/js/excel-parser.js',
  '/js/ai-service.js',
  '/js/components/tab-manager.js',
  '/manifest.json'
];

// ============================================================================
// INSTALL EVENT
// ============================================================================

self.addEventListener('install', (event) => {
  console.log('[ServiceWorker] Installing...');
  
  event.waitUntil(
    caches.open(CACHES.static)
      .then((cache) => {
        console.log('[ServiceWorker] Caching static assets');
        return cache.addAll(STATIC_ASSETS);
      })
      .then(() => {
        console.log('[ServiceWorker] Installed successfully');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[ServiceWorker] Installation failed:', error);
      })
  );
});

// ============================================================================
// ACTIVATE EVENT
// ============================================================================

self.addEventListener('activate', (event) => {
  console.log('[ServiceWorker] Activating...');
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((cacheName) => {
              // Delete old caches
              return cacheName.startsWith(CACHE_PREFIX) &&
                     !Object.values(CACHES).includes(cacheName);
            })
            .map((cacheName) => {
              console.log('[ServiceWorker] Deleting old cache:', cacheName);
              return caches.delete(cacheName);
            })
        );
      })
      .then(() => {
        console.log('[ServiceWorker] Activated successfully');
        return self.clients.claim();
      })
  );
});

// ============================================================================
// FETCH EVENT
// ============================================================================

self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Choose strategy based on request type
  if (url.pathname.match(/\.(png|jpg|jpeg|gif|svg|webp|ico)$/)) {
    // Images: Cache First
    event.respondWith(cacheFirst(request, CACHES.images));
  } else if (url.pathname.match(/\.(css|js)$/)) {
    // CSS/JS: Stale While Revalidate
    event.respondWith(staleWhileRevalidate(request, CACHES.static));
  } else if (url.pathname.startsWith('/api/')) {
    // API: Network First
    event.respondWith(networkFirst(request, CACHES.api));
  } else if (url.pathname.endsWith('.html') || url.pathname === '/') {
    // HTML: Network First
    event.respondWith(networkFirst(request, CACHES.dynamic));
  } else {
    // Default: Network First
    event.respondWith(networkFirst(request, CACHES.dynamic));
  }
});

// ============================================================================
// CACHING STRATEGIES
// ============================================================================

/**
 * Cache First strategy
 * Try cache first, fallback to network
 */
async function cacheFirst(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    const response = await fetch(request);
    
    if (response.ok) {
      cache.put(request, response.clone());
      await limitCacheSize(cacheName, CACHE_LIMITS.images);
    }
    
    return response;
  } catch (error) {
    console.error('[ServiceWorker] Cache First failed:', error);
    return new Response('Offline', { status: 503 });
  }
}

/**
 * Network First strategy
 * Try network first, fallback to cache
 */
async function networkFirst(request, cacheName) {
  try {
    const response = await fetch(request);
    
    if (response.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, response.clone());
      await limitCacheSize(cacheName, CACHE_LIMITS.dynamic);
    }
    
    return response;
  } catch (error) {
    const cache = await caches.open(cacheName);
    const cached = await cache.match(request);
    
    if (cached) {
      return cached;
    }
    
    // Return offline page for HTML requests
    if (request.headers.get('Accept')?.includes('text/html')) {
      const offlinePage = await cache.match('/offline.html');
      if (offlinePage) {
        return offlinePage;
      }
    }
    
    return new Response('Offline', {
      status: 503,
      statusText: 'Service Unavailable'
    });
  }
}

/**
 * Stale While Revalidate strategy
 * Return cached version immediately, update in background
 */
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);
  
  const fetchPromise = fetch(request)
    .then((response) => {
      if (response.ok) {
        cache.put(request, response.clone());
      }
      return response;
    })
    .catch(() => cached);
  
  return cached || fetchPromise;
}

/**
 * Cache Only strategy
 * Only return from cache
 */
async function cacheOnly(request, cacheName) {
  const cache = await caches.open(cacheName);
  return cache.match(request);
}

/**
 * Network Only strategy
 * Always fetch from network
 */
async function networkOnly(request) {
  return fetch(request);
}

// ============================================================================
// CACHE MANAGEMENT
// ============================================================================

/**
 * Limit cache size
 * Remove oldest entries when limit is exceeded
 */
async function limitCacheSize(cacheName, maxItems) {
  const cache = await caches.open(cacheName);
  const keys = await cache.keys();
  
  if (keys.length > maxItems) {
    const itemsToDelete = keys.length - maxItems;
    for (let i = 0; i < itemsToDelete; i++) {
      await cache.delete(keys[i]);
    }
  }
}

/**
 * Clear all caches
 */
async function clearAllCaches() {
  const cacheNames = await caches.keys();
  return Promise.all(
    cacheNames.map((cacheName) => caches.delete(cacheName))
  );
}

// ============================================================================
// BACKGROUND SYNC
// ============================================================================

self.addEventListener('sync', (event) => {
  console.log('[ServiceWorker] Background sync:', event.tag);
  
  if (event.tag === 'sync-salary-data') {
    event.waitUntil(syncSalaryData());
  }
});

/**
 * Sync salary data when online
 */
async function syncSalaryData() {
  try {
    // Get pending sync data from IndexedDB or localStorage
    // This is a placeholder - implement actual sync logic
    console.log('[ServiceWorker] Syncing salary data...');
    return Promise.resolve();
  } catch (error) {
    console.error('[ServiceWorker] Sync failed:', error);
    throw error;
  }
}

// ============================================================================
// PUSH NOTIFICATIONS
// ============================================================================

self.addEventListener('push', (event) => {
  console.log('[ServiceWorker] Push notification received');
  
  const options = {
    body: event.data?.text() || 'עדכון חדש זמין',
    icon: '/icons/icon-192.png',
    badge: '/icons/icon-72.png',
    vibrate: [200, 100, 200],
    tag: 'salary-tracker-notification',
    actions: [
      { action: 'view', title: 'צפה' },
      { action: 'dismiss', title: 'סגור' }
    ]
  };
  
  event.waitUntil(
    self.registration.showNotification('מעקב שכר', options)
  );
});

self.addEventListener('notificationclick', (event) => {
  console.log('[ServiceWorker] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    event.waitUntil(
      clients.openWindow('/')
    );
  }
});

// ============================================================================
// MESSAGE HANDLING
// ============================================================================

self.addEventListener('message', (event) => {
  console.log('[ServiceWorker] Message received:', event.data);
  
  if (event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  } else if (event.data.type === 'CLEAR_CACHE') {
    event.waitUntil(clearAllCaches());
  } else if (event.data.type === 'CACHE_URLS') {
    event.waitUntil(
      caches.open(CACHES.dynamic)
        .then((cache) => cache.addAll(event.data.urls))
    );
  }
});

// ============================================================================
// ERROR HANDLING
// ============================================================================

self.addEventListener('error', (event) => {
  console.error('[ServiceWorker] Error:', event.error);
});

self.addEventListener('unhandledrejection', (event) => {
  console.error('[ServiceWorker] Unhandled rejection:', event.reason);
});

console.log('[ServiceWorker] Script loaded');
