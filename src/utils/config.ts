// Centralized public base URL resolution for links/QR codes
// In production (Netlify), set VITE_PUBLIC_BASE_URL=https://guest-glow.com
// Falls back to window.location.origin for local/dev.

export function getPublicBaseUrl(): string {
  // Vite exposes env vars via import.meta.env
  const envUrl = (import.meta as any)?.env?.VITE_PUBLIC_BASE_URL as string | undefined
  if (envUrl && typeof envUrl === 'string' && envUrl.trim().length > 0) {
    return envUrl.replace(/\/$/, '')
  }
  if (typeof window !== 'undefined' && window.location?.origin) {
    return window.location.origin
  }
  // Last resort, safe default
  return 'http://localhost:8080'
}

