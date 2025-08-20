// Service Worker for GuestGlow - Offline Feedback Capability
// Handles offline feedback submission and caching

const CACHE_NAME = 'guestglow-v1'
const OFFLINE_FEEDBACK_STORE = 'offline-feedback'

// Supabase config for direct RPC replay from Service Worker
const SUPABASE_URL = 'https://wzfpltamwhkncxjvulik.supabase.co'
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind6ZnBsdGFtd2hrbmN4anZ1bGlrIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTQ0NDI5NTksImV4cCI6MjA3MDAxODk1OX0.4m707IwEkfrE-HIJFoP8hUz6VckZTTc_3CgH44f68Hk'
const SUPABASE_INSERT_RPC = `${SUPABASE_URL}/rest/v1/rpc/insert_feedback_with_tenant`

// Files to cache for offline functionality
const STATIC_CACHE_URLS = [
  '/',
  '/offline.html',
  '/manifest.json'
]

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('Service Worker installing...')
  
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => {
        console.log('Caching static assets')
        // Try to cache each URL individually to handle failures gracefully
        return Promise.all(
          STATIC_CACHE_URLS.map((url) => {
            return cache.add(url).catch((error) => {
              console.warn(`Failed to cache ${url}:`, error)
              return Promise.resolve()
            })
          })
        )
      })
      .then(() => {
        console.log('Service Worker installed successfully')
        return self.skipWaiting()
      })
      .catch((error) => {
        console.error('Service Worker installation failed:', error)
      })
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('Service Worker activating...')
  
  event.waitUntil(
    caches.keys()
      .then((cacheNames) => {
        return Promise.all(
          cacheNames.map((cacheName) => {
            if (cacheName !== CACHE_NAME) {
              console.log('Deleting old cache:', cacheName)
              return caches.delete(cacheName)
            }
          })
        )
      })
      .then(() => {
        console.log('Service Worker activated')
        return self.clients.claim()
      })
  )
})

// Fetch event - handle network requests
self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  // Skip non-http(s) requests
  if (!url.protocol.startsWith('http')) {
    return
  }

  // Allow handling of both same-origin and Supabase cross-origin requests
  // (Needed to intercept Supabase RPC for offline queueing)

  // Handle feedback submission requests
  if (request.method === 'POST' && url.pathname.includes('/rest/v1/rpc/insert_feedback_with_tenant')) {
    event.respondWith(handleFeedbackSubmission(request))
    return
  }

  // Handle other requests with cache-first strategy for static assets
  if (request.method === 'GET') {
    event.respondWith(handleGetRequest(request))
    return
  }
})

// Handle feedback submission with offline support
async function handleFeedbackSubmission(request) {
  try {
    // Try to submit feedback online first
    const response = await fetch(request.clone())
    
    if (response.ok) {
      console.log('Feedback submitted successfully online')
      
      // Process any queued offline feedback
      processOfflineQueue()
      
      return response
    } else {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`)
    }
  } catch (error) {
    console.log('Network error during feedback submission, storing offline:', error)
    
    // Store feedback for offline processing
    const feedbackData = await request.json()
    await storeOfflineFeedback(feedbackData)
    
    // Return a success response to the client
    return new Response(
      JSON.stringify({
        success: true,
        offline: true,
        message: 'Feedback saved offline and will be submitted when connection is restored',
        id: generateOfflineId()
      }),
      {
        status: 200,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

// Handle GET requests with cache strategy
async function handleGetRequest(request) {
  const url = new URL(request.url)
  
  // For navigation requests (HTML pages), always try network first
  if (request.mode === 'navigate' || request.headers.get('accept')?.includes('text/html')) {
    try {
      const networkResponse = await fetch(request)
      
      if (networkResponse.ok) {
        // Don't cache HTML pages as they're served dynamically by React
        return networkResponse
      }
    } catch (error) {
      console.log('Network error for navigation request:', error)
      
      // Try to return the offline page
      const offlineResponse = await caches.match('/offline.html')
      if (offlineResponse) {
        return offlineResponse
      }
    }
  }
  
  // For static assets, use cache-first strategy
  const cachedResponse = await caches.match(request)
  if (cachedResponse) {
    return cachedResponse
  }
  
  try {
    const networkResponse = await fetch(request)
    
    // Cache successful responses for static assets only
    if (networkResponse.ok && shouldCache(request)) {
      const cache = await caches.open(CACHE_NAME)
      cache.put(request, networkResponse.clone())
    }
    
    return networkResponse
  } catch (error) {
    console.log('Network error, no cache available:', error)
    
    // Return a basic offline response
    return new Response(
      JSON.stringify({
        error: 'Network unavailable and no cached version available',
        offline: true
      }),
      {
        status: 503,
        headers: {
          'Content-Type': 'application/json'
        }
      }
    )
  }
}

// Determine if a request should be cached
function shouldCache(request) {
  const url = new URL(request.url)
  
  // Cache static assets
  return url.pathname.match(/\.(js|css|png|jpg|jpeg|gif|svg|ico|woff|woff2|ttf|eot)$/i)
}

// Store feedback data for offline processing
async function storeOfflineFeedback(feedbackData) {
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction([OFFLINE_FEEDBACK_STORE], 'readwrite')
    const store = transaction.objectStore(OFFLINE_FEEDBACK_STORE)
    
    const offlineEntry = {
      id: generateOfflineId(),
      feedbackData,
      timestamp: Date.now(),
      retryCount: 0,
      status: 'pending'
    }
    
    await store.add(offlineEntry)
    console.log('Feedback stored offline:', offlineEntry.id)
    
    // Notify client about offline storage
    notifyClients({
      type: 'FEEDBACK_STORED_OFFLINE',
      data: { id: offlineEntry.id, timestamp: offlineEntry.timestamp }
    })
    
  } catch (error) {
    console.error('Error storing offline feedback:', error)
  }
}

// Process queued offline feedback when connection is restored
async function processOfflineQueue() {
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction([OFFLINE_FEEDBACK_STORE], 'readwrite')
    const store = transaction.objectStore(OFFLINE_FEEDBACK_STORE)
    const request = store.getAll()
    
    request.onsuccess = async () => {
      const offlineEntries = request.result
      
      for (const entry of offlineEntries) {
        if (entry.status === 'pending' && entry.retryCount < 3) {
          try {
            // Attempt to submit the feedback directly to Supabase RPC endpoint
            const response = await fetch(SUPABASE_INSERT_RPC, {
              method: 'POST',
              headers: {
                'Content-Type': 'application/json',
                'apikey': SUPABASE_ANON_KEY,
                'Authorization': `Bearer ${SUPABASE_ANON_KEY}`
              },
              body: JSON.stringify(entry.feedbackData)
            })

            if (response.ok) {
              // Success - remove from offline store
              await store.delete(entry.id)
              console.log('Offline feedback submitted successfully:', entry.id)

              notifyClients({
                type: 'OFFLINE_FEEDBACK_SUBMITTED',
                data: { id: entry.id, success: true }
              })
            } else {
              // Failed - increment retry count
              entry.retryCount++
              entry.lastError = `HTTP ${response.status}`
              await store.put(entry)

              console.log('Offline feedback submission failed, will retry:', entry.id)
            }
          } catch (error) {
            // Network still unavailable - increment retry count
            entry.retryCount++
            entry.lastError = error.message
            await store.put(entry)

            console.log('Network still unavailable for offline feedback:', entry.id)
          }
        } else if (entry.retryCount >= 3) {
          // Max retries reached - mark as failed
          entry.status = 'failed'
          await store.put(entry)

          notifyClients({
            type: 'OFFLINE_FEEDBACK_FAILED',
            data: { id: entry.id, error: 'Max retries exceeded' }
          })
        }
      }
    }
  } catch (error) {
    console.error('Error processing offline queue:', error)
  }
}

// Open IndexedDB for offline storage
function openOfflineDB() {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open('GuestGlowOffline', 1)
    
    request.onerror = () => reject(request.error)
    request.onsuccess = () => resolve(request.result)
    
    request.onupgradeneeded = (event) => {
      const db = event.target.result
      
      if (!db.objectStoreNames.contains(OFFLINE_FEEDBACK_STORE)) {
        const store = db.createObjectStore(OFFLINE_FEEDBACK_STORE, { keyPath: 'id' })
        store.createIndex('timestamp', 'timestamp', { unique: false })
        store.createIndex('status', 'status', { unique: false })
      }
    }
  })
}

// Generate unique ID for offline entries
function generateOfflineId() {
  return `offline_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
}

// Notify all clients about events
function notifyClients(message) {
  self.clients.matchAll().then((clients) => {
    clients.forEach((client) => {
      client.postMessage(message)
    })
  })
}

// Listen for messages from clients
self.addEventListener('message', (event) => {
  const { type, data } = event.data
  
  switch (type) {
    case 'SKIP_WAITING':
      self.skipWaiting()
      break
      
    case 'CHECK_OFFLINE_QUEUE':
      processOfflineQueue()
      break
      
    case 'GET_OFFLINE_COUNT':
      getOfflineCount().then((count) => {
        event.ports[0].postMessage({ count })
      })
      break
      
    case 'REGISTER_SYNC':
      // Register background sync after service worker is ready
      self.registration.sync.register('offline-feedback-sync')
        .then(() => console.log('Background sync registered'))
        .catch((error) => console.warn('Background sync registration failed:', error))
      break
      
    default:
      console.log('Unknown message type:', type)
  }
})

// Get count of offline feedback entries
async function getOfflineCount() {
  try {
    const db = await openOfflineDB()
    const transaction = db.transaction([OFFLINE_FEEDBACK_STORE], 'readonly')
    const store = transaction.objectStore(OFFLINE_FEEDBACK_STORE)
    const request = store.count()
    
    return new Promise((resolve) => {
      request.onsuccess = () => resolve(request.result)
      request.onerror = () => resolve(0)
    })
  } catch (error) {
    console.error('Error getting offline count:', error)
    return 0
  }
}

// Periodic sync to process offline queue
self.addEventListener('sync', (event) => {
  if (event.tag === 'offline-feedback-sync') {
    event.waitUntil(processOfflineQueue())
  }
})

console.log('GuestGlow Service Worker loaded')
