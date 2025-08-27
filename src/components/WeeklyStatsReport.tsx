/**
 * 📊 WEEKLY STATS REPORT COMPONENT
 * 
 * Shows manager response statistics for weekly reporting
 * Tracks acknowledgment rates, response times, and auto-closures
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Calendar, TrendingDown, TrendingUp, Clock, AlertTriangle, CheckCircle } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { format, startOfWeek, endOfWeek, subWeeks } from 'date-fns'

interface WeeklyStats {
  week_start_date: string
  total_escalations: number
  guest_relations_escalations: number
  gm_escalations: number
  auto_closures: number
  acknowledged_count: number
  resolved_count: number
  avg_response_time_minutes: number
  acknowledgment_rate: number
  resolution_rate: number
  auto_closure_rate: number
}

interface ManagerStats {
  manager_email: string
  manager_department: string
  escalation_count: number
  acknowledged_count: number
  resolved_count: number
  auto_closed_count: number
  avg_response_time: number
  acknowledgment_rate: number
}

export function WeeklyStatsReport() {
  const [weeklyStats, setWeeklyStats] = useState<WeeklyStats[]>([])
  const [managerStats, setManagerStats] = useState<ManagerStats[]>([])
  const [selectedWeek, setSelectedWeek] = useState<string>(format(startOfWeek(new Date()), 'yyyy-MM-dd'))
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchWeeklyStats()
  }, [selectedWeek])

  const fetchWeeklyStats = async () => {
    setLoading(true)
    try {
      // Fetch weekly aggregated stats
      const { data: weeklyData, error: weeklyError } = await supabase
        .rpc('get_weekly_escalation_stats', {
          p_week_start: selectedWeek,
          p_weeks_back: 4
        })

      if (weeklyError) throw weeklyError
      setWeeklyStats(weeklyData || [])

      // Fetch manager-specific stats for selected week
      const { data: managerData, error: managerError } = await supabase
        .rpc('get_manager_performance_stats', {
          p_week_start: selectedWeek
        })

      if (managerError) throw managerError
      setManagerStats(managerData || [])

    } catch (error) {
      console.error('Error fetching weekly stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const currentWeekStats = weeklyStats.find(s => s.week_start_date === selectedWeek)

  const getPerformanceColor = (rate: number) => {
    if (rate >= 90) return 'text-green-600'
    if (rate >= 70) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getPerformanceBadge = (rate: number) => {
    if (rate >= 90) return <Badge variant="default" className="bg-green-100 text-green-800">Excellent</Badge>
    if (rate >= 70) return <Badge variant="default" className="bg-yellow-100 text-yellow-800">Good</Badge>
    return <Badge variant="destructive">Needs Improvement</Badge>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">Weekly Performance Report</h2>
          <p className="text-muted-foreground">Manager response statistics and SLA compliance</p>
        </div>
        
        <div className="flex items-center gap-2">
          <Calendar className="h-4 w-4" />
          <select 
            value={selectedWeek}
            onChange={(e) => setSelectedWeek(e.target.value)}
            className="border rounded px-3 py-1"
          >
            {Array.from({ length: 8 }, (_, i) => {
              const weekStart = format(startOfWeek(subWeeks(new Date(), i)), 'yyyy-MM-dd')
              const weekEnd = format(endOfWeek(subWeeks(new Date(), i)), 'MMM dd')
              return (
                <option key={weekStart} value={weekStart}>
                  Week of {format(new Date(weekStart), 'MMM dd')} - {weekEnd}
                </option>
              )
            })}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="text-center py-8">Loading statistics...</div>
      ) : (
        <>
          {/* Current Week Overview */}
          {currentWeekStats && (
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Total Escalations</CardTitle>
                  <AlertTriangle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{currentWeekStats.total_escalations}</div>
                  <p className="text-xs text-muted-foreground">
                    {currentWeekStats.guest_relations_escalations} to Guest Relations, {currentWeekStats.gm_escalations} to GM
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Acknowledgment Rate</CardTitle>
                  <CheckCircle className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${getPerformanceColor(currentWeekStats.acknowledgment_rate)}`}>
                    {currentWeekStats.acknowledgment_rate.toFixed(1)}%
                  </div>
                  <div className="flex items-center gap-2">
                    {getPerformanceBadge(currentWeekStats.acknowledgment_rate)}
                  </div>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Avg Response Time</CardTitle>
                  <Clock className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">
                    {Math.round(currentWeekStats.avg_response_time_minutes)} min
                  </div>
                  <p className="text-xs text-muted-foreground">
                    Average time to acknowledge
                  </p>
                </CardContent>
              </Card>

              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Auto-Closures</CardTitle>
                  <TrendingDown className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{currentWeekStats.auto_closures}</div>
                  <p className="text-xs text-muted-foreground">
                    {currentWeekStats.auto_closure_rate.toFixed(1)}% of total escalations
                  </p>
                </CardContent>
              </Card>
            </div>
          )}

          {/* Manager Performance */}
          <Card>
            <CardHeader>
              <CardTitle>Manager Performance</CardTitle>
              <CardDescription>Individual manager statistics for selected week</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {managerStats.map((manager, index) => (
                  <div key={index} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="space-y-1">
                      <div className="font-medium">{manager.manager_department}</div>
                      <div className="text-sm text-muted-foreground">{manager.manager_email}</div>
                    </div>
                    
                    <div className="grid grid-cols-4 gap-4 text-center">
                      <div>
                        <div className="text-sm font-medium">{manager.escalation_count}</div>
                        <div className="text-xs text-muted-foreground">Escalations</div>
                      </div>
                      <div>
                        <div className={`text-sm font-medium ${getPerformanceColor(manager.acknowledgment_rate)}`}>
                          {manager.acknowledgment_rate.toFixed(1)}%
                        </div>
                        <div className="text-xs text-muted-foreground">Acknowledged</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium">{Math.round(manager.avg_response_time)} min</div>
                        <div className="text-xs text-muted-foreground">Avg Response</div>
                      </div>
                      <div>
                        <div className="text-sm font-medium text-red-600">{manager.auto_closed_count}</div>
                        <div className="text-xs text-muted-foreground">Auto-Closed</div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Weekly Trend */}
          <Card>
            <CardHeader>
              <CardTitle>4-Week Trend</CardTitle>
              <CardDescription>Performance over the last 4 weeks</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {weeklyStats.map((week, index) => (
                  <div key={index} className="flex items-center justify-between p-2 border-b">
                    <div className="font-medium">
                      Week of {format(new Date(week.week_start_date), 'MMM dd')}
                    </div>
                    <div className="flex items-center gap-4 text-sm">
                      <span>{week.total_escalations} escalations</span>
                      <span className={getPerformanceColor(week.acknowledgment_rate)}>
                        {week.acknowledgment_rate.toFixed(1)}% ack rate
                      </span>
                      <span className="text-red-600">{week.auto_closures} auto-closed</span>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
