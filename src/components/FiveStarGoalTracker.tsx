/**
 * 🎯 5-STAR GOAL TRACKER
 * 
 * Tracks progress toward 4.5-star rating goal (0.5 uplift from 4.0 baseline)
 * Shows near-misses: 5-star guests who didn't review externally on TripAdvisor
 * Target: 278 five-star external reviews over 6 months (1.55 per day)
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  Target, 
  Star, 
  TrendingUp, 
  TrendingDown, 
  Calendar,
  AlertTriangle,
  CheckCircle,
  ExternalLink,
  Users
} from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, subDays } from 'date-fns'

interface GoalMetrics {
  baseline_rating: number
  current_rating: number
  target_rating: number
  baseline_reviews: number
  current_reviews: number
  five_star_reviews_needed: number
  five_star_reviews_achieved: number
  daily_target: number
  days_remaining: number
  progress_percentage: number
  on_track_status: string
}

interface NearMissData {
  date: string
  five_star_internal_count: number
  external_review_count: number
  near_miss_count: number
  near_miss_percentage: number
  potential_rating_impact: number
}

interface DailyProgress {
  date: string
  five_star_count: number
  external_reviews: number
  cumulative_five_stars: number
  target_cumulative: number
  on_track: boolean
}

export function FiveStarGoalTracker() {
  const [goalMetrics, setGoalMetrics] = useState<GoalMetrics | null>(null)
  const [nearMisses, setNearMisses] = useState<NearMissData[]>([])
  const [dailyProgress, setDailyProgress] = useState<DailyProgress[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedPeriod, setSelectedPeriod] = useState<'7d' | '30d' | '90d'>('30d')

  useEffect(() => {
    fetchGoalMetrics()
    fetchNearMisses()
    fetchDailyProgress()
  }, [selectedPeriod])

  const fetchGoalMetrics = async () => {
    try {
      // Calculate current metrics
      const { data: reviewsNeeded } = await supabase.rpc('calculate_five_star_reviews_needed', {
        p_current_rating: 4.0,
        p_current_review_count: 139,
        p_target_rating: 4.5
      })

      // Get current five-star count
      const { data: currentFiveStars } = await supabase
        .from('five_star_conversion_logs')
        .select('id')
        .eq('external_review_decision', 'accepted')

      const fiveStarAchieved = currentFiveStars?.length || 0
      const fiveStarNeeded = reviewsNeeded || 278
      const daysRemaining = 180 // 6 months
      const dailyTarget = fiveStarNeeded / daysRemaining
      const progressPercentage = (fiveStarAchieved / fiveStarNeeded) * 100

      // Determine on-track status
      const expectedProgress = (180 - daysRemaining) * dailyTarget
      let onTrackStatus = 'on_track'
      if (fiveStarAchieved > expectedProgress * 1.1) onTrackStatus = 'ahead'
      else if (fiveStarAchieved < expectedProgress * 0.8) onTrackStatus = 'at_risk'
      else if (fiveStarAchieved < expectedProgress * 0.9) onTrackStatus = 'behind'

      setGoalMetrics({
        baseline_rating: 4.0,
        current_rating: 4.0, // This would be calculated from recent feedback
        target_rating: 4.5,
        baseline_reviews: 139,
        current_reviews: 139, // This would be updated with new reviews
        five_star_reviews_needed: fiveStarNeeded,
        five_star_reviews_achieved: fiveStarAchieved,
        daily_target: dailyTarget,
        days_remaining: daysRemaining,
        progress_percentage: progressPercentage,
        on_track_status: onTrackStatus
      })

    } catch (error) {
      console.error('Error fetching goal metrics:', error)
    }
  }

  const fetchNearMisses = async () => {
    try {
      const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90

      const { data, error } = await supabase.rpc('get_five_star_near_misses', {
        p_tenant_slug: 'eusbett',
        p_days_back: periodDays
      })

      if (error) throw error
      setNearMisses(data || [])

    } catch (error) {
      console.error('Error fetching near misses:', error)
    }
  }

  const fetchDailyProgress = async () => {
    try {
      const periodDays = selectedPeriod === '7d' ? 7 : selectedPeriod === '30d' ? 30 : 90
      
      // Generate daily progress data
      const progressData: DailyProgress[] = []
      let cumulativeFiveStars = 0
      
      for (let i = periodDays - 1; i >= 0; i--) {
        const date = format(subDays(new Date(), i), 'yyyy-MM-dd')
        const dayNumber = periodDays - i
        const targetCumulative = dayNumber * (goalMetrics?.daily_target || 1.55)
        
        // This would be replaced with actual data from the database
        const dailyFiveStars = Math.floor(Math.random() * 3) // Mock data
        const dailyExternal = Math.floor(dailyFiveStars * 0.7) // Mock 70% conversion
        
        cumulativeFiveStars += dailyExternal
        
        progressData.push({
          date,
          five_star_count: dailyFiveStars,
          external_reviews: dailyExternal,
          cumulative_five_stars: cumulativeFiveStars,
          target_cumulative: targetCumulative,
          on_track: cumulativeFiveStars >= targetCumulative * 0.9
        })
      }
      
      setDailyProgress(progressData)

    } catch (error) {
      console.error('Error fetching daily progress:', error)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ahead': return 'text-green-600'
      case 'on_track': return 'text-blue-600'
      case 'behind': return 'text-yellow-600'
      case 'at_risk': return 'text-red-600'
      default: return 'text-gray-600'
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'ahead': return <Badge className="bg-green-100 text-green-800">Ahead of Target</Badge>
      case 'on_track': return <Badge className="bg-blue-100 text-blue-800">On Track</Badge>
      case 'behind': return <Badge className="bg-yellow-100 text-yellow-800">Behind Target</Badge>
      case 'at_risk': return <Badge variant="destructive">At Risk</Badge>
      default: return <Badge variant="secondary">Unknown</Badge>
    }
  }

  if (loading) {
    return <div className="text-center py-8">Loading goal tracker...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">4.5-Star Goal Tracker</h2>
          <p className="text-muted-foreground">
            Track progress toward 0.5 uplift from 4.0 baseline (TripAdvisor comparison)
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">278 five-star reviews needed</span>
        </div>
      </div>

      {/* Goal Overview */}
      {goalMetrics && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Progress to 4.5⭐</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {goalMetrics.current_rating.toFixed(1)}⭐ → 4.5⭐
              </div>
              <div className="space-y-2">
                <Progress value={goalMetrics.progress_percentage} className="w-full" />
                <p className="text-xs text-muted-foreground">
                  {goalMetrics.progress_percentage.toFixed(1)}% complete
                </p>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">5-Star Reviews</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">
                {goalMetrics.five_star_reviews_achieved}/{goalMetrics.five_star_reviews_needed}
              </div>
              <p className="text-xs text-muted-foreground">
                {goalMetrics.five_star_reviews_needed - goalMetrics.five_star_reviews_achieved} remaining
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Daily Target</CardTitle>
              <Calendar className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{goalMetrics.daily_target.toFixed(1)}</div>
              <p className="text-xs text-muted-foreground">
                5-star reviews per day
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Status</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {getStatusBadge(goalMetrics.on_track_status)}
                <p className="text-xs text-muted-foreground">
                  {goalMetrics.days_remaining} days remaining
                </p>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Near Misses Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-yellow-500" />
            Near Misses Analysis
          </CardTitle>
          <CardDescription>
            5-star guests who didn't review externally on TripAdvisor - lost opportunities
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {nearMisses.slice(0, 7).map((day, index) => (
              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                <div className="space-y-1">
                  <div className="font-medium">{format(new Date(day.date), 'MMM dd, yyyy')}</div>
                  <div className="text-sm text-muted-foreground">
                    {day.five_star_internal_count} internal 5-star reviews
                  </div>
                </div>
                
                <div className="text-right space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="text-green-600 font-medium">
                      {day.external_review_count} external
                    </span>
                    <span className="text-red-600 font-medium">
                      {day.near_miss_count} missed
                    </span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {day.near_miss_percentage.toFixed(1)}% missed opportunity
                  </div>
                  {day.potential_rating_impact > 0 && (
                    <div className="text-xs text-red-600">
                      -{day.potential_rating_impact.toFixed(2)}⭐ potential impact
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {nearMisses.length > 0 && (
            <div className="mt-4 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
              <h4 className="font-medium text-yellow-800 mb-2">💡 Optimization Opportunity</h4>
              <p className="text-sm text-yellow-700">
                Total near misses: {nearMisses.reduce((sum, day) => sum + day.near_miss_count, 0)} guests. 
                Improving your CTA conversion rate could significantly accelerate progress toward 4.5⭐.
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Daily Progress Chart */}
      <Card>
        <CardHeader>
          <CardTitle>Daily Progress Tracking</CardTitle>
          <CardDescription>
            Track daily five-star external reviews vs target (1.55 per day)
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {dailyProgress.slice(-14).map((day, index) => (
              <div key={index} className="flex items-center justify-between p-2 border-b">
                <div className="text-sm">{format(new Date(day.date), 'MMM dd')}</div>
                <div className="flex items-center gap-4 text-sm">
                  <span className="flex items-center gap-1">
                    <Star className="h-3 w-3 text-yellow-500" />
                    {day.five_star_count} internal
                  </span>
                  <span className="flex items-center gap-1 text-green-600">
                    <ExternalLink className="h-3 w-3" />
                    {day.external_reviews} external
                  </span>
                  <span className={`font-medium ${day.on_track ? 'text-green-600' : 'text-red-600'}`}>
                    {day.on_track ? '✓' : '⚠'} {day.cumulative_five_stars}/{day.target_cumulative.toFixed(0)}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
