import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Brain, TrendingUp, AlertTriangle, Lightbulb, Sparkles } from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface AIInsights {
  key_trends: string[]
  priority_areas: string[]
  positive_highlights: string[]
  actionable_recommendations: string[]
  risk_assessment: string[]
  improvement_opportunities: string[]
  guest_satisfaction_insights: string[]
  competitive_advantages: string[]
}

export function AIInsights() {
  const [insights, setInsights] = useState<AIInsights | null>(null)
  const [loading, setLoading] = useState(false)
  const [lastGenerated, setLastGenerated] = useState<string | null>(null)
  const { toast } = useToast()

  const generateInsights = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase.functions.invoke('ai-insights-generator')
      
      if (error) throw error
      
      setInsights(data.insights)
      setLastGenerated(data.generated_at)
      
      toast({
        title: "AI Insights Generated",
        description: `Analysis complete with ${data.data_points} data points`
      })
    } catch (error) {
      // Error generating insights - show fallback content
      toast({
        title: "Error generating insights",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  useEffect(() => {
    generateInsights()
  }, [])

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Brain className="h-5 w-5 text-primary" />
            <CardTitle>AI Strategic Insights</CardTitle>
          </div>
          <Button 
            onClick={generateInsights} 
            disabled={loading}
            size="sm"
            variant="outline"
          >
            <Sparkles className="h-4 w-4 mr-2" />
            {loading ? "Analyzing..." : "Refresh Insights"}
          </Button>
        </div>
        <CardDescription>
          AI-powered analysis of guest feedback patterns and business opportunities
          {lastGenerated && (
            <span className="block text-xs text-muted-foreground mt-1">
              Last updated: {new Date(lastGenerated).toLocaleString()}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <CardContent>
        {insights ? (
          <Tabs defaultValue="trends" className="w-full">
            <TabsList className="grid w-full grid-cols-4">
              <TabsTrigger value="trends">Trends</TabsTrigger>
              <TabsTrigger value="actions">Actions</TabsTrigger>
              <TabsTrigger value="risks">Risks</TabsTrigger>
              <TabsTrigger value="opportunities">Growth</TabsTrigger>
            </TabsList>
            
            <TabsContent value="trends" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <TrendingUp className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Key Trends</h4>
                </div>
                {insights.key_trends.map((trend, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">{trend}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold text-success">Positive Highlights</h4>
                {insights.positive_highlights.map((highlight, index) => (
                  <Badge key={index} variant="secondary" className="mr-2 mb-2">
                    {highlight}
                  </Badge>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="actions" className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-warning">Priority Areas</h4>
                {insights.priority_areas.map((area, index) => (
                  <div key={index} className="p-3 bg-warning/10 border-l-4 border-warning rounded">
                    <p className="text-sm font-medium">{area}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <Lightbulb className="h-4 w-4 text-primary" />
                  <h4 className="font-semibold">Actionable Recommendations</h4>
                </div>
                {insights.actionable_recommendations.map((rec, index) => (
                  <div key={index} className="p-3 bg-primary/5 border border-primary/20 rounded-lg">
                    <p className="text-sm">{rec}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="risks" className="space-y-4">
              <div className="space-y-3">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <h4 className="font-semibold">Risk Assessment</h4>
                </div>
                {insights.risk_assessment.map((risk, index) => (
                  <div key={index} className="p-3 bg-destructive/10 border-l-4 border-destructive rounded">
                    <p className="text-sm">{risk}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Guest Satisfaction Insights</h4>
                {insights.guest_satisfaction_insights.map((insight, index) => (
                  <div key={index} className="p-3 bg-muted/50 rounded-lg">
                    <p className="text-sm">{insight}</p>
                  </div>
                ))}
              </div>
            </TabsContent>

            <TabsContent value="opportunities" className="space-y-4">
              <div className="space-y-3">
                <h4 className="font-semibold text-success">Improvement Opportunities</h4>
                {insights.improvement_opportunities.map((opp, index) => (
                  <div key={index} className="p-3 bg-success/10 border-l-4 border-success rounded">
                    <p className="text-sm">{opp}</p>
                  </div>
                ))}
              </div>

              <div className="space-y-3">
                <h4 className="font-semibold">Competitive Advantages</h4>
                {insights.competitive_advantages.map((advantage, index) => (
                  <Badge key={index} variant="outline" className="mr-2 mb-2 border-success text-success">
                    {advantage}
                  </Badge>
                ))}
              </div>
            </TabsContent>
          </Tabs>
        ) : (
          <div className="text-center py-8">
            <p className="text-muted-foreground">
              {loading ? "Generating AI insights..." : "Click 'Refresh Insights' to analyze your feedback data"}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  )
}