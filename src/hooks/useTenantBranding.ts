import { useEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DEFAULT_TENANT } from '@/utils/tenant'

interface TenantBranding {
  name: string
  logoUrl: string
  primaryColor: string
  secondaryColor: string
  accentColor: string
  isEusbett: boolean
}

const EUSBETT_BRANDING: TenantBranding = {
  name: 'Eusbett Hotel',
  logoUrl: '/eusbett-logo.svg',
  primaryColor: '#003D7A', // Navy blue
  secondaryColor: '#E74C3C', // Red
  accentColor: '#00B4E6', // Cyan
  isEusbett: true
}

// Convert hex to HSL for Tailwind compatibility
const hexToHsl = (hex: string): string => {
  const r = parseInt(hex.slice(1, 3), 16) / 255
  const g = parseInt(hex.slice(3, 5), 16) / 255
  const b = parseInt(hex.slice(5, 7), 16) / 255

  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  let h = 0, s = 0, l = (max + min) / 2

  if (max !== min) {
    const d = max - min
    s = l > 0.5 ? d / (2 - max - min) : d / (max + min)
    switch (max) {
      case r: h = (g - b) / d + (g < b ? 6 : 0); break
      case g: h = (b - r) / d + 2; break
      case b: h = (r - g) / d + 4; break
    }
    h /= 6
  }

  return `${Math.round(h * 360)} ${Math.round(s * 100)}% ${Math.round(l * 100)}%`
}

const GUESTGLOW_BRANDING: TenantBranding = {
  name: 'GuestGlow',
  logoUrl: '/lovable-uploads/c2a80098-fa71-470e-9d1e-eec01217f25a.png',
  primaryColor: '#0B57A3',
  secondaryColor: '#E52B2D',
  accentColor: '#00B4E6',
  isEusbett: false
}

export function useTenantBranding(): TenantBranding {
  const location = useLocation()
  const [branding, setBranding] = useState<TenantBranding>(GUESTGLOW_BRANDING)

  useEffect(() => {
    const pathSegments = location.pathname.split('/').filter(Boolean)
    const tenantSlug = pathSegments[0]

    // Check if we're on an Eusbett route
    const isEusbettRoute = tenantSlug === 'eusbett'
    
    if (isEusbettRoute) {
      setBranding(EUSBETT_BRANDING)

      // Apply CSS custom properties for Eusbett branding (HSL format for Tailwind)
      const root = document.documentElement
      const body = document.body

      // Set HSL values for Tailwind compatibility
      root.style.setProperty('--primary', hexToHsl(EUSBETT_BRANDING.primaryColor))
      root.style.setProperty('--secondary', hexToHsl(EUSBETT_BRANDING.secondaryColor))
      root.style.setProperty('--accent', hexToHsl(EUSBETT_BRANDING.accentColor))

      // Set hex values for direct CSS usage
      root.style.setProperty('--tenant-primary', EUSBETT_BRANDING.primaryColor)
      root.style.setProperty('--tenant-secondary', EUSBETT_BRANDING.secondaryColor)
      root.style.setProperty('--tenant-accent', EUSBETT_BRANDING.accentColor)

      // Set body data attribute for CSS selectors
      body.setAttribute('data-tenant', 'eusbett')
      
      // Update page title
      if (location.pathname.includes('dashboard')) {
        document.title = 'Eusbett Hotel - Management Dashboard'
      } else if (location.pathname.includes('qr-studio')) {
        document.title = 'Eusbett Hotel - QR Studio'
      } else if (location.pathname.includes('quick-feedback')) {
        document.title = 'Eusbett Hotel - Quick Feedback'
      }
      
      // Update favicon
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = '/eusbett-logo.svg'
      }
      
    } else {
      setBranding(GUESTGLOW_BRANDING)

      // Reset to GuestGlow branding (restore original Tailwind values)
      const root = document.documentElement
      const body = document.body

      // Reset to original Tailwind HSL values
      root.style.setProperty('--primary', '240 38% 20%') // Original primary
      root.style.setProperty('--secondary', '240 5% 96%') // Original secondary
      root.style.setProperty('--accent', '42 95% 55%') // Original accent

      // Reset hex values
      root.style.setProperty('--tenant-primary', GUESTGLOW_BRANDING.primaryColor)
      root.style.setProperty('--tenant-secondary', GUESTGLOW_BRANDING.secondaryColor)
      root.style.setProperty('--tenant-accent', GUESTGLOW_BRANDING.accentColor)

      // Remove body data attribute
      body.removeAttribute('data-tenant')

      // Reset favicon
      const favicon = document.querySelector('link[rel="icon"]') as HTMLLinkElement
      if (favicon) {
        favicon.href = '/favicon.ico'
      }
    }
  }, [location.pathname])

  return branding
}

// CSS classes for Eusbett branding
export const eusbettStyles = {
  primary: 'text-[#003D7A] bg-[#003D7A]',
  secondary: 'text-[#E74C3C] bg-[#E74C3C]',
  accent: 'text-[#00B4E6] bg-[#00B4E6]',
  primaryBg: 'bg-[#003D7A]',
  secondaryBg: 'bg-[#E74C3C]',
  accentBg: 'bg-[#00B4E6]',
  primaryText: 'text-[#003D7A]',
  secondaryText: 'text-[#E74C3C]',
  accentText: 'text-[#00B4E6]',
  primaryBorder: 'border-[#003D7A]',
  secondaryBorder: 'border-[#E74C3C]',
  accentBorder: 'border-[#00B4E6]',
  gradient: 'bg-gradient-to-r from-[#003D7A] to-[#00B4E6]',
  gradientText: 'bg-gradient-to-r from-[#003D7A] to-[#00B4E6] bg-clip-text text-transparent'
}
