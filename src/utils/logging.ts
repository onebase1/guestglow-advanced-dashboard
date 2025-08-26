import { supabase } from '@/integrations/supabase/client'
import { getCurrentTenantSlug, getCurrentUserTenant } from './tenant'

export interface LogEvent {
  eventType: 'user_action' | 'system_event' | 'error' | 'performance' | 'security'
  eventCategory: string
  eventName: string
  eventData?: Record<string, any>
  userId?: string
  sessionId?: string
  pageUrl?: string
  area?: string
  roomNumber?: string
  durationMs?: number
  severity?: 'debug' | 'info' | 'warn' | 'error' | 'critical'
  tags?: string[]
  correlationId?: string
}

export interface PerformanceMetric {
  metricType: string
  metricName: string
  metricValue: number
  metricUnit?: string
  targetValue?: number
  metadata?: Record<string, any>
  tags?: string[]
}

class Logger {
  private sessionId: string
  private correlationId: string
  private tenantId: string | null = null
  private userId: string | null = null
  private pageLoadTime: number
  private performanceObserver: PerformanceObserver | null = null

  constructor() {
    this.sessionId = this.generateSessionId()
    this.correlationId = this.generateCorrelationId()
    this.pageLoadTime = Date.now()
    this.initializeSession()
    this.setupPerformanceMonitoring()
    this.setupErrorHandling()
  }

  private generateSessionId(): string {
    return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private generateCorrelationId(): string {
    return `corr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
  }

  private async initializeSession() {
    try {
      // Get current user
      const { data: { user } } = await supabase.auth.getUser()
      this.userId = user?.id || null

      // Resolve tenant UUID (not slug) for logging/metrics
      if (this.userId) {
        // Authenticated: use DB helper that returns UUID
        this.tenantId = await getCurrentUserTenant()
      } else {
        // Anonymous: resolve slug -> UUID via RPC to ensure UUID is logged
        const tenantSlug = getCurrentTenantSlug()
        try {
          const { data, error } = await supabase.rpc('get_tenant_by_slug', { p_slug: tenantSlug })
          if (!error && Array.isArray(data) && data.length > 0 && data[0]?.id) {
            this.tenantId = data[0].id as string
          } else {
            this.tenantId = null
          }
        } catch {
          this.tenantId = null
        }
      }

      // Log session start
      await this.logEvent({
        eventType: 'system_event',
        eventCategory: 'session',
        eventName: 'session_start',
        eventData: {
          userAgent: navigator.userAgent,
          screenResolution: `${screen.width}x${screen.height}`,
          viewport: `${window.innerWidth}x${window.innerHeight}`,
          timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
          language: navigator.language,
          platform: navigator.platform,
          cookieEnabled: navigator.cookieEnabled,
          onlineStatus: navigator.onLine
        },
        severity: 'info',
        tags: ['session', 'initialization']
      })
    } catch (error) {
      console.error('Failed to initialize logging session:', error)
    }
  }

  private setupPerformanceMonitoring() {
    // Monitor page load performance
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming
        if (navigation) {
          this.recordMetric({
            metricType: 'performance',
            metricName: 'page_load_time',
            metricValue: navigation.loadEventEnd - navigation.fetchStart,
            metricUnit: 'ms',
            targetValue: 3000, // 3 second target
            metadata: {
              domContentLoaded: navigation.domContentLoadedEventEnd - navigation.fetchStart,
              firstPaint: performance.getEntriesByName('first-paint')[0]?.startTime || null,
              firstContentfulPaint: performance.getEntriesByName('first-contentful-paint')[0]?.startTime || null
            },
            tags: ['performance', 'page_load']
          })
        }
      }, 100)
    })

    // Monitor Core Web Vitals if available
    if ('PerformanceObserver' in window) {
      try {
        this.performanceObserver = new PerformanceObserver((list) => {
          for (const entry of list.getEntries()) {
            if (entry.entryType === 'largest-contentful-paint') {
              this.recordMetric({
                metricType: 'performance',
                metricName: 'largest_contentful_paint',
                metricValue: entry.startTime,
                metricUnit: 'ms',
                targetValue: 2500, // 2.5 second target
                tags: ['performance', 'core_web_vitals', 'lcp']
              })
            }
          }
        })
        this.performanceObserver.observe({ entryTypes: ['largest-contentful-paint'] })
      } catch (error) {
        console.warn('Performance monitoring not available:', error)
      }
    }
  }

  private setupErrorHandling() {
    // Global error handler
    window.addEventListener('error', (event) => {
      this.logEvent({
        eventType: 'error',
        eventCategory: 'javascript_error',
        eventName: 'uncaught_error',
        eventData: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        },
        severity: 'error',
        tags: ['error', 'uncaught']
      })
    })

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.logEvent({
        eventType: 'error',
        eventCategory: 'promise_rejection',
        eventName: 'unhandled_rejection',
        eventData: {
          reason: event.reason?.toString(),
          stack: event.reason?.stack
        },
        severity: 'error',
        tags: ['error', 'promise', 'unhandled']
      })
    })
  }

  async logEvent(event: LogEvent): Promise<void> {
    try {
      const eventData = {
        p_tenant_id: this.tenantId,
        p_event_type: event.eventType,
        p_event_category: event.eventCategory,
        p_event_name: event.eventName,
        p_event_data: event.eventData || null,
        p_user_id: event.userId || this.userId,
        p_session_id: event.sessionId || this.sessionId,
        p_ip_address: null, // Will be captured server-side
        p_user_agent: navigator.userAgent,
        p_page_url: event.pageUrl || window.location.href,
        p_area: event.area || null,
        p_room_number: event.roomNumber || null,
        p_duration_ms: event.durationMs || null,
        p_severity: event.severity || 'info',
        p_tags: event.tags || null,
        p_correlation_id: event.correlationId || this.correlationId
      }

      const { error } = await supabase.rpc('log_system_event', eventData)

      if (error) {
        console.warn('Failed to log event (non-critical):', error)
      }
    } catch (error) {
      console.error('Error logging event:', error)
    }
  }

  async recordMetric(metric: PerformanceMetric): Promise<void> {
    try {
      const metricData = {
        p_tenant_id: this.tenantId,
        p_metric_type: metric.metricType,
        p_metric_name: metric.metricName,
        p_metric_value: metric.metricValue,
        p_metric_unit: metric.metricUnit || null,
        p_target_value: metric.targetValue || null,
        p_metadata: metric.metadata || null,
        p_tags: metric.tags || null
      }

      const { error } = await supabase.rpc('record_performance_metric', metricData)

      if (error) {
        console.warn('Failed to record metric (non-critical):', error)
      }
    } catch (error) {
      console.warn('Error recording metric (non-critical):', error)
    }
  }

  // Convenience methods for common events
  async logFeedbackSubmission(feedbackId: string, rating: number, area?: string, roomNumber?: string, durationMs?: number) {
    await this.logEvent({
      eventType: 'user_action',
      eventCategory: 'feedback_submission',
      eventName: 'feedback_submitted',
      eventData: {
        feedback_id: feedbackId,
        rating,
        submission_method: area ? 'qr_code' : 'web_form'
      },
      area,
      roomNumber,
      durationMs,
      severity: 'info',
      tags: ['feedback', 'submission', rating <= 3 ? 'low_rating' : 'high_rating']
    })

    // Record feedback count metric
    await this.recordMetric({
      metricType: 'feedback',
      metricName: 'feedback_submissions',
      metricValue: 1,
      metricUnit: 'count',
      metadata: { rating, area, room_number: roomNumber },
      tags: ['feedback', 'count']
    })
  }

  async logQRCodeScan(area: string, roomNumber?: string) {
    await this.logEvent({
      eventType: 'user_action',
      eventCategory: 'qr_scan',
      eventName: 'qr_code_scanned',
      eventData: {
        scan_method: 'camera',
        device_type: this.getDeviceType()
      },
      area,
      roomNumber,
      severity: 'info',
      tags: ['qr_code', 'scan', area]
    })
  }

  async logEmailDelivery(feedbackId: string, emailType: string, deliveryTimeMs: number, withinDeadline: boolean) {
    await this.logEvent({
      eventType: 'system_event',
      eventCategory: 'email_delivery',
      eventName: 'email_sent',
      eventData: {
        feedback_id: feedbackId,
        email_type: emailType,
        delivery_time_ms: deliveryTimeMs,
        within_deadline: withinDeadline
      },
      durationMs: deliveryTimeMs,
      severity: withinDeadline ? 'info' : 'warn',
      tags: ['email', 'delivery', emailType, withinDeadline ? 'on_time' : 'delayed']
    })

    // Record email delivery metric
    await this.recordMetric({
      metricType: 'email',
      metricName: 'email_delivery_time',
      metricValue: deliveryTimeMs,
      metricUnit: 'ms',
      targetValue: 300000, // 5 minutes in ms
      metadata: { email_type: emailType, within_deadline: withinDeadline },
      tags: ['email', 'delivery_time']
    })
  }

  async logNetworkError(url: string, errorMessage: string, retryCount?: number) {
    await this.logEvent({
      eventType: 'error',
      eventCategory: 'network_error',
      eventName: 'request_failed',
      eventData: {
        url,
        error_message: errorMessage,
        retry_count: retryCount || 0,
        online_status: navigator.onLine
      },
      severity: 'error',
      tags: ['network', 'error', 'request_failed']
    })
  }

  private getDeviceType(): string {
    const userAgent = navigator.userAgent.toLowerCase()
    if (/mobile|android|iphone|ipad|phone/i.test(userAgent)) {
      return 'mobile'
    } else if (/tablet|ipad/i.test(userAgent)) {
      return 'tablet'
    }
    return 'desktop'
  }

  // Cleanup method
  destroy() {
    if (this.performanceObserver) {
      this.performanceObserver.disconnect()
    }
  }
}

// Create singleton instance
export const logger = new Logger()

// Export convenience functions
export const logEvent = (event: LogEvent) => logger.logEvent(event)
export const recordMetric = (metric: PerformanceMetric) => logger.recordMetric(metric)
export const logFeedbackSubmission = (feedbackId: string, rating: number, area?: string, roomNumber?: string, durationMs?: number) => 
  logger.logFeedbackSubmission(feedbackId, rating, area, roomNumber, durationMs)
export const logQRCodeScan = (area: string, roomNumber?: string) => logger.logQRCodeScan(area, roomNumber)
export const logEmailDelivery = (feedbackId: string, emailType: string, deliveryTimeMs: number, withinDeadline: boolean) =>
  logger.logEmailDelivery(feedbackId, emailType, deliveryTimeMs, withinDeadline)
export const logNetworkError = (url: string, errorMessage: string, retryCount?: number) =>
  logger.logNetworkError(url, errorMessage, retryCount)
