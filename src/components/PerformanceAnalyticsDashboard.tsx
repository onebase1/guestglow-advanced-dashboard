/**
 * 📊 PERFORMANCE ANALYTICS DASHBOARD
 * 
 * Comprehensive dashboard for tracking progress toward 2.98-star rating goal
 * Includes QR performance, conversion tracking, and A/B testing results
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  TrendingUp, 
  TrendingDown, 
  Star, 
  QrCode, 
  ExternalLink, 
  Users, 
  MapPin,
  Calendar,
  BarChart3,
  AlertTriangle
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, subDays, startOfDay } from 'date-fns'

interface PerformanceMetrics {
  current_rating: number
  baseline_rating: number
  target_rating: number
  target_uplift: number
  progress_percentage: number
  total_feedback: number
  baseline_review_count: number
  five_star_count: number
  five_star_percentage: number
  five_star_reviews_needed: number
  five_star_reviews_achieved: number
  daily_five_star_target: number
  external_conversion_rate: number
  near_miss_count: number
  near_miss_percentage: number
  qr_scan_count: number
  qr_conversion_rate: number
  best_performing_location: string
  worst_performing_location: string
  trend_direction: 'up' | 'down' | 'stable'
  days_remaining: number
  on_track_status: 'ahead' | 'on_track' | 'behind' | 'at_risk'
}

interface LocationPerformance {
  location_name: string
  location_type: string
  scan_count: number
  conversion_count: number
  conversion_rate: number
  avg_rating: number
  qr_variant: string
}

interface DailyProgress {
  date: string
  rating: number
  feedback_count: number
  five_star_count: number
  external_reviews: number
}

export function PerformanceAnalyticsDashboard() {
  const [metrics, setMetrics] = useState<PerformanceMetrics | null>(null)
  const [locationPerformance, setLocationPerformance] = useState<LocationPerformance[]>([])
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchPerformanceMetrics()
    fetchLocationPerformance()
    fetchDailyProgress()
  }, [selectedPeriod])

  const fetchPerformanceMetrics = async () => {
    try {
      const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
      const startDate = startOfDay(subDays(new Date(), periodDays))

      // Get overall feedback metrics
      const { data: feedback, error: feedbackError } = await supabase
        .from('feedback')
        .select('rating, created_at')
        .gte('created_at', startDate.toISOString())
        .eq('tenant_id', 'eusbett-tenant-id') // Replace with actual tenant ID

      if (feedbackError) throw feedbackError

      // Calculate current rating
      const totalFeedback = feedback?.length || 0
      const avgRating = totalFeedback > 0 
        ? feedback.reduce((sum, f) => sum + f.rating, 0) / totalFeedback 
        : 0

      const fiveStarCount = feedback?.filter(f => f.rating === 5).length || 0
      const fiveStarPercentage = totalFeedback > 0 ? (fiveStarCount / totalFeedback) * 100 : 0

      // Get 5-star conversion data
      const { data: conversions } = await supabase
        .from('five_star_conversion_logs')
        .select('external_review_decision')
        .gte('five_star_achieved_at', startDate.toISOString())

      const externalConversions = conversions?.filter(c => c.external_review_decision === 'accepted').length || 0
      const externalConversionRate = fiveStarCount > 0 ? (externalConversions / fiveStarCount) * 100 : 0

      // Get QR scan data
      const { data: qrScans } = await supabase
        .from('qr_scan_logs')
        .select('converted_to_feedback')
        .gte('scan_timestamp', startDate.toISOString())

      const totalScans = qrScans?.length || 0
      const qrConversions = qrScans?.filter(s => s.converted_to_feedback).length || 0
      const qrConversionRate = totalScans > 0 ? (qrConversions / totalScans) * 100 : 0

      // Calculate progress toward 2.98 goal
      const targetRating = 2.98
      const progressPercentage = (avgRating / targetRating) * 100
      
      // Estimate days to goal (simplified calculation)
      const currentTrend = 0.01 // Assume 0.01 improvement per week
      const ratingGap = targetRating - avgRating
      const daysToGoal = ratingGap > 0 ? Math.ceil((ratingGap / currentTrend) * 7) : 0

      setMetrics({
        current_rating: avgRating,
        target_rating: targetRating,
        progress_percentage: Math.min(progressPercentage, 100),
        total_feedback: totalFeedback,
        five_star_count: fiveStarCount,
        five_star_percentage: fiveStarPercentage,
        external_conversion_rate: externalConversionRate,
        qr_scan_count: totalScans,
        qr_conversion_rate: qrConversionRate,
        best_performing_location: 'Reception Desk', // TODO: Calculate from data
        worst_performing_location: 'Elevator Bank', // TODO: Calculate from data
        trend_direction: avgRating >= 2.5 ? 'up' : avgRating >= 2.0 ? 'stable' : 'down',
        days_to_goal: daysToGoal
      })

    } catch (error) {
      console.error('Error fetching performance metrics:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchLocationPerformance = async () => {
    try {
      const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
      const startDate = startOfDay(subDays(new Date(), periodDays))

      const { data, error } = await supabase
        .from('qr_scan_logs')
        .select(`
          location_name,
          location_type,
          qr_variant,
          converted_to_feedback,
          feedback!inner(rating)
        `)
        .gte('scan_timestamp', startDate.toISOString())

      if (error) throw error

      // Group by location and calculate performance
      const locationStats = data?.reduce((acc: any, scan) => {
        const key = scan.location_name
        if (!acc[key]) {
          acc[key] = {
            location_name: scan.location_name,
            location_type: scan.location_type,
            scan_count: 0,
            conversion_count: 0,
            total_rating: 0,
            rating_count: 0,
            qr_variant: scan.qr_variant
          }
        }
        
        acc[key].scan_count++
        if (scan.converted_to_feedback) {
          acc[key].conversion_count++
        }
        if (scan.feedback?.rating) {
          acc[key].total_rating += scan.feedback.rating
          acc[key].rating_count++
        }
        
        return acc
      }, {})

      const locationPerformanceData = Object.values(locationStats || {}).map((loc: any) => ({
        location_name: loc.location_name,
        location_type: loc.location_type,
        scan_count: loc.scan_count,
        conversion_count: loc.conversion_count,
        conversion_rate: loc.scan_count > 0 ? (loc.conversion_count / loc.scan_count) * 100 : 0,
        avg_rating: loc.rating_count > 0 ? loc.total_rating / loc.rating_count : 0,
        qr_variant: loc.qr_variant
      }))

      setLocationPerformance(locationPerformanceData as LocationPerformance[])

    } catch (error) {
      console.error('Error fetching location performance:', error)
    }
  }

  const fetchDailyProgress = async () => {
    try {
      const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
      const startDate = startOfDay(subDays(new Date(), periodDays))

      const { data: feedback } = await supabase
        .from('feedback')
        .select('rating, created_at')
        .gte('created_at', startDate.toISOString())
        .order('created_at')

      const { data: conversions } = await supabase
        .from('five_star_conversion_logs')
        .select('five_star_achieved_at, external_review_decision')
        .gte('five_star_achieved_at', startDate.toISOString())

      // Group by day
      const dailyData: { [key: string]: DailyProgress } = {}
      
      feedback?.forEach(f => {
        const date = format(new Date(f.created_at), 'yyyy-MM-dd')
        if (!dailyData[date]) {
          dailyData[date] = {
            date,
            rating: 0,
            feedback_count: 0,
            five_star_count: 0,
            external_reviews: 0
          }
        }
        dailyData[date].feedback_count++
        dailyData[date].rating += f.rating
        if (f.rating === 5) {
          dailyData[date].five_star_count++
        }
      })

      conversions?.forEach(c => {
        const date = format(new Date(c.five_star_achieved_at), 'yyyy-MM-dd')
        if (dailyData[date] && c.external_review_decision === 'accepted') {
          dailyData[date].external_reviews++
        }
      })

      // Calculate average ratings
      Object.values(dailyData).forEach(day => {
        if (day.feedback_count > 0) {
          day.rating = day.rating / day.feedback_count
        }
      })

      setDailyProgress(Object.values(dailyData).sort((a, b) => a.date.localeCompare(b.date)))

    } catch (error) {
      console.error('Error fetching daily progress:', error)
    }
  }

  const getRatingColor = (rating: number) => {
    if (rating >= 2.98) return 'text-green-600'
    if (rating >= 2.5) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getTrendIcon = (direction: string) => {
    switch (direction) {
      case 'up': return <TrendingUp className="h-4 w-4 text-green-600" />
      case 'down': return <TrendingDown className="h-4 w-4 text-red-600" />
      default: return <BarChart3 className="h-4 w-4 text-gray-600" />
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading performance analytics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Performance Analytics</h1>
          <p className="text-muted-foreground">
            Track progress toward 4.5-star rating goal (0.5 uplift from 4.0 baseline)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Button
            variant={selectedPeriod === '7d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('7d')}
          >
            7 Days
          </Button>
          <Button
            variant={selectedPeriod === '30d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('30d')}
          >
            30 Days
          </Button>
          <Button
            variant={selectedPeriod === '90d' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setSelectedPeriod('90d')}
          >
            90 Days
          </Button>
        </div>
      </div>

      {/* Key Metrics */}
      {metrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Current Rating</CardTitle>
              <div className="flex items-center gap-1">
                <Star className="h-4 w-4 text-yellow-500" />
                {getTrendIcon(metrics.trend_direction)}
              </div>
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getRatingColor(metrics.current_rating)}`}>
                {metrics.current_rating.toFixed(2)}
              </div>
              <div className="space-y-2">
                <Progress value={metrics.progress_percentage} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {metrics.progress_percentage.toFixed(1)}% to 2.98 goal
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">5-Star Conversion</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.external_conversion_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.five_star_count} five-star reviews
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">QR Performance</CardTitle>
              <QrCode className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metrics.qr_conversion_rate.toFixed(1)}%</div>
              <p className="text-xs text-muted-foreground">
                {metrics.qr_scan_count} total scans
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Days to Goal</CardTitle>
              <Target className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {metrics.days_to_goal > 365 ? '365+' : metrics.days_to_goal}
              </div>
              <p className="text-xs text-muted-foreground">
                At current trend
              </p>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Detailed Analytics */}
      <Tabs defaultValue="locations" className="space-y-4">
        <TabsList>
          <TabsTrigger value="locations">Location Performance</TabsTrigger>
          <TabsTrigger value="trends">Daily Trends</TabsTrigger>
          <TabsTrigger value="insights">Insights & Actions</TabsTrigger>
        </TabsList>

        <TabsContent value="locations" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>QR Code Location Performance</CardTitle>
              <CardDescription>
                Identify best and worst performing QR code placements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {locationPerformance
                  .sort((a, b) => b.conversion_rate - a.conversion_rate)
                  .map((location, index) => (
                    <div key={location.location_name} className="flex items-center justify-between p-4 border rounded-lg">
                      <div className="flex items-center gap-3">
                        <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                          index === 0 ? 'bg-green-100 text-green-800' :
                          index === locationPerformance.length - 1 ? 'bg-red-100 text-red-800' :
                          'bg-gray-100 text-gray-800'
                        }`}>
                          {index + 1}
                        </div>
                        <div>
                          <div className="font-medium">{location.location_name}</div>
                          <div className="text-sm text-muted-foreground">
                            {location.location_type} • {location.qr_variant}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="font-medium">{location.conversion_rate.toFixed(1)}%</div>
                        <div className="text-sm text-muted-foreground">
                          {location.conversion_count}/{location.scan_count} conversions
                        </div>
                        {location.avg_rating > 0 && (
                          <div className="text-sm text-muted-foreground">
                            Avg: {location.avg_rating.toFixed(1)} ⭐
                          </div>
                        )}
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="trends" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Daily Progress Tracking</CardTitle>
              <CardDescription>
                Monitor daily rating trends and feedback volume
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {dailyProgress.slice(-14).map((day) => (
                  <div key={day.date} className="flex items-center justify-between p-2 border-b">
                    <div className="text-sm">{format(new Date(day.date), 'MMM dd')}</div>
                    <div className="flex items-center gap-4 text-sm">
                      <span className={getRatingColor(day.rating)}>
                        {day.rating.toFixed(2)} ⭐
                      </span>
                      <span>{day.feedback_count} reviews</span>
                      <span className="text-green-600">{day.five_star_count} 5-star</span>
                      <span className="text-blue-600">{day.external_reviews} external</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="insights" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5 text-yellow-500" />
                Actionable Insights
              </CardTitle>
              <CardDescription>
                Recommendations to accelerate progress toward 2.98-star goal
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                  <h4 className="font-medium text-yellow-800">Low-Performing Locations</h4>
                  <p className="text-sm text-yellow-700 mt-1">
                    Consider relocating QR codes from {metrics?.worst_performing_location} to higher-traffic areas
                  </p>
                </div>
                
                <div className="p-4 bg-green-50 border border-green-200 rounded-lg">
                  <h4 className="font-medium text-green-800">High-Performing Strategy</h4>
                  <p className="text-sm text-green-700 mt-1">
                    {metrics?.best_performing_location} shows excellent results - replicate this placement strategy
                  </p>
                </div>
                
                <div className="p-4 bg-blue-50 border border-blue-200 rounded-lg">
                  <h4 className="font-medium text-blue-800">5-Star Conversion Opportunity</h4>
                  <p className="text-sm text-blue-700 mt-1">
                    {metrics && metrics.external_conversion_rate < 50 
                      ? 'Test different CTAs to improve external review conversion rate'
                      : 'Great external conversion rate - maintain current CTA strategy'
                    }
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
