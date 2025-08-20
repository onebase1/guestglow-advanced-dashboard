import { Card, CardContent } from "@/components/ui/card"
import { Users, Star, Building2, Clock } from "lucide-react"

export const DemoExpectations = () => {
  return (
    <div className="space-y-8">
      {/* Response Time */}
      <Card className="glass-effect border-0 shadow-medium">
        <CardContent className="p-8">
          <h3 className="text-xl font-semibold text-foreground mb-6">Quick Response</h3>
          <div className="flex items-center gap-4">
            <div className="p-3 rounded-xl bg-success/10">
              <Clock className="h-5 w-5 text-success" />
            </div>
            <div>
              <p className="font-medium text-foreground">Response Time</p>
              <p className="text-muted-foreground">Within 24 hours</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Demo Benefits */}
      <Card className="glass-effect border-0 shadow-medium">
        <CardContent className="p-8">
          <h3 className="text-xl font-semibold text-foreground mb-6">What to Expect</h3>
          <div className="space-y-4">
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-primary/10 mt-1">
                <Users className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="font-medium text-foreground">Personalized Walkthrough</p>
                <p className="text-sm text-muted-foreground">30-minute demo tailored to your property</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-accent/10 mt-1">
                <Star className="h-4 w-4 text-accent" />
              </div>
              <div>
                <p className="font-medium text-foreground">Custom ROI Analysis</p>
                <p className="text-sm text-muted-foreground">See potential revenue impact for your hotel</p>
              </div>
            </div>
            <div className="flex items-start gap-4">
              <div className="p-2 rounded-lg bg-success/10 mt-1">
                <Building2 className="h-4 w-4 text-success" />
              </div>
              <div>
                <p className="font-medium text-foreground">Implementation Roadmap</p>
                <p className="text-sm text-muted-foreground">Step-by-step plan for your setup</p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}