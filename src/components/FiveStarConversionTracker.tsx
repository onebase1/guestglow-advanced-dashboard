/**
 * ⭐ 5-STAR CONVERSION TRACKER
 * 
 * Tracks and optimizes 5-star guest conversion to external reviews
 * Critical for achieving 2.98-star rating goal through external review optimization
 */

import { useState, useEffect } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Progress } from '@/components/ui/progress'
import { Star, ExternalLink, TrendingUp, Users, Target, MessageSquare } from 'lucide-react'
import { supabase } from '@/lib/supabase'

interface ConversionStats {
  total_five_stars: number
  external_review_prompts: number
  accepted_reviews: number
  declined_reviews: number
  ignored_prompts: number
  conversion_rate: number
  best_performing_cta: string
  best_cta_rate: number
}

interface CTAVariant {
  id: string
  text: string
  button_text: string
  description: string
  conversion_rate: number
  usage_count: number
}

const CTA_VARIANTS: CTAVariant[] = [
  {
    id: 'help_travelers',
    text: 'Help other travelers discover our amazing service!',
    button_text: "Yes, I'll help!",
    description: 'Appeals to helping others',
    conversion_rate: 0,
    usage_count: 0
  },
  {
    id: 'share_experience',
    text: 'Share your wonderful experience with the world!',
    button_text: 'Share my review',
    description: 'Focuses on sharing positive experience',
    conversion_rate: 0,
    usage_count: 0
  },
  {
    id: 'spread_joy',
    text: 'Spread the joy - let others know about your great stay!',
    button_text: 'Spread the joy!',
    description: 'Emotional appeal with joy',
    conversion_rate: 0,
    usage_count: 0
  },
  {
    id: 'quick_review',
    text: 'Quick 2-minute review to help future guests?',
    button_text: 'Quick review',
    description: 'Emphasizes speed and ease',
    conversion_rate: 0,
    usage_count: 0
  },
  {
    id: 'exclusive_invite',
    text: 'You\'re invited to share your 5-star experience!',
    button_text: 'Accept invitation',
    description: 'Makes it feel exclusive',
    conversion_rate: 0,
    usage_count: 0
  }
]

export function FiveStarConversionTracker() {
  const [stats, setStats] = useState<ConversionStats | null>(null)
  const [ctaVariants, setCTAVariants] = useState<CTAVariant[]>(CTA_VARIANTS)
  const [selectedCTA, setSelectedCTA] = useState<string>('help_travelers')
  const [loading, setLoading] = useState(true)
  const [testMode, setTestMode] = useState(false)

  useEffect(() => {
    fetchConversionStats()
    fetchCTAPerformance()
  }, [])

  const fetchConversionStats = async () => {
    try {
      const { data, error } = await supabase
        .from('five_star_conversion_logs')
        .select(`
          *,
          feedback!inner(rating, tenant_id)
        `)
        .eq('feedback.tenant_id', 'eusbett-tenant-id') // Replace with actual tenant ID
        .gte('five_star_achieved_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

      if (error) throw error

      // Calculate stats
      const totalFiveStars = data?.length || 0
      const promptsShown = data?.filter(d => d.external_review_prompt_shown_at).length || 0
      const accepted = data?.filter(d => d.external_review_decision === 'accepted').length || 0
      const declined = data?.filter(d => d.external_review_decision === 'declined').length || 0
      const ignored = data?.filter(d => d.external_review_decision === null && d.external_review_prompt_shown_at).length || 0

      const conversionRate = promptsShown > 0 ? (accepted / promptsShown) * 100 : 0

      // Find best performing CTA
      const ctaPerformance = data?.reduce((acc: any, curr) => {
        if (curr.cta_variant && curr.external_review_decision === 'accepted') {
          acc[curr.cta_variant] = (acc[curr.cta_variant] || 0) + 1
        }
        return acc
      }, {})

      const bestCTA = Object.entries(ctaPerformance || {})
        .sort(([,a], [,b]) => (b as number) - (a as number))[0]

      setStats({
        total_five_stars: totalFiveStars,
        external_review_prompts: promptsShown,
        accepted_reviews: accepted,
        declined_reviews: declined,
        ignored_prompts: ignored,
        conversion_rate: conversionRate,
        best_performing_cta: bestCTA?.[0] || 'help_travelers',
        best_cta_rate: bestCTA ? ((bestCTA[1] as number) / promptsShown) * 100 : 0
      })

    } catch (error) {
      console.error('Error fetching conversion stats:', error)
    } finally {
      setLoading(false)
    }
  }

  const fetchCTAPerformance = async () => {
    try {
      const { data, error } = await supabase
        .from('five_star_conversion_logs')
        .select('cta_variant, external_review_decision')
        .not('cta_variant', 'is', null)
        .gte('five_star_achieved_at', new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString())

      if (error) throw error

      // Calculate performance for each CTA variant
      const performance = data?.reduce((acc: any, curr) => {
        const variant = curr.cta_variant
        if (!acc[variant]) {
          acc[variant] = { total: 0, accepted: 0 }
        }
        acc[variant].total++
        if (curr.external_review_decision === 'accepted') {
          acc[variant].accepted++
        }
        return acc
      }, {})

      // Update CTA variants with performance data
      const updatedVariants = ctaVariants.map(variant => ({
        ...variant,
        usage_count: performance?.[variant.id]?.total || 0,
        conversion_rate: performance?.[variant.id]?.total > 0 
          ? (performance[variant.id].accepted / performance[variant.id].total) * 100 
          : 0
      }))

      setCTAVariants(updatedVariants)

    } catch (error) {
      console.error('Error fetching CTA performance:', error)
    }
  }

  const testCTAVariant = async (variantId: string) => {
    setTestMode(true)
    try {
      // Simulate a 5-star conversion test
      const { error } = await supabase
        .from('five_star_conversion_logs')
        .insert({
          tenant_id: 'eusbett-tenant-id', // Replace with actual tenant ID
          feedback_id: 'test-feedback-id',
          session_id: 'test-session-id',
          cta_variant: variantId,
          cta_text: ctaVariants.find(v => v.id === variantId)?.text,
          button_text: ctaVariants.find(v => v.id === variantId)?.button_text,
          test_group: 'test',
          external_review_decision: 'test'
        })

      if (error) throw error

      // Refresh stats
      await fetchConversionStats()
      await fetchCTAPerformance()

    } catch (error) {
      console.error('Error testing CTA variant:', error)
    } finally {
      setTestMode(false)
    }
  }

  const getConversionColor = (rate: number) => {
    if (rate >= 70) return 'text-green-600'
    if (rate >= 50) return 'text-yellow-600'
    return 'text-red-600'
  }

  const getConversionBadge = (rate: number) => {
    if (rate >= 70) return <Badge className="bg-green-100 text-green-800">Excellent</Badge>
    if (rate >= 50) return <Badge className="bg-yellow-100 text-yellow-800">Good</Badge>
    return <Badge variant="destructive">Needs Improvement</Badge>
  }

  if (loading) {
    return <div className="text-center py-8">Loading conversion statistics...</div>
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">5-Star Conversion Optimization</h2>
          <p className="text-muted-foreground">
            Track and optimize external review conversion rates to achieve 2.98-star goal
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Target className="h-5 w-5 text-blue-600" />
          <span className="text-sm font-medium">Goal: 2.98 ⭐</span>
        </div>
      </div>

      {/* Conversion Overview */}
      {stats && (
        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">5-Star Reviews</CardTitle>
              <Star className="h-4 w-4 text-yellow-500" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total_five_stars}</div>
              <p className="text-xs text-muted-foreground">Last 30 days</p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Conversion Rate</CardTitle>
              <TrendingUp className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className={`text-2xl font-bold ${getConversionColor(stats.conversion_rate)}`}>
                {stats.conversion_rate.toFixed(1)}%
              </div>
              <div className="flex items-center gap-2 mt-1">
                {getConversionBadge(stats.conversion_rate)}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">External Reviews</CardTitle>
              <ExternalLink className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-green-600">{stats.accepted_reviews}</div>
              <p className="text-xs text-muted-foreground">
                {stats.declined_reviews} declined, {stats.ignored_prompts} ignored
              </p>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium">Best CTA</CardTitle>
              <MessageSquare className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-sm font-medium">{stats.best_performing_cta.replace('_', ' ')}</div>
              <div className="text-lg font-bold text-green-600">{stats.best_cta_rate.toFixed(1)}%</div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* CTA Variants Testing */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TestTube className="h-5 w-5" />
            Call-to-Action A/B Testing
          </CardTitle>
          <CardDescription>
            Test different CTAs to optimize 5-star guest conversion to external reviews
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {ctaVariants
              .sort((a, b) => b.conversion_rate - a.conversion_rate)
              .map((variant) => (
                <div key={variant.id} className="flex items-center justify-between p-4 border rounded-lg">
                  <div className="space-y-1 flex-1">
                    <div className="flex items-center gap-2">
                      <h4 className="font-medium">{variant.text}</h4>
                      {variant.id === stats?.best_performing_cta && (
                        <Badge className="bg-green-100 text-green-800">Best</Badge>
                      )}
                    </div>
                    <p className="text-sm text-muted-foreground">{variant.description}</p>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground">
                      <span>Button: "{variant.button_text}"</span>
                      <span>Used: {variant.usage_count} times</span>
                      <span className={getConversionColor(variant.conversion_rate)}>
                        {variant.conversion_rate.toFixed(1)}% conversion
                      </span>
                    </div>
                    {variant.usage_count > 0 && (
                      <Progress value={variant.conversion_rate} className="w-full h-2" />
                    )}
                  </div>
                  <div className="ml-4">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => testCTAVariant(variant.id)}
                      disabled={testMode}
                    >
                      Test
                    </Button>
                  </div>
                </div>
              ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
