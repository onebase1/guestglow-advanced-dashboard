import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Eye, Shield, BarChart3, CheckCircle } from "lucide-react"

export const FeaturesSection = () => {
  return (
    <section className="py-16 lg:py-32 bg-background relative overflow-hidden">
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-0 left-1/4 w-96 h-96 bg-accent/10 rounded-full blur-3xl"></div>
        <div className="absolute bottom-0 right-1/4 w-96 h-96 bg-primary/10 rounded-full blur-3xl"></div>
      </div>
      
      <div className="relative container mx-auto px-4 lg:px-6">
        <div className="text-center mb-12 lg:mb-20">
          <Badge variant="secondary" className="mb-4 lg:mb-6">
            Complete Solution
          </Badge>
          <h2 className="text-4xl lg:text-6xl font-light tracking-tight mb-4 lg:mb-8 text-primary">
            Resolve First, Review Later
          </h2>
          <p className="text-lg lg:text-xl font-light text-muted-foreground max-w-3xl mx-auto">
            Unlike TripAdvisor's instant publishing, we give you 24-48 hours to turn unhappy guests into advocates through internal resolution
          </p>
        </div>

        <div className="grid lg:grid-cols-3 gap-6 lg:gap-12">
          {/* Brand Monitoring */}
          <Card className="group relative overflow-hidden border-0 shadow-large hover:shadow-glow transition-all duration-500 bg-gradient-to-br from-card to-destructive/5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-destructive/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <CardHeader className="relative pb-4 lg:pb-6 p-4 lg:p-6">
              <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="p-3 lg:p-4 rounded-2xl bg-destructive/10 group-hover:bg-destructive/20 transition-colors shadow-soft">
                  <Eye className="h-6 w-6 lg:h-8 lg:w-8 text-destructive" />
                </div>
                <Badge variant="destructive" className="shadow-soft text-xs lg:text-sm">Crisis Prevention</Badge>
              </div>
              <CardTitle className="text-2xl lg:text-3xl font-light tracking-tight">Real-Time Brand Monitoring</CardTitle>
              <CardDescription className="text-base lg:text-lg font-light">
                AI-powered surveillance across Google, TripAdvisor, Booking.com, Hotels.com, Expedia, Yelp, and Airbnb with instant crisis alerts.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative p-4 lg:p-6 pt-0">
              <div className="space-y-3 lg:space-y-4">
                {[
                  "24/7 automated platform scanning",
                  "Instant management alerts",
                  "AI sentiment analysis",
                  "Priority crisis scoring"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 group-hover:translate-x-1 lg:group-hover:translate-x-2 transition-transform duration-300" style={{ transitionDelay: `${index * 50}ms` }}>
                    <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-success flex-shrink-0" />
                    <span className="font-light text-sm lg:text-base">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Smart Feedback */}
          <Card className="group relative overflow-hidden border-0 shadow-large hover:shadow-glow transition-all duration-500 bg-gradient-to-br from-card to-primary/5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-primary/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <CardHeader className="relative pb-4 lg:pb-6 p-4 lg:p-6">
              <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="p-3 lg:p-4 rounded-2xl bg-primary/10 group-hover:bg-primary/20 transition-colors shadow-soft">
                  <Shield className="h-6 w-6 lg:h-8 lg:w-8 text-primary" />
                </div>
                <Badge variant="secondary" className="shadow-soft text-xs lg:text-sm">Smart Routing</Badge>
              </div>
              <CardTitle className="text-2xl lg:text-3xl font-light tracking-tight">Intelligent Feedback System</CardTitle>
              <CardDescription className="text-base lg:text-lg font-light">
                QR-powered collection with smart routing: negative feedback stays internal for resolution, positive reviews amplify your reputation.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative p-4 lg:p-6 pt-0">
              <div className="space-y-3 lg:space-y-4">
                {[
                  "QR instant feedback collection",
                  "Automatic issue categorization", 
                  "Smart staff routing",
                  "Public review amplification"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 group-hover:translate-x-1 lg:group-hover:translate-x-2 transition-transform duration-300" style={{ transitionDelay: `${index * 50}ms` }}>
                    <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-success flex-shrink-0" />
                    <span className="font-light text-sm lg:text-base">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Analytics */}
          <Card className="group relative overflow-hidden border-0 shadow-large hover:shadow-glow transition-all duration-500 bg-gradient-to-br from-card to-success/5">
            <div className="absolute inset-0 bg-gradient-to-br from-transparent to-success/5 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
            
            <CardHeader className="relative pb-4 lg:pb-6 p-4 lg:p-6">
              <div className="flex items-center gap-3 lg:gap-4 mb-4 lg:mb-6">
                <div className="p-3 lg:p-4 rounded-2xl bg-success/10 group-hover:bg-success/20 transition-colors shadow-soft">
                  <BarChart3 className="h-6 w-6 lg:h-8 lg:w-8 text-success" />
                </div>
                <Badge variant="outline" className="border-success text-success shadow-soft text-xs lg:text-sm">AI Intelligence</Badge>
              </div>
              <CardTitle className="text-2xl lg:text-3xl font-light tracking-tight">Predictive Analytics</CardTitle>
              <CardDescription className="text-base lg:text-lg font-light">
                GPT-4 powered insights with predictive modeling, competitive benchmarking, and ROI-focused recommendations.
              </CardDescription>
            </CardHeader>
            
            <CardContent className="relative p-4 lg:p-6 pt-0">
              <div className="space-y-3 lg:space-y-4">
                {[
                  "Real-time performance metrics",
                  "Predictive satisfaction trends",
                  "Competitive market analysis",
                  "Revenue impact tracking"
                ].map((feature, index) => (
                  <div key={index} className="flex items-center gap-3 group-hover:translate-x-1 lg:group-hover:translate-x-2 transition-transform duration-300" style={{ transitionDelay: `${index * 50}ms` }}>
                    <CheckCircle className="h-4 w-4 lg:h-5 lg:w-5 text-success flex-shrink-0" />
                    <span className="font-light text-sm lg:text-base">{feature}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  )
}