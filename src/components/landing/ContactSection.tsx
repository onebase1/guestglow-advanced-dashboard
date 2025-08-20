import { Building2 } from "lucide-react"
import { ContactForm } from "./ContactForm"
import { DemoExpectations } from "./DemoExpectations"

export const ContactSection = () => {
  return (
    <section id="contact" className="py-20 lg:py-32 bg-primary text-primary-foreground">
      <div className="container mx-auto px-4 lg:px-6">
        <div className="max-w-6xl mx-auto">
          
          {/* Header */}
          <div className="text-center mb-16 lg:mb-20">
            <div className="inline-flex items-center gap-2 glass-effect px-6 py-3 rounded-full border-0 shadow-medium mb-8 bg-primary-foreground/10">
              <Building2 className="h-5 w-5 text-accent" />
              <span className="text-sm font-medium text-primary-foreground">Enterprise Demo Request</span>
            </div>
            <h2 className="text-4xl lg:text-6xl font-light tracking-tighter mb-6">
              <span className="text-accent">Ready to protect</span>
              <br />
              <span className="text-primary-foreground">your hotel's reputation?</span>
            </h2>
            <p className="text-lg lg:text-xl text-primary-foreground/80 max-w-3xl mx-auto leading-relaxed">
              Experience how enterprise hotels like Marriott and Ibis Styles prevent reputation crises before they happen. Book your personalized demonstration today.
            </p>
          </div>

          <div className="grid lg:grid-cols-2 gap-12 lg:gap-16">
            
            {/* Enterprise Contact Form */}
            <ContactForm />

            {/* Demo Benefits & Expectations */}
            <DemoExpectations />
          </div>
        </div>
      </div>
    </section>
  )
}