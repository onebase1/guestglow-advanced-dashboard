// Service Worker registration and management for offline functionality

export interface OfflineStatus {
  isOnline: boolean
  hasServiceWorker: boolean
  offlineQueueCount: number
  lastSync?: Date
}

class ServiceWorkerManager {
  private registration: ServiceWorkerRegistration | null = null
  private statusCallbacks: ((status: OfflineStatus) => void)[] = []
  private currentStatus: OfflineStatus = {
    isOnline: navigator.onLine,
    hasServiceWorker: false,
    offlineQueueCount: 0
  }

  constructor() {
    this.setupEventListeners()
  }

  async register(): Promise<boolean> {
    if (!('serviceWorker' in navigator)) {
      console.warn('Service Worker not supported')
      return false
    }

    try {
      this.registration = await navigator.serviceWorker.register('/sw.js', {
        scope: '/'
      })

      console.log('Service Worker registered successfully:', this.registration.scope)

      // Wait for the service worker to be ready before attempting sync registration
      await navigator.serviceWorker.ready

      // Listen for service worker updates
      this.registration.addEventListener('updatefound', () => {
        const newWorker = this.registration!.installing
        if (newWorker) {
          newWorker.addEventListener('statechange', () => {
            if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
              // New service worker available
              this.notifyUpdate()
            }
          })
        }
      })

      // Listen for messages from service worker
      navigator.serviceWorker.addEventListener('message', this.handleServiceWorkerMessage.bind(this))

      this.currentStatus.hasServiceWorker = true
      this.updateStatus()

      // Register for background sync if supported - after service worker is ready
      if ('sync' in this.registration && navigator.serviceWorker.controller) {
        // Send message to service worker to register sync
        navigator.serviceWorker.controller.postMessage({ type: 'REGISTER_SYNC' })
      } else if ('sync' in this.registration) {
        // If no controller yet, wait for it
        navigator.serviceWorker.addEventListener('controllerchange', () => {
          if (navigator.serviceWorker.controller) {
            navigator.serviceWorker.controller.postMessage({ type: 'REGISTER_SYNC' })
          }
        })
      }

      return true
    } catch (error) {
      console.error('Service Worker registration failed:', error)
      return false
    }
  }

  private setupEventListeners() {
    // Online/offline status
    window.addEventListener('online', () => {
      this.currentStatus.isOnline = true
      this.updateStatus()
      this.processOfflineQueue()
    })

    window.addEventListener('offline', () => {
      this.currentStatus.isOnline = false
      this.updateStatus()
    })

    // Page visibility change - check offline queue when page becomes visible
    document.addEventListener('visibilitychange', () => {
      if (!document.hidden && this.currentStatus.isOnline) {
        this.processOfflineQueue()
      }
    })
  }

  private handleServiceWorkerMessage(event: MessageEvent) {
    const { type, data } = event.data

    switch (type) {
      case 'FEEDBACK_STORED_OFFLINE':
        console.log('Feedback stored offline:', data.id)
        this.updateOfflineQueueCount()
        this.showOfflineNotification('Feedback saved offline and will be submitted when connection is restored')
        break

      case 'OFFLINE_FEEDBACK_SUBMITTED':
        console.log('Offline feedback submitted:', data.id)
        this.updateOfflineQueueCount()
        this.showOfflineNotification('Offline feedback submitted successfully!')
        break

      case 'OFFLINE_FEEDBACK_FAILED':
        console.log('Offline feedback failed:', data.id)
        this.updateOfflineQueueCount()
        this.showOfflineNotification('Failed to submit offline feedback after multiple attempts', 'error')
        break

      default:
        console.log('Unknown service worker message:', type)
    }
  }

  private async updateOfflineQueueCount() {
    if (!navigator.serviceWorker.controller) return

    try {
      const channel = new MessageChannel()
      
      const count = await new Promise<number>((resolve) => {
        channel.port1.onmessage = (event) => {
          resolve(event.data.count || 0)
        }
        
        navigator.serviceWorker.controller!.postMessage({
          type: 'GET_OFFLINE_COUNT'
        }, [channel.port2])
        
        // Timeout after 5 seconds
        setTimeout(() => resolve(0), 5000)
      })

      this.currentStatus.offlineQueueCount = count
      this.updateStatus()
    } catch (error) {
      console.error('Error getting offline queue count:', error)
    }
  }

  private processOfflineQueue() {
    if (navigator.serviceWorker.controller) {
      navigator.serviceWorker.controller.postMessage({
        type: 'CHECK_OFFLINE_QUEUE'
      })
    }
  }

  private updateStatus() {
    this.statusCallbacks.forEach(callback => {
      try {
        callback(this.currentStatus)
      } catch (error) {
        console.error('Error in status callback:', error)
      }
    })
  }

  private notifyUpdate() {
    // Show notification about service worker update
    this.showOfflineNotification('App updated! Refresh to get the latest version.', 'info')
  }

  private showOfflineNotification(message: string, type: 'success' | 'error' | 'info' = 'success') {
    // Check if notification already exists
    const existingNotification = document.getElementById('offline-notification')
    if (existingNotification) {
      existingNotification.remove()
    }

    // Create a simple notification
    const notification = document.createElement('div')
    notification.id = 'offline-notification'
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: ${type === 'error' ? '#f44336' : type === 'info' ? '#2196f3' : '#4caf50'};
      color: white;
      padding: 16px 24px;
      border-radius: 8px;
      box-shadow: 0 4px 12px rgba(0,0,0,0.15);
      z-index: 10000;
      max-width: 400px;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
      font-size: 14px;
      line-height: 1.4;
      animation: slideIn 0.3s ease-out;
    `

    // Add animation styles if not already present
    if (!document.getElementById('offline-notification-styles')) {
      const style = document.createElement('style')
      style.id = 'offline-notification-styles'
      style.textContent = `
        @keyframes slideIn {
          from { transform: translateX(100%); opacity: 0; }
          to { transform: translateX(0); opacity: 1; }
        }
        @keyframes slideOut {
          from { transform: translateX(0); opacity: 1; }
          to { transform: translateX(100%); opacity: 0; }
        }
      `
      document.head.appendChild(style)
    }

    notification.textContent = message
    document.body.appendChild(notification)

    // Auto-remove after 5 seconds
    setTimeout(() => {
      notification.style.animation = 'slideOut 0.3s ease-in'
      setTimeout(() => {
        if (notification.parentNode) {
          notification.parentNode.removeChild(notification)
        }
      }, 300)
    }, 5000)
  }

  // Public methods
  onStatusChange(callback: (status: OfflineStatus) => void) {
    this.statusCallbacks.push(callback)
    // Immediately call with current status
    callback(this.currentStatus)
  }

  removeStatusListener(callback: (status: OfflineStatus) => void) {
    const index = this.statusCallbacks.indexOf(callback)
    if (index > -1) {
      this.statusCallbacks.splice(index, 1)
    }
  }

  getStatus(): OfflineStatus {
    return { ...this.currentStatus }
  }

  async forceSync() {
    this.processOfflineQueue()
    await this.updateOfflineQueueCount()
  }

  async updateServiceWorker() {
    if (this.registration && this.registration.waiting) {
      this.registration.waiting.postMessage({ type: 'SKIP_WAITING' })
      window.location.reload()
    }
  }

  // Check if feedback can be submitted (online or offline capability available)
  canSubmitFeedback(): boolean {
    return this.currentStatus.isOnline || this.currentStatus.hasServiceWorker
  }

  // Get user-friendly status message
  getStatusMessage(): string {
    if (this.currentStatus.isOnline) {
      if (this.currentStatus.offlineQueueCount > 0) {
        return `Online - ${this.currentStatus.offlineQueueCount} offline feedback items being processed`
      }
      return 'Online - All systems operational'
    } else if (this.currentStatus.hasServiceWorker) {
      return 'Offline - Feedback will be saved and submitted when connection is restored'
    } else {
      return 'Offline - Limited functionality available'
    }
  }
}

// Create singleton instance
export const serviceWorkerManager = new ServiceWorkerManager()

// Auto-register service worker when module loads
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  // Wait for page load to avoid slowing down initial render
  if (document.readyState === 'complete') {
    serviceWorkerManager.register()
  } else {
    window.addEventListener('load', () => {
      serviceWorkerManager.register()
    })
  }
}

// Export convenience functions
export const onOfflineStatusChange = (callback: (status: OfflineStatus) => void) => 
  serviceWorkerManager.onStatusChange(callback)

export const removeOfflineStatusListener = (callback: (status: OfflineStatus) => void) =>
  serviceWorkerManager.removeStatusListener(callback)

export const getOfflineStatus = () => serviceWorkerManager.getStatus()

export const forceOfflineSync = () => serviceWorkerManager.forceSync()

export const canSubmitFeedback = () => serviceWorkerManager.canSubmitFeedback()

export const getOfflineStatusMessage = () => serviceWorkerManager.getStatusMessage()
