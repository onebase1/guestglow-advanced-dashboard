import { Link } from "react-router-dom"
import { useTenantBranding } from "@/hooks/useTenantBranding"

export const Footer = () => {
  const branding = useTenantBranding()
  return (
    <footer className="bg-primary text-primary-foreground border-t border-primary-foreground/10">
      <div className="container mx-auto px-4 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          
          {/* Brand section */}
          <div className="col-span-1 md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <img
                src={branding.logoUrl}
                alt={`${branding.name} Logo`}
                className="h-8 w-auto"
              />
            </div>
            <p className="text-sm text-primary-foreground/70 max-w-md leading-relaxed">
              {branding.isEusbett
                ? "Premium hospitality experience management for Eusbett Hotel. Delivering exceptional guest satisfaction through innovative feedback solutions."
                : "Enterprise-grade guest experience management trusted by leading hospitality brands worldwide. Transform feedback into competitive advantage."
              }
            </p>
            <div className="flex items-center gap-4 text-xs text-primary-foreground/50">
              <span>© 2024 {branding.isEusbett ? branding.name : 'GuestGlow'}</span>
              <span>•</span>
              <span>{branding.isEusbett ? 'Premium Service' : 'Enterprise Solutions'}</span>
            </div>
          </div>

          {/* Product links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-primary-foreground">Product</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><Link to="/quick-feedback" className="hover:text-primary-foreground transition-colors">Guest Feedback</Link></li>
              <li><Link to="/auth" className="hover:text-primary-foreground transition-colors">Dashboard</Link></li>
              <li><Link to="/#features" className="hover:text-primary-foreground transition-colors">Features</Link></li>
              <li><Link to="/marketing" className="hover:text-primary-foreground transition-colors">Marketing Assets</Link></li>
            </ul>
          </div>

          {/* Support links */}
          <div className="space-y-4">
            <h3 className="text-sm font-medium text-primary-foreground">Enterprise</h3>
            <ul className="space-y-2 text-sm text-primary-foreground/70">
              <li><span className="hover:text-primary-foreground transition-colors cursor-pointer">24/7 Support</span></li>
              <li><span className="hover:text-primary-foreground transition-colors cursor-pointer">Custom Integration</span></li>
              <li><span className="hover:text-primary-foreground transition-colors cursor-pointer">White Label</span></li>
              <li><span className="hover:text-primary-foreground transition-colors cursor-pointer">API Access</span></li>
            </ul>
          </div>
        </div>

        {/* Bottom bar */}
        <div className="border-t border-primary-foreground/20 mt-8 pt-6 flex flex-col md:flex-row justify-between items-center text-xs text-primary-foreground/60">
          <div className="flex items-center gap-4">
            <span>Trusted by Marriott, Ibis Styles & leading hotel chains</span>
          </div>
          <div className="flex items-center gap-4 mt-4 md:mt-0">
            <Link to="/privacy" className="hover:text-primary-foreground transition-colors">Privacy Policy</Link>
            <Link to="/terms" className="hover:text-primary-foreground transition-colors">Terms of Service</Link>
            <Link to="/security" className="hover:text-primary-foreground transition-colors">Security</Link>
            <a href="mailto:support@guestglow.com" className="hover:text-primary-foreground transition-colors" aria-label="Contact support at support@guestglow.com">support@guestglow.com</a>
          </div>
        </div>
      </div>
    </footer>
  )
}