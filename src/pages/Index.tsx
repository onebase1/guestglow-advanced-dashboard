import { HeroSection } from "@/components/landing/HeroSection"
import { ProblemSection } from "@/components/landing/ProblemSection"
import { FeaturesSection } from "@/components/landing/FeaturesSection"
import { ContactSection } from "@/components/landing/ContactSection"
import { CTASection } from "@/components/landing/CTASection"
import { Footer } from "@/components/Footer"

const Index = () => {
  
  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <HeroSection />
      <ProblemSection />
      <FeaturesSection />
      <ContactSection />
      <CTASection />
      <Footer />
    </div>
  )
}

export default Index