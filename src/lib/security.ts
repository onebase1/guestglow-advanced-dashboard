/**
 * Enterprise security utilities for input validation and sanitization
 */

// Email validation using RFC 5322 compliant regex
export const validateEmail = (email: string): boolean => {
  if (!email || email.length > 254) return false
  const emailRegex = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/
  return emailRegex.test(email)
}

// Enhanced room number validation for enterprise use
export const validateRoomNumber = (roomNumber: string): boolean => {
  if (!roomNumber || roomNumber.length > 20) return false
  // Allow alphanumeric, hyphens, spaces, and common hotel room formats
  return /^[A-Za-z0-9\-\s#.]{1,20}$/.test(roomNumber)
}

// Content sanitization with XSS protection
export const sanitizeText = (text: string, maxLength: number = 2000): string => {
  if (!text) return ''
  // Remove HTML tags, script content, and trim whitespace
  const cleaned = text
    .replace(/<[^>]*>/g, '') // Remove HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: urls
    .replace(/on\w+\s*=/gi, '') // Remove event handlers
    .trim()
  return cleaned.slice(0, maxLength)
}

// Enhanced name validation and sanitization
export const sanitizeName = (name: string): string => {
  if (!name) return ''
  return name
    .trim()
    .replace(/[<>\"'&]/g, '') // Remove dangerous characters
    .replace(/\s+/g, ' ') // Normalize whitespace
    .slice(0, 100)
}

// Email sanitization for safe storage
export const sanitizeEmail = (email: string): string => {
  if (!email) return ''
  return email
    .trim()
    .toLowerCase()
    .replace(/[<>\"'&]/g, '')
    .slice(0, 255)
}

// Room number standardization
export const sanitizeRoomNumber = (roomNumber: string): string => {
  if (!roomNumber) return ''
  return roomNumber
    .trim()
    .toUpperCase()
    .replace(/[<>\"'&]/g, '')
    .slice(0, 20)
}

// Enhanced rating validation
export const validateRating = (rating: number): boolean => {
  return Number.isInteger(rating) && rating >= 1 && rating <= 5
}

// Rate limiting key generation
export const rateLimitKey = (ip: string, action: string): string => {
  // Sanitize inputs to prevent injection
  const cleanIp = ip.replace(/[^0-9a-fA-F:.]/g, '')
  const cleanAction = action.replace(/[^a-zA-Z0-9_-]/g, '')
  return `rate_limit:${cleanIp}:${cleanAction}`
}

// UUID validation with strict format checking
export const isValidUuid = (uuid: string): boolean => {
  if (!uuid || typeof uuid !== 'string') return false
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(uuid)
}

// Content length validation
export const validateContentLength = (content: string, minLength: number = 1, maxLength: number = 2000): boolean => {
  if (!content) return minLength === 0
  return content.length >= minLength && content.length <= maxLength
}

// Phone number validation (international format)
export const validatePhoneNumber = (phone: string): boolean => {
  if (!phone) return false
  // Basic international phone format validation
  return /^\+?[\d\s\-\(\)]{7,15}$/.test(phone)
}

// IP address validation
export const validateIpAddress = (ip: string): boolean => {
  if (!ip) return false
  // IPv4 and IPv6 validation
  const ipv4Regex = /^(\d{1,3}\.){3}\d{1,3}$/
  const ipv6Regex = /^([0-9a-fA-F]{1,4}:){7}[0-9a-fA-F]{1,4}$/
  return ipv4Regex.test(ip) || ipv6Regex.test(ip)
}