import { Badge } from "@/components/ui/badge"

export const ProblemSection = () => {
  return (
    <section className="relative py-16 lg:py-32 bg-primary text-primary-foreground overflow-hidden">
      <div className="absolute inset-0 opacity-5">
        <div className="absolute inset-0 bg-gradient-to-br from-accent to-transparent"></div>
      </div>
      
      <div className="relative container mx-auto px-4 lg:px-6">
        <div className="max-w-5xl mx-auto text-center space-y-6 lg:space-y-8">
          <Badge variant="outline" className="border-primary-foreground/20 text-primary-foreground mb-4 lg:mb-8">
            The Crisis Every Hotel Faces
          </Badge>
          
          <h2 className="text-4xl lg:text-6xl font-light tracking-tight mb-4 lg:mb-8">
            <span className="text-accent">TripAdvisor checkout surveys</span>
            <br />
            <span>publish before you can respond</span>
          </h2>
          
          <p className="text-lg lg:text-xl font-light text-primary-foreground/80 max-w-3xl mx-auto leading-relaxed">
            Your guests face lengthy TripAdvisor forms at checkout that require minimum word counts. Worse yet, regardless of rating, reviews go live immediately - giving you zero opportunity to resolve issues internally first.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 lg:gap-8 mt-8 lg:mt-16">
            <div className="text-center space-y-2 lg:space-y-4">
              <div className="text-3xl lg:text-4xl font-light text-accent">78%</div>
              <p className="text-sm lg:text-base text-primary-foreground/70">of travelers avoid hotels with poor reviews</p>
            </div>
            <div className="text-center space-y-2 lg:space-y-4">
              <div className="text-3xl lg:text-4xl font-light text-accent">0 hours</div>
              <p className="text-sm lg:text-base text-primary-foreground/70">to resolve issues with TripAdvisor's instant publishing</p>
            </div>
            <div className="text-center space-y-2 lg:space-y-4">
              <div className="text-3xl lg:text-4xl font-light text-accent">$1.7K</div>
              <p className="text-sm lg:text-base text-primary-foreground/70">lost revenue per negative review</p>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}