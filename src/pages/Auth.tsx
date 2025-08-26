import { useEffect } from "react"
import { useNavigate, useSearchParams } from "react-router-dom"
import { SmartAuth } from "@/components/SmartAuth"

/**
 * 🎯 SMART GLOBAL AUTHENTICATION
 * 
 * This page now uses SmartAuth component that:
 * 1. Handles email-first authentication
 * 2. Automatically detects user's accessible tenants
 * 3. Redirects to appropriate tenant auth page
 * 4. Supports multi-tenant users (hotel managers with multiple properties)
 */

export default function Auth() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()

  // 🔄 REDIRECT TO TENANT-SCOPED AUTH IF TENANT SPECIFIED
  useEffect(() => {
    const tenant = searchParams.get('tenant')
    if (tenant) {
      const returnUrl = searchParams.get('returnUrl')
      const redirectUrl = `/${tenant}/auth${returnUrl ? `?returnUrl=${encodeURIComponent(returnUrl)}` : ''}`
      navigate(redirectUrl, { replace: true })
    }
  }, [searchParams, navigate])

  // Use SmartAuth component for intelligent authentication
  return <SmartAuth />
}
