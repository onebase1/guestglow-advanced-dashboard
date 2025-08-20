import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { PieChart, Pie, Cell, BarChart, Bar, XAxis, YAxis, ResponsiveContainer, Tooltip } from "recharts"
import { supabase } from "@/integrations/supabase/client"
import { TrendingUp, BarChart3 } from "lucide-react"
import { getCurrentUserTenant, getTenantBySlug, type Tenant, DEFAULT_TENANT } from "@/utils/tenant"

interface SentimentData {
  name: string
  value: number
  color: string
}

interface ResponseTimeData {
  month: string
  internal: number
  external: number
}

interface ReviewSourceData {
  source: string
  count: number
  percentage: number
}

export function AnalyticsCharts() {
  const [sentimentData, setSentimentData] = useState<SentimentData[]>([])
  const [responseTimeData, setResponseTimeData] = useState<ResponseTimeData[]>([])
  const [reviewSourceData, setReviewSourceData] = useState<ReviewSourceData[]>([])
  const [responseRate, setResponseRate] = useState({ current: 23, target: 90 })
  const [loading, setLoading] = useState(true)
  const [tenant, setTenant] = useState<Tenant>(DEFAULT_TENANT)

  // Initialize tenant
  useEffect(() => {
    const initializeTenant = async () => {
      try {
        const tenantId = await getCurrentUserTenant()
        if (tenantId) {
          const tenantData = await getTenantBySlug('eusbett')
          if (tenantData) {
            setTenant(tenantData)
          }
        }
      } catch (error) {
        console.error('Error loading tenant:', error)
      }
    }

    initializeTenant()
  }, [])

  useEffect(() => {
    if (tenant.id) {
      loadChartData()
    }
  }, [tenant])

  const loadChartData = async () => {
    try {
      // Get sentiment analysis from external reviews (tenant-aware)
      const { data: externalReviews } = await supabase
        .from('external_reviews')
        .select('sentiment')
        .eq('tenant_id', tenant.id)

      const feedbackSummaryResult = await supabase.rpc('get_feedback_summary', { p_tenant_id: tenant.id })
      const externalSummaryResult = await supabase.rpc('get_external_reviews_summary', { p_tenant_id: tenant.id })

      // Calculate sentiment distribution
      const sentimentCounts = {
        positive: 0,
        neutral: 0,
        negative: 0
      }

      externalReviews?.forEach(review => {
        if (review.sentiment) {
          sentimentCounts[review.sentiment as keyof typeof sentimentCounts]++
        }
      })

      const total = Object.values(sentimentCounts).reduce((sum, count) => sum + count, 0)
      
      if (total > 0) {
        setSentimentData([
          { 
            name: 'Positive', 
            value: Math.round((sentimentCounts.positive / total) * 100), 
            color: '#10b981' 
          },
          { 
            name: 'Neutral', 
            value: Math.round((sentimentCounts.neutral / total) * 100), 
            color: '#f59e0b' 
          },
          { 
            name: 'Negative', 
            value: Math.round((sentimentCounts.negative / total) * 100), 
            color: '#ef4444' 
          }
        ])
      }

      // Mock response time improvement data - in real app this would come from actual response tracking
      setResponseTimeData([
        { month: 'Jan', internal: 14, external: 1 },
        { month: 'Feb', internal: 12, external: 1 },
        { month: 'Mar', internal: 10, external: 1 },
        { month: 'Apr', internal: 8, external: 1 },
        { month: 'May', internal: 6, external: 1 },
        { month: 'Jun', internal: 3, external: 1 }
      ])

      // Calculate review source distribution
      const feedbackSummary = feedbackSummaryResult.data?.[0]
      const externalSummary = externalSummaryResult.data?.[0]
      const internalCount = feedbackSummary?.total_feedback || 0
      const externalCount = externalSummary?.total_external_reviews || 0
      const totalReviews = internalCount + externalCount

      if (totalReviews > 0) {
        setReviewSourceData([
          {
            source: 'Internal',
            count: internalCount,
            percentage: Math.round((internalCount / totalReviews) * 100)
          },
          {
            source: 'External',
            count: externalCount,
            percentage: Math.round((externalCount / totalReviews) * 100)
          }
        ])
      }

      // Calculate response rate based on external reviews needing response  
      const needingResponse = externalSummary?.reviews_needing_response || 0
      const responded = externalSummary?.responded_reviews || 0
      const totalNeedingReview = needingResponse + responded
      
      if (totalNeedingReview > 0) {
        const currentRate = Math.round((responded / totalNeedingReview) * 100)
        setResponseRate({ current: currentRate, target: 90 })
      }

    } catch (error) {
      // Chart data loading failed
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {[1, 2, 3].map(i => (
          <Card key={i}>
            <CardContent className="p-6">
              <div className="animate-pulse">
                <div className="h-4 bg-muted rounded w-1/2 mb-4"></div>
                <div className="h-32 bg-muted rounded"></div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Response Rate Improvement */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <TrendingUp className="h-5 w-5" />
            <CardTitle>Response Rate Improvement</CardTitle>
          </div>
          <CardDescription>Current vs Target Response Rate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Current Rate</span>
              <span className="text-2xl font-bold">{responseRate.current}%</span>
            </div>
            <Progress value={responseRate.current} className="h-2" />
            
            <div className="flex justify-between items-center">
              <span className="text-sm font-medium">Target Rate</span>
              <span className="text-2xl font-bold">{responseRate.target}%</span>
            </div>
            <Progress value={responseRate.target} className="h-2" />
            
            <div className="mt-4 p-3 bg-primary/10 rounded-lg">
              <p className="text-sm text-primary font-medium">
                +{responseRate.target - responseRate.current}% improvement potential with automation
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Review Sentiment Analysis */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <BarChart3 className="h-5 w-5" />
            <CardTitle>Review Sentiment Analysis</CardTitle>
          </div>
          <CardDescription>Distribution of review sentiments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="mx-auto aspect-square max-h-[250px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={sentimentData}
                  cx="50%"
                  cy="50%"
                  innerRadius={60}
                  outerRadius={100}
                  paddingAngle={5}
                  dataKey="value"
                >
                  {sentimentData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          <div className="flex justify-center gap-4 mt-4">
            {sentimentData.map((item) => (
              <div key={item.name} className="flex items-center gap-2">
                <div 
                  className="w-3 h-3 rounded-full" 
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-sm">{item.name}: {item.value}%</span>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Response Time Improvement */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Response Time Improvement</CardTitle>
          <CardDescription>Average response time reduction over 6 months</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="h-80 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={responseTimeData}>
                <XAxis dataKey="month" />
                <YAxis label={{ value: 'Days', angle: -90, position: 'insideLeft' }} />
                <Tooltip />
                <Bar dataKey="internal" fill="#3b82f6" name="Internal Reviews" />
                <Bar dataKey="external" fill="#10b981" name="External Reviews" />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </CardContent>
      </Card>

      {/* Review Source Distribution */}
      <Card className="lg:col-span-2">
        <CardHeader>
          <CardTitle>Review Source Distribution</CardTitle>
          <CardDescription>Internal vs External review breakdown</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {reviewSourceData.map((source) => (
              <div key={source.source} className="space-y-2">
                <div className="flex justify-between items-center">
                  <span className="font-medium">{source.source} Reviews</span>
                  <div className="flex items-center gap-2">
                    <Badge variant="outline">{source.count}</Badge>
                    <span className="text-sm text-muted-foreground">{source.percentage}%</span>
                  </div>
                </div>
                <Progress value={source.percentage} className="h-2" />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}