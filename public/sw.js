// Service Worker for DueSync PWA
// Handles push notifications, offline caching, and app shell

const CACHE_VERSION = 'v1.1.0';
const CACHE_NAME = `duesync-${CACHE_VERSION}`;
const RUNTIME_CACHE = `duesync-runtime-${CACHE_VERSION}`;
const IMAGE_CACHE = `duesync-images-${CACHE_VERSION}`;
const TASK_URL_BASE = '/';

// Static assets to cache on install
// Note: Only cache truly static files here. Pages will be cached on first visit.
const STATIC_ASSETS = [
  '/manifest.json',
  '/icons/icon-192x192.png',
  '/icons/icon-512x512.png',
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[Service Worker] Installing version:', CACHE_VERSION);

  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('[Service Worker] Caching static assets');
        // Use addAll for static assets, but don't fail if one asset fails
        return cache.addAll(STATIC_ASSETS).catch((error) => {
          console.warn('[Service Worker] Some assets failed to cache:', error);
          // Continue with installation even if some assets fail
          return Promise.resolve();
        });
      })
      .then(() => {
        console.log('[Service Worker] Installation complete');
        return self.skipWaiting();
      })
      .catch((error) => {
        console.error('[Service Worker] Installation failed:', error);
      })
  );
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[Service Worker] Activating version:', CACHE_VERSION);

  const currentCaches = [CACHE_NAME, RUNTIME_CACHE, IMAGE_CACHE];

  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames
            .filter((name) => !currentCaches.includes(name))
            .map((name) => {
              console.log('[Service Worker] Deleting old cache:', name);
              return caches.delete(name);
            })
        );
      })
      .then(() => {
        console.log('[Service Worker] Claiming clients');
        return self.clients.claim();
      })
  );
});

// Fetch event - serve from cache with network fallback
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return;
  }

  // Skip chrome-extension and other non-http(s) requests
  if (!request.url.startsWith('http')) {
    return;
  }

  // Skip Vercel Analytics and third-party scripts
  if (url.pathname.startsWith('/_vercel/') ||
      url.hostname !== self.location.hostname) {
    return; // Let browser handle these normally
  }

  // API requests - Network First (with cache fallback)
  if (url.pathname.startsWith('/api/')) {
    event.respondWith(networkFirst(request, RUNTIME_CACHE));
    return;
  }

  // Images - Cache First (with network fallback)
  if (request.destination === 'image' || url.pathname.match(/\.(png|jpg|jpeg|svg|gif|webp|ico)$/)) {
    event.respondWith(cacheFirst(request, IMAGE_CACHE));
    return;
  }

  // Static assets - Cache First
  if (url.pathname.match(/\.(js|css|woff|woff2|ttf|eot)$/) || url.pathname.startsWith('/icons/')) {
    event.respondWith(cacheFirst(request, CACHE_NAME));
    return;
  }

  // HTML pages - Network First (with offline fallback)
  if (request.headers.get('accept')?.includes('text/html')) {
    event.respondWith(
      networkFirst(request, RUNTIME_CACHE)
        .catch(() => caches.match('/offline'))
    );
    return;
  }

  // Everything else - Stale While Revalidate
  event.respondWith(staleWhileRevalidate(request, RUNTIME_CACHE));
});

// Caching Strategies

// Cache First - good for static assets
async function cacheFirst(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    console.error('[Service Worker] Fetch failed:', error);
    throw error;
  }
}

// Network First - good for API calls
async function networkFirst(request, cacheName) {
  const cache = await caches.open(cacheName);

  try {
    const response = await fetch(request);
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  } catch (error) {
    const cached = await cache.match(request);
    if (cached) {
      console.log('[Service Worker] Serving from cache:', request.url);
      return cached;
    }
    throw error;
  }
}

// Stale While Revalidate - good for frequently changing content
async function staleWhileRevalidate(request, cacheName) {
  const cache = await caches.open(cacheName);
  const cached = await cache.match(request);

  const fetchPromise = fetch(request).then((response) => {
    if (response.ok) {
      cache.put(request, response.clone());
    }
    return response;
  });

  return cached || fetchPromise;
}

// Push event - display notification
self.addEventListener('push', (event) => {
  console.log('[Service Worker] Push received:', event);

  if (!event.data) {
    console.log('[Service Worker] Push event has no data');
    return;
  }

  let data;
  try {
    data = event.data.json();
  } catch (error) {
    console.error('[Service Worker] Error parsing push data:', error);
    data = {
      title: 'DueSync Reminder',
      body: event.data.text(),
    };
  }

  const title = data.title || 'DueSync Reminder';
  const options = {
    body: data.body || 'You have a task reminder',
    icon: '/icon-192.png',
    badge: '/badge-72.png',
    tag: data.taskId || 'duesync-notification',
    requireInteraction: data.requireInteraction || false,
    data: {
      taskId: data.taskId,
      url: data.url || TASK_URL_BASE,
      priority: data.priority,
    },
    actions: [
      {
        action: 'view',
        title: 'View Task',
        icon: '/icons/view.png',
      },
      {
        action: 'complete',
        title: 'Mark Complete',
        icon: '/icons/check.png',
      },
    ],
    vibrate: [200, 100, 200],
    sound: '/sounds/notification.mp3',
  };

  event.waitUntil(self.registration.showNotification(title, options));
});

// Notification click event
self.addEventListener('notificationclick', (event) => {
  console.log('[Service Worker] Notification clicked:', event);

  event.notification.close();

  const action = event.action;
  const taskId = event.notification.data?.taskId;
  const url = event.notification.data?.url || TASK_URL_BASE;

  if (action === 'complete' && taskId) {
    // Mark task as complete
    event.waitUntil(
      fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          status: 'COMPLETED',
          completedAt: new Date().toISOString(),
        }),
      })
        .then((response) => {
          if (response.ok) {
            console.log('[Service Worker] Task marked as complete');
            return self.registration.showNotification('Task Completed!', {
              body: 'Great job! Task marked as complete.',
              icon: '/icon-192.png',
              tag: 'task-completed',
            });
          }
        })
        .catch((error) => {
          console.error('[Service Worker] Error completing task:', error);
        })
    );
  } else {
    // Open the app or focus existing window
    event.waitUntil(
      clients
        .matchAll({ type: 'window', includeUncontrolled: true })
        .then((clientList) => {
          // Check if app is already open
          for (const client of clientList) {
            if (client.url === url && 'focus' in client) {
              return client.focus();
            }
          }
          // Open new window if not open
          if (clients.openWindow) {
            return clients.openWindow(url);
          }
        })
    );
  }
});

// Notification close event
self.addEventListener('notificationclose', (event) => {
  console.log('[Service Worker] Notification closed:', event);
});

// Message event - communicate with clients
self.addEventListener('message', (event) => {
  console.log('[Service Worker] Message received:', event.data);

  if (event.data && event.data.type === 'SKIP_WAITING') {
    self.skipWaiting();
  }
});

// Background sync - for offline task creation
self.addEventListener('sync', (event) => {
  console.log('[Service Worker] Background sync triggered:', event.tag);

  if (event.tag === 'sync-offline-tasks') {
    event.waitUntil(
      syncOfflineTasksToServer()
        .then((result) => {
          console.log('[Service Worker] Sync completed:', result);
          // Notify all clients about sync completion
          return self.clients.matchAll().then((clients) => {
            clients.forEach((client) => {
              client.postMessage({
                type: 'SYNC_COMPLETE',
                success: result.success,
                failed: result.failed,
              });
            });
          });
        })
        .catch((error) => {
          console.error('[Service Worker] Sync failed:', error);
        })
    );
  }
});

/**
 * Sync offline tasks from IndexedDB to server
 */
async function syncOfflineTasksToServer() {
  try {
    // Open IndexedDB
    const db = await openOfflineDatabase();
    const tasks = await getPendingTasksFromDB(db);

    console.log(`[Service Worker] Found ${tasks.length} offline tasks to sync`);

    let success = 0;
    let failed = 0;

    for (const task of tasks) {
      try {
        // Try to sync task to server
        const response = await fetch('/api/tasks', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            title: task.title,
            description: task.description,
            dueDate: task.dueDate,
            dueTime: task.dueTime,
            priority: task.priority,
            categoryId: task.categoryId,
            estimatedTime: task.estimatedTime,
            isRecurring: task.isRecurring,
            recurringPattern: task.recurringPattern,
          }),
        });

        if (response.ok) {
          // Successfully synced - delete from offline storage
          await deleteTaskFromDB(db, task.id);
          success++;
          console.log('[Service Worker] Task synced successfully:', task.id);
        } else {
          failed++;
          console.error('[Service Worker] Task sync failed:', response.status);
        }
      } catch (error) {
        failed++;
        console.error('[Service Worker] Error syncing task:', error);
      }
    }

    db.close();
    return { success, failed };
  } catch (error) {
    console.error('[Service Worker] Sync error:', error);
    return { success: 0, failed: 0 };
  }
}

/**
 * Open IndexedDB database
 */
function openOfflineDatabase() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('duesync-offline', 1);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Get pending tasks from IndexedDB
 */
function getPendingTasksFromDB(db) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-tasks'], 'readonly');
    const store = transaction.objectStore('pending-tasks');
    const index = store.index('syncStatus');
    const request = index.getAll('pending');

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

/**
 * Delete task from IndexedDB
 */
function deleteTaskFromDB(db, taskId) {
  return new Promise((resolve, reject) => {
    const transaction = db.transaction(['pending-tasks'], 'readwrite');
    const store = transaction.objectStore('pending-tasks');
    const request = store.delete(taskId);

    request.onsuccess = () => resolve();
    request.onerror = () => reject(request.error);
  });
}
