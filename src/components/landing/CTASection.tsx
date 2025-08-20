import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ArrowRight, Calendar, PlayCircle } from "lucide-react"

export const CTASection = () => {
  return (
    <section className="py-16 lg:py-32 bg-background text-foreground relative overflow-hidden">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-1/4 left-1/4 w-64 h-64 bg-accent rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-64 h-64 bg-primary rounded-full blur-3xl animate-pulse" style={{ animationDelay: '2s' }}></div>
      </div>
      
      <div className="relative container mx-auto px-4 lg:px-6 text-center">
        <div className="max-w-4xl mx-auto space-y-6 lg:space-y-8">
          <Badge variant="secondary" className="mb-4 lg:mb-6">
            Ready to Transform Your Reputation?
          </Badge>
          
          <h2 className="text-4xl lg:text-6xl font-light tracking-tight mb-4 lg:mb-6">
            Start protecting your brand in
            <span className="text-primary block lg:inline lg:ml-4">60 seconds</span>
          </h2>
          
          <p className="text-lg lg:text-xl font-light text-muted-foreground max-w-2xl mx-auto leading-relaxed mb-6 lg:mb-8">
            Join leading hotels who prevent reputation crises before they happen. No setup required - experience the complete guest journey instantly.
          </p>
          
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 justify-center">
            <Link to="/quick-feedback?room=203">
              <Button size="lg" variant="outline" className="w-full lg:w-auto text-base lg:text-lg px-8 lg:px-10 py-4 lg:py-6 transition-all duration-300 group">
                <PlayCircle className="mr-2 lg:mr-3 h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-110 transition-transform" />
                Try Live Demo
                <ArrowRight className="ml-2 lg:ml-3 h-4 w-4 lg:h-5 lg:w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Button size="lg" className="w-full lg:w-auto bg-primary text-primary-foreground hover:bg-primary/90 text-base lg:text-lg px-8 lg:px-10 py-4 lg:py-6 transition-all duration-300 group">
              <Calendar className="mr-2 lg:mr-3 h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-110 transition-transform" />
              Book Demo Call
            </Button>
          </div>
          
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 lg:gap-8 mt-8 lg:mt-12 pt-6 lg:pt-8 border-t border-border/20">
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-light text-primary">60s</div>
              <div className="text-xs lg:text-sm text-muted-foreground">Setup Time</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-light text-primary">24/7</div>
              <div className="text-xs lg:text-sm text-muted-foreground">Monitoring</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-light text-primary">7+</div>
              <div className="text-xs lg:text-sm text-muted-foreground">Platforms</div>
            </div>
            <div className="text-center">
              <div className="text-2xl lg:text-3xl font-light text-primary">∞</div>
              <div className="text-xs lg:text-sm text-muted-foreground">Protection</div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}