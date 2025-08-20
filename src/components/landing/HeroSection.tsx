import { Link } from "react-router-dom"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { 
  PlayCircle,
  ArrowRight,
  BarChart3,
  Sparkles,
  Eye,
  Clock,
  Shield,
  AlertTriangle
} from "lucide-react"
import heroImage from "@/assets/hero-hotel.jpg"

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background with sophisticated overlay */}
      <div className="absolute inset-0">
        <img 
          src={heroImage} 
          alt="Luxury hotel" 
          className="w-full h-full object-cover scale-105"
        />
        <div className="absolute inset-0 bg-gradient-hero opacity-90" />
        <div className="absolute inset-0 bg-gradient-to-t from-background/20 via-transparent to-background/10" />
      </div>
      
      {/* Floating particles effect */}
      <div className="absolute inset-0 opacity-30">
        <div className="absolute top-1/4 left-1/4 w-2 h-2 bg-accent rounded-full animate-float" />
        <div className="absolute top-3/4 right-1/4 w-1 h-1 bg-primary rounded-full animate-float" style={{ animationDelay: '2s' }} />
        <div className="absolute top-1/2 left-3/4 w-1.5 h-1.5 bg-accent rounded-full animate-float" style={{ animationDelay: '4s' }} />
      </div>

      {/* Content */}
      <div className="relative z-10 container mx-auto px-4 lg:px-6 text-center">
        <div className="max-w-6xl mx-auto space-y-8 lg:space-y-12 animate-fade-in">
          
          {/* Premium badge */}
          <div className="inline-flex items-center gap-2 glass-effect px-4 lg:px-6 py-3 rounded-full border-0 shadow-glow">
            <Sparkles className="h-4 w-4 text-accent" />
            <span className="text-xs lg:text-sm font-medium text-foreground">Enterprise-Grade Reputation Management</span>
            <Eye className="h-4 w-4 text-accent" />
          </div>

          {/* Logo and headline */}
          <div className="space-y-6 lg:space-y-8">
            <h1 className="text-6xl lg:text-8xl xl:text-9xl font-light tracking-tighter">
              <span className="text-white">Guest</span>
              <span className="text-yellow-500">Glow</span>
            </h1>
            <p className="text-lg lg:text-2xl xl:text-3xl font-light text-primary-foreground/90 max-w-4xl mx-auto leading-relaxed px-4">
              Save 40+ hours monthly while increasing your hotel ratings by 0.8 stars through AI-powered reputation management
            </p>
          </div>
          
          {/* Key metrics */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 lg:gap-8 mt-8 lg:mt-16 px-4">
            <div className="glass-effect rounded-2xl p-4 lg:p-8 border-0 shadow-medium hover:shadow-glow transition-all duration-500 group">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="p-2 lg:p-3 rounded-xl bg-accent/20 group-hover:bg-accent/30 transition-colors">
                  <Clock className="h-5 w-5 lg:h-6 lg:w-6 text-accent" />
                </div>
                <div className="text-left">
                  <div className="text-2xl lg:text-3xl font-light text-primary-foreground">40+</div>
                  <div className="text-xs lg:text-sm text-primary-foreground/70">Hours Saved Monthly</div>
                </div>
              </div>
            </div>
            
            <div className="glass-effect rounded-2xl p-4 lg:p-8 border-0 shadow-medium hover:shadow-glow transition-all duration-500 group">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="p-2 lg:p-3 rounded-xl bg-success/20 group-hover:bg-success/30 transition-colors">
                  <Shield className="h-5 w-5 lg:h-6 lg:w-6 text-success" />
                </div>
                <div className="text-left">
                  <div className="text-2xl lg:text-3xl font-light text-primary-foreground">+0.8</div>
                  <div className="text-xs lg:text-sm text-primary-foreground/70">Star Rating Increase</div>
                </div>
              </div>
            </div>
            
            <div className="glass-effect rounded-2xl p-4 lg:p-8 border-0 shadow-medium hover:shadow-glow transition-all duration-500 group">
              <div className="flex items-center gap-3 lg:gap-4">
                <div className="p-2 lg:p-3 rounded-xl bg-destructive/20 group-hover:bg-destructive/30 transition-colors">
                  <AlertTriangle className="h-5 w-5 lg:h-6 lg:w-6 text-destructive" />
                </div>
                <div className="text-left">
                  <div className="text-2xl lg:text-3xl font-light text-primary-foreground">92%</div>
                  <div className="text-xs lg:text-sm text-primary-foreground/70">Guest Satisfaction Rate</div>
                </div>
              </div>
            </div>
          </div>
          
          {/* CTA Buttons */}
          <div className="flex flex-col lg:flex-row gap-4 lg:gap-6 justify-center pt-4 lg:pt-8 px-4">
            <Link to="/quick-feedback?room=203">
              <Button size="lg" className="w-full lg:w-auto group relative overflow-hidden bg-gradient-primary border-0 shadow-large hover:shadow-glow text-base lg:text-lg px-8 lg:px-10 py-4 lg:py-6 transition-all duration-300">
                <PlayCircle className="mr-2 lg:mr-3 h-5 w-5 lg:h-6 lg:w-6 group-hover:scale-110 transition-transform" />
                Experience Live Demo
                <ArrowRight className="ml-2 lg:ml-3 h-4 w-4 lg:h-5 lg:w-5 group-hover:translate-x-1 transition-transform" />
              </Button>
            </Link>
            
            <Link to="/auth">
              <Button 
                size="lg" 
                variant="outline" 
                className="w-full lg:w-auto glass-effect border-white/30 text-white bg-white/10 hover:bg-white/20 hover:text-white text-base lg:text-lg px-8 lg:px-10 py-4 lg:py-6 transition-all duration-300"
              >
                <BarChart3 className="mr-2 lg:mr-3 h-5 w-5 lg:h-6 lg:w-6" />
                View Dashboard
              </Button>
            </Link>
          </div>
          
          <p className="text-primary-foreground/60 text-xs lg:text-sm px-4">
            No registration required • Experience complete guest journey in 60 seconds
          </p>
        </div>
      </div>

      {/* Scroll indicator */}
      <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 animate-bounce hidden lg:block">
        <div className="w-6 h-10 border-2 border-primary-foreground/30 rounded-full flex justify-center">
          <div className="w-1 h-3 bg-primary-foreground/50 rounded-full mt-2 animate-pulse"></div>
        </div>
      </div>
    </section>
  )
}