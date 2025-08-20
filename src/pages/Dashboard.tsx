import { useEffect, useState } from "react"
import { useParams } from "react-router-dom"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { LoadingState } from "@/components/ui/loading-state"
import { supabase } from "@/integrations/supabase/client"
import { useAuth } from "@/hooks/useAuth"
import { getCurrentUserTenant, getTenantBySlug, validateTenantAccess, type Tenant, DEFAULT_TENANT } from "@/utils/tenant"
import { DashboardStats } from "@/components/DashboardStats"
import { DashboardContent } from "@/components/DashboardTabs"
import { AppSidebar } from "@/components/AppSidebar"
import { SidebarProvider, SidebarTrigger, SidebarInset } from "@/components/ui/sidebar"
import { BottomNavigation } from "@/components/ui/bottom-navigation"
import { MessageSquare, Eye, BarChart3, Settings } from "lucide-react"

interface DashboardStats {
  totalFeedback: number
  averageRating: number
  highRatings: number
  lowRatings: number
  resolvedCount: number
  externalReviews: number
  averageExternalRating: number
  reviewsNeedingResponse: number
  responseSent: number
  pendingResponse: number
}

interface RecentFeedback {
  id: string
  guest_name: string | null
  guest_email: string | null
  rating: number
  feedback_preview: string | null
  feedback_text: string
  comment: string // Database column name
  category: string // Database column name
  issue_category: string
  status: string
  created_at: string
  room_number: string
  response_sent_at?: string | null
  response_content?: string | null
  response_sent_by?: string | null
}

interface ExternalReview {
  id: string
  place_name: string
  provider: string
  review_rating: number
  review_preview: string | null
  author_name: string | null
  review_date: string
  sentiment: string
  response_required: boolean
}

export default function Dashboard() {
  const { user, loading: authLoading } = useAuth()
  const { tenantSlug } = useParams<{ tenantSlug?: string }>()
  const [activeTab, setActiveTab] = useState("internal")
  const [stats, setStats] = useState<DashboardStats | null>(null)
  const [recentFeedback, setRecentFeedback] = useState<RecentFeedback[]>([])
  const [externalReviews, setExternalReviews] = useState<ExternalReview[]>([])
  const [loading, setLoading] = useState(true)
  const [reviewTimeRange, setReviewTimeRange] = useState(12) // months
  const [tenant, setTenant] = useState<Tenant>(DEFAULT_TENANT)
  const [tenantLoading, setTenantLoading] = useState(true)

  // Initialize tenant information
  useEffect(() => {
    const initializeTenant = async () => {
      setTenantLoading(true)
      try {
        // Determine tenant slug from URL parameter or default to 'eusbett'
        const targetTenantSlug = tenantSlug || 'eusbett'

        // Load tenant data
        const tenantData = await getTenantBySlug(targetTenantSlug)
        if (tenantData) {
          // If user is authenticated, validate they have access to this tenant
          if (user) {
            const hasAccess = await validateTenantAccess(tenantData.id)
            if (!hasAccess) {
              console.warn(`User ${user.email} does not have access to tenant ${targetTenantSlug}`)
              // For testing, we'll allow access anyway
              // In production, you might redirect to an error page or default tenant
            }
          }
          setTenant(tenantData)
        } else {
          console.error(`Tenant '${targetTenantSlug}' not found`)
          // Fallback to Eusbett tenant
          const fallbackTenant = await getTenantBySlug('eusbett')
          if (fallbackTenant) {
            setTenant(fallbackTenant)
          }
        }
      } catch (error) {
        console.error('Error loading tenant:', error)
        // Fallback to Eusbett tenant
        try {
          const tenantData = await getTenantBySlug('eusbett')
          if (tenantData) {
            setTenant(tenantData)
          }
        } catch (fallbackError) {
          console.error('Fallback tenant loading failed:', fallbackError)
        }
      } finally {
        setTenantLoading(false)
      }
    }

    initializeTenant()
  }, [user, tenantSlug])

  useEffect(() => {
    if (!tenantLoading && tenant.id) {
      loadDashboardData()
    }
    // For testing, we're allowing access without authentication
    // In production, uncomment the following lines:
    // else if (!authLoading && !user) {
    //   window.location.href = '/auth'
    // }
  }, [reviewTimeRange, tenantLoading, tenant.id])

  const loadDashboardData = async () => {
    try {
      // Calculate date filter for external reviews
      const cutoffDate = new Date()
      cutoffDate.setMonth(cutoffDate.getMonth() - reviewTimeRange)
      const dateFilter = cutoffDate.toISOString()

      // Load data using direct table queries (temporary fix for missing functions)
      const [feedbackData, externalReviewsData, recentFeedbackData] = await Promise.all([
        supabase
          .from('feedback')
          .select('*')
          .eq('tenant_id', tenant.id),
        supabase
          .from('external_reviews')
          .select('*')
          .eq('tenant_id', tenant.id)
          .gte('review_date', dateFilter)
          .order('review_date', { ascending: false }),
        supabase
          .from('feedback')
          .select('*')
          .eq('tenant_id', tenant.id)
          .order('created_at', { ascending: false })
          .limit(10)
      ])

      // Calculate stats from direct table data
      const feedbackList = feedbackData.data || []
      const externalReviews = externalReviewsData.data || []

      // Internal feedback stats
      const totalFeedback = feedbackList.length
      const averageRating = totalFeedback > 0
        ? feedbackList.reduce((sum, f) => sum + f.rating, 0) / totalFeedback
        : 0
      const internalHigh = feedbackList.filter(f => f.rating >= 4).length
      const internalLow = feedbackList.filter(f => f.rating <= 3).length
      const resolvedCount = feedbackList.filter(f => f.status === 'resolved').length

      // External review stats
      const externalHigh = externalReviews.filter(r => r.review_rating >= 4).length
      const externalLow = externalReviews.filter(r => r.review_rating < 4).length
      const externalAvg = externalReviews.length > 0
        ? externalReviews.reduce((sum, r) => sum + r.review_rating, 0) / externalReviews.length
        : 0
      const needingResponse = externalReviews.filter(r => r.response_required).length

      // Calculate response stats
      const feedbackWithEmail = feedbackList.filter(f => f.guest_email) || []
      const responseSent = 3 // Mock data for demo
      const pendingResponse = Math.max(0, feedbackWithEmail.length - responseSent)

      setStats({
        totalFeedback,
        averageRating,
        highRatings: internalHigh + externalHigh,
        lowRatings: internalLow + externalLow,
        resolvedCount,
        externalReviews: externalReviews.length,
        averageExternalRating: externalAvg,
        reviewsNeedingResponse: needingResponse,
        responseSent,
        pendingResponse
      })

      if (recentFeedbackData.data) {
        setRecentFeedback(recentFeedbackData.data.map((f, index) => ({
          ...f,
          feedback_text: f.comment, // Map comment to feedback_text for compatibility
          feedback_preview: f.comment?.substring(0, 200) || 'No detailed feedback provided',
          response_sent_at: index < 3 ? new Date().toISOString() : null, // Mock some responses
          response_content: null,
          response_sent_by: null
        })))
      }

      // Set recent external reviews (limit to 10)
      if (externalReviews.length > 0) {
        setExternalReviews(externalReviews.slice(0, 10).map(review => ({
          id: review.id,
          place_name: review.place_name,
          provider: review.provider,
          review_rating: review.review_rating,
          review_preview: review.review_text?.substring(0, 200),
          author_name: review.author_name,
          review_date: review.review_date,
          sentiment: review.sentiment || 'neutral',
          response_required: review.response_required || false
        })))
      }
    } catch (error) {
      // Dashboard data loading failed
    } finally {
      setLoading(false)
    }
  }


  if (authLoading || loading) {
    return <LoadingState variant="dashboard" className="container mx-auto p-6" />
  }

  if (!user) {
    return null
  }

  const bottomNavItems = [
    { id: 'internal', title: 'Reviews', icon: MessageSquare, isActive: activeTab === 'internal', onClick: () => setActiveTab('internal') },
    { id: 'external', title: 'Monitor', icon: Eye, isActive: activeTab === 'external', onClick: () => setActiveTab('external') },
    { id: 'analytics', title: 'Analytics', icon: BarChart3, isActive: activeTab === 'analytics', onClick: () => setActiveTab('analytics') },
    { id: 'settings', title: 'Settings', icon: Settings, isActive: activeTab === 'settings', onClick: () => setActiveTab('settings') },
  ]

  return (
    <SidebarProvider>
      <div className="min-h-screen flex w-full bg-gradient-to-br from-background to-accent/10">
        <AppSidebar activeTab={activeTab} onTabChange={setActiveTab} />
        
        <SidebarInset className="flex-1 pb-20 md:pb-0">
          <header className="flex h-14 items-center gap-2 border-b border-border/40 px-4">
            <SidebarTrigger />
            <div className="flex-1 min-w-0">
              <h1 className="text-xl font-semibold truncate">
                {tenant.name} Dashboard
              </h1>
              {tenantLoading && (
                <p className="text-xs text-muted-foreground">Loading tenant...</p>
              )}
            </div>
            <div className="hidden sm:flex items-center gap-2">
              <span className="text-sm text-muted-foreground">External reviews:</span>
              <Select 
                value={reviewTimeRange.toString()} 
                onValueChange={(value) => setReviewTimeRange(parseInt(value))}
              >
                <SelectTrigger className="w-32">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="3">3 months</SelectItem>
                  <SelectItem value="6">6 months</SelectItem>
                  <SelectItem value="12">12 months</SelectItem>
                  <SelectItem value="24">24 months</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </header>

          <div className="flex-1 space-y-6 p-6">
            <DashboardStats stats={stats} />
            
            <DashboardContent 
              activeTab={activeTab}
              recentFeedback={recentFeedback} 
              externalReviews={externalReviews}
              onStatusUpdate={loadDashboardData}
            />
          </div>
        </SidebarInset>
      </div>
      
      {/* Mobile Bottom Navigation */}
      <BottomNavigation items={bottomNavItems} />
    </SidebarProvider>
  )
}