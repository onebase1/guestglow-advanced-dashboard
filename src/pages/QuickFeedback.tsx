import { useState, useEffect } from "react"
import { useNavigate, useSearchParams, useParams } from "react-router-dom"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { StarRating } from "@/components/ui/star-rating"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Star, MessageSquare } from "lucide-react"
import { LoadingSpinner } from "@/components/ui/loading-spinner"
import { getTenantSlugFromParams, getTenantBySlug, submitFeedbackWithTenant, applyTenantBranding, type Tenant, DEFAULT_TENANT } from "@/utils/tenant"
import { logFeedbackSubmission, logQRCodeScan, logNetworkError } from "@/utils/logging"
import { canSubmitFeedback, getOfflineStatusMessage } from "@/utils/serviceWorker"
import { processEmailContent, wrapEmailHtml } from "@/utils/emailContentProcessor"
// Remove unused imports - using inline validation instead

export default function QuickFeedback() {
  const [searchParams] = useSearchParams()
  const params = useParams<{ tenantSlug?: string }>()
  const roomNumber = searchParams.get('room') || '' // Keep for logging purposes only
  const areaParam = searchParams.get('area') || ''
  const categoryParam = (searchParams.get('category') || '').toLowerCase()
  // Persist state across navigation using sessionStorage
  const getStoredState = () => {
    try {
      const stored = sessionStorage.getItem('quickFeedbackState')
      return stored ? JSON.parse(stored) : null
    } catch {
      return null
    }
  }

  const storedState = getStoredState()

  const [step, setStep] = useState(storedState?.step || 1)
  const [rating, setRating] = useState(storedState?.rating || 0)
  const [wantToProvideDetails, setWantToProvideDetails] = useState(storedState?.wantToProvideDetails || false)
  const [formData, setFormData] = useState(storedState?.formData || {
    guestName: "",
    roomNumber: "", // Never auto-populate from QR code - prevents confusion when QR location ≠ complaint subject
    guestEmail: "",
    feedbackText: "",
    issueCategory: "",
  })
  const [loading, setLoading] = useState(false)
  const [tenant, setTenant] = useState<Tenant>(DEFAULT_TENANT)
  const [tenantLoading, setTenantLoading] = useState(true)
  const { toast } = useToast()
  const navigate = useNavigate()
  // Inline auto-reply state for Thank-You page when no contact provided
  const [inlineReply, setInlineReply] = useState<string | null>(storedState?.inlineReply || null)
  const [inlineReplyLoading, setInlineReplyLoading] = useState(false)
  const [aiGenerationAttempted, setAiGenerationAttempted] = useState(false)
  const [emailCapture, setEmailCapture] = useState("")

  // Save state to sessionStorage whenever key state changes
  useEffect(() => {
    const stateToSave = {
      step,
      rating,
      wantToProvideDetails,
      formData,
      inlineReply
    }
    sessionStorage.setItem('quickFeedbackState', JSON.stringify(stateToSave))
  }, [step, rating, wantToProvideDetails, formData, inlineReply])

  // Clear stored state (call when feedback process is complete)
  const clearStoredState = () => {
    sessionStorage.removeItem('quickFeedbackState')
  }

  // Add a "Start Over" function for the thank you page
  const startOver = () => {
    clearStoredState()
    setStep(1)
    setRating(0)
    setWantToProvideDetails(false)
    setFormData({
      guestName: "",
      roomNumber: "",
      guestEmail: "",
      feedbackText: "",
      issueCategory: "",
    })
    setInlineReply(null)
    setAiGenerationAttempted(false)
    setEmailCapture("")
  }

  // Initialize tenant information
  useEffect(() => {
    const initializeTenant = async () => {
      setTenantLoading(true)
      try {
        const tenantSlug = getTenantSlugFromParams(params)
        const tenantData = await getTenantBySlug(tenantSlug)

        if (tenantData) {
          setTenant(tenantData)
          applyTenantBranding(tenantData)
        }
      } catch (error) {
        console.error('Error loading tenant:', error)
      } finally {
        setTenantLoading(false)
      }
    }

    initializeTenant()
  }, [])

  // Log QR code scan when component mounts (if accessed via QR code)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search)
    const area = urlParams.get('area')
    const room = urlParams.get('room')

    if (area) {
      // This indicates the page was accessed via QR code
      logQRCodeScan(area, room || undefined)
    }
  }, [])

  const handleRatingSubmit = () => {
    if (rating === 0) {
      toast({
        title: "Please select a rating",
        description: "How would you rate your experience?",
        variant: "destructive"
      })
      return
    }

    if (rating < 5) {
      setStep(2) // Go directly to feedback form for ratings < 5
    } else {
      // For 5 stars, just thank them (no external review for demo)
      handleHighRatingThankYou()
    }
  }

  const handleHighRatingThankYou = async () => {
    setLoading(true)
    try {
      // Save as internal positive feedback using the tenant-aware function
      const feedbackId = await submitFeedbackWithTenant(tenant.slug, {
        guestName: 'QR Code Guest',
        guestEmail: null,
        roomNumber: formData.roomNumber || null,
        checkInDate: null,
        checkOutDate: null,
        rating,
        feedbackText: 'Excellent experience via QR code - 5 star rating',
        issueCategory: 'Overall Experience',
        wouldRecommend: true,
        source: 'qr_code'
      })

      setStep(6) // Go to external review permission step

      // 🚨 DISABLED: Email generation now handled by database triggers
      // This prevents duplicate emails from being sent
      // Database triggers automatically handle email routing correctly
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleLowRatingChoice = (provideDetails: boolean) => {
    if (!provideDetails) {
      // Submit anonymous feedback
      handleAnonymousFeedback()
    } else {
      setWantToProvideDetails(true)
      setStep(4) // Show detailed feedback form
    }
  }

  const handleAnonymousFeedback = async () => {
    if (!canSubmitFeedback()) {
      toast({
        title: "Cannot submit feedback",
        description: getOfflineStatusMessage(),
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    const startTime = Date.now()

    try {
      const feedbackId = await submitFeedbackWithTenant(tenant.slug, {
        guestName: 'Anonymous Guest',
        guestEmail: null,
        roomNumber: formData.roomNumber || null,
        checkInDate: null,
        checkOutDate: null,
        rating,
        feedbackText: 'Anonymous low rating feedback - guest chose not to provide details',
        issueCategory: 'General',
        wouldRecommend: false,
        source: 'qr_code'
      })

      const endTime = Date.now()
      const submissionTime = endTime - startTime

      // Log successful feedback submission
      await logFeedbackSubmission(
        feedbackId,
        rating,
        'qr_code',
        formData.roomNumber || undefined,
        submissionTime
      )

      // Show thank you message
      toast({
        title: "Thank you for your feedback!",
        description: "Your feedback helps us improve our service."
      })

      setStep(5) // Thank you step

      // Set a professional thank you message immediately
      setInlineReply(`Dear Guest,

Thank you for taking the time to share your feedback with us. We truly appreciate your honest review.

Your feedback is very important to us, and we will review it carefully with our team to ensure we continue to improve our service.

We value your business and hope to have the opportunity to provide you with a better experience in the future.

Best regards,
The ${tenant.name || 'Hotel'} Team`)
      setInlineReplyLoading(false)

      // Optionally try to generate a better response in the background (non-blocking)
      if (!aiGenerationAttempted) {
        setAiGenerationAttempted(true)
        setTimeout(async () => {
          try {
            console.log('🤖 Attempting to generate AI response for anonymous feedback...')
            const { data } = await supabase.functions.invoke('ai-response-generator', {
              body: {
                reviewText: 'Anonymous low rating feedback - guest chose not to provide details',
                rating,
                isExternal: false,
                guestName: 'Anonymous Guest',
                tenant_id: tenant.id,
                tenant_slug: tenant.slug
              }
            })

            if (data?.response) {
              console.log('✅ AI response generated for anonymous feedback')
              setInlineReply(data.response)
            }
          } catch (error) {
            console.warn('AI response generation failed for anonymous feedback (non-critical):', error)
            // Keep the fallback message - don't change anything
          }
        }, 1000) // Wait 1 second before trying AI generation
      }

      // 🚨 DISABLED: Email generation now handled by database triggers
      // This prevents duplicate emails from being sent
      // Database triggers automatically handle email routing correctly
    } catch (error) {
      console.error('Anonymous feedback submission error:', error)

      // Log network error
      await logNetworkError(
        'anonymous_feedback_submission',
        error instanceof Error ? error.message : 'Unknown error'
      )

      // Check if this is a network error vs a database error
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch')

      if (isNetworkError) {
        // Network error - feedback might have been saved but email failed
        console.warn('Network error detected for anonymous feedback - showing thank you anyway...')

        // Still show thank you page since feedback was likely saved
        setStep(5)
        setInlineReply(`Dear Guest,

Thank you for your feedback! We've received your rating and will use it to improve our service.

Due to a temporary network issue, we may not be able to send email notifications immediately, but your feedback has been recorded.

Best regards,
The ${tenant.name || 'Hotel'} Team`)
        setInlineReplyLoading(false)

        toast({
          title: "Feedback received!",
          description: "Your rating has been saved. Thank you for your input!"
        })
      } else {
        // Database or other error
        const errorMessage = navigator.onLine
          ? "Something went wrong. Please try again."
          : getOfflineStatusMessage()

        toast({
          title: "Error submitting feedback",
          description: errorMessage,
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleDetailedFeedback = async () => {
    console.log('🚀 Starting detailed feedback submission...')

    // Input validation
    if (!formData.feedbackText?.trim() || !formData.issueCategory) {
      toast({
        title: "Please complete required fields",
        description: "We need feedback details and category to help you better.",
        variant: "destructive"
      })
      return
    }

    // Validate text length
    if (formData.feedbackText.trim().length > 2000) {
      toast({
        title: "Feedback too long",
        description: "Please keep feedback under 2000 characters.",
        variant: "destructive"
      })
      return
    }

    // Validate email format if provided
    if (formData.guestEmail && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.guestEmail)) {
      toast({
        title: "Invalid email format",
        description: "Please enter a valid email address.",
        variant: "destructive"
      })
      return
    }

    // Validate room number format if provided
    if (formData.roomNumber && !/^[A-Za-z0-9\-\s]{1,20}$/.test(formData.roomNumber)) {
      toast({
        title: "Invalid room number",
        description: "Room number should only contain letters, numbers, hyphens, and spaces.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      console.log('📝 Submitting feedback to database...')
      const feedbackId = await submitFeedbackWithTenant(tenant.slug, {
        guestName: formData.guestName || 'Anonymous Guest',
        guestEmail: formData.guestEmail || null,
        roomNumber: formData.roomNumber || null,
        checkInDate: null,
        checkOutDate: null,
        rating,
        feedbackText: formData.feedbackText,
        issueCategory: formData.issueCategory,
        wouldRecommend: false,
        source: 'qr_code'
      })
      console.log('✅ Feedback submitted successfully, ID:', feedbackId)

      // Show thank you message immediately for better UX
      console.log('🎉 Moving to thank you step...')
      toast({
        title: "Thank you for your detailed feedback!",
        description: "We'll review your feedback and work to improve your experience."
      })
      setStep(5) // Thank you step
      console.log('📍 Current step set to:', 5)

      // If no email provided, show a simple thank you message
      if (!formData.guestEmail) {
        // Set a professional fallback message immediately
        setInlineReply(`Dear ${formData.guestName || 'Guest'},

Thank you for taking the time to share your feedback with us. We truly appreciate your honest review and the opportunity to improve.

Your comments about ${formData.issueCategory.toLowerCase()} are very important to us, and we will review them carefully with our team to ensure we address these concerns.

We value your business and hope to have the opportunity to provide you with a much better experience in the future.

Best regards,
The ${tenant.name || 'Hotel'} Team`)
        setInlineReplyLoading(false)

        // Optionally try to generate a better response in the background (non-blocking)
        if (!aiGenerationAttempted) {
          setAiGenerationAttempted(true)
          setTimeout(async () => {
            try {
              console.log('🤖 Attempting to generate AI response in background...')
              const { data } = await supabase.functions.invoke('ai-response-generator', {
                body: {
                  reviewText: formData.feedbackText,
                  rating,
                  isExternal: false,
                  guestName: formData.guestName || 'Guest',
                  tenant_id: tenant.id,
                  tenant_slug: tenant.slug
                }
              })

              if (data?.response) {
                console.log('✅ AI response generated successfully')
                setInlineReply(data.response)
              }
            } catch (error) {
              console.warn('AI response generation failed (non-critical):', error)
              // Keep the fallback message - don't change anything
            }
          }, 1000) // Wait 1 second before trying AI generation
        }
      }

      // 🚨 DISABLED: Email generation now handled by database triggers
      // This prevents duplicate emails from being sent
      // Database triggers automatically handle email routing correctly
    } catch (error) {
      console.error('Detailed feedback submission error:', error)

      // Check if this is a network error vs a database error
      const isNetworkError = error instanceof TypeError && error.message.includes('fetch')

      if (isNetworkError) {
        // Network error - feedback might have been saved but email failed
        console.warn('Network error detected - checking if feedback was saved...')

        // Still show thank you page since feedback was likely saved
        setStep(5)
        setInlineReply(`Dear ${formData.guestName || 'Guest'},

Thank you for your feedback! We've received your comments and will review them carefully.

Due to a temporary network issue, we may not be able to send you an immediate email response, but rest assured that your feedback has been recorded and will be addressed by our team.

Best regards,
The ${tenant.name || 'Hotel'} Team`)
        setInlineReplyLoading(false)

        toast({
          title: "Feedback received!",
          description: "Your feedback has been saved. Email notifications may be delayed due to network issues."
        })
      } else {
        // Database or other error
        toast({
          title: "Error submitting feedback",
          description: "Something went wrong. Please try again.",
          variant: "destructive"
        })
      }
    } finally {
      setLoading(false)
    }
  }

  const handleExternalReview = async (writeReview: boolean) => {
    setLoading(true)
    try {
      if (writeReview) {
        // Record the redirect and send to external review site
        const { error } = await supabase.from('trustpilot_redirects').insert({
          guest_name: 'QR Code Guest',
          room_number: formData.roomNumber || null,
          check_in_date: null,
          rating,
          trustpilot_url: 'https://www.trustpilot.com/evaluate/yourhotel.com',
          source: 'qr_code'
        })

        if (error) throw error

        toast({
          title: "Thank you!",
          description: "Opening review site..."
        })

        // Redirect to external review site
        setTimeout(() => {
          window.open('https://www.trustpilot.com/evaluate/yourhotel.com', '_blank')
        }, 1000)
      } else {
        // Save as internal positive feedback using tenant-aware function
        await submitFeedbackWithTenant(tenant.slug, {
          guestName: 'QR Code Guest',
          guestEmail: null,
          roomNumber: formData.roomNumber || null,
          checkInDate: null,
          checkOutDate: null,
          rating,
          feedbackText: 'Positive experience via QR code - chose not to leave external review',
          issueCategory: 'General',
          wouldRecommend: true,
          source: 'qr_code'
        })

        toast({
          title: "Thank you!",
          description: "We appreciate your positive feedback!"
        })
      }
      setStep(5) // Thank you step
    } catch (error) {
      toast({
        title: "Error processing request",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExternalReviewYes = async () => {
    setLoading(true)
    try {
      // Redirect to TripAdvisor
      const tripUrl = 'https://www.tripadvisor.com/UserReviewEdit-g2400444-d2399149-Eusbett_Hotel-Sunyani_Brong_Ahafo_Region.html';
      window.open(tripUrl, '_blank')

      // Show thank you message
      setStep(5) // Go to thank you step

      toast({
        title: "Thank you!",
        description: "We appreciate you sharing your experience!"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const handleExternalReviewNo = async () => {
    setLoading(true)
    try {
      // Just show thank you message
      setStep(5) // Go to thank you step

      toast({
        title: "Thank you!",
        description: "We appreciate your excellent rating!"
      })
    } catch (error) {
      toast({
        title: "Error",
        description: "Something went wrong. Please try again.",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-card via-muted/20 to-primary/5 p-4">
      <div className="mx-auto max-w-md">
        <Card className="bg-card border-2 border-gray-300 shadow-2xl backdrop-blur-sm">
          <CardHeader className="text-center pb-4 space-y-4">
            <div className="space-y-3">
              <div className="flex justify-center">
                <img
                  src={tenant.slug === 'eusbett' ? '/new_eusbett_logo.jpeg' : (tenant.logo_url || '/lovable-uploads/c2a80098-fa71-470e-9d1e-eec01217f25a.png')}
                  alt={`${tenant.name} Logo`}
                  className="h-48 w-auto"
                  style={{ filter: 'contrast(110%) brightness(105%)' }}
                />
              </div>
              
              {/* Progress Indicator */}
              <div className="flex justify-center space-x-2 py-2">
                <div className={`w-3 h-3 rounded-full transition-colors ${step >= 1 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-3 h-3 rounded-full transition-colors ${step >= 2 ? 'bg-primary' : 'bg-muted'}`} />
                <div className={`w-3 h-3 rounded-full transition-colors ${step >= 5 ? 'bg-success' : 'bg-muted'}`} />
                {rating === 5 && <div className={`w-3 h-3 rounded-full transition-colors ${step >= 6 ? 'bg-primary' : 'bg-muted'}`} />}
              </div>

              {step === 1 && (
                <>
                  <CardTitle className="text-xl text-foreground">Quick Feedback</CardTitle>
                  <CardDescription className="text-muted-foreground" style={{ color: 'var(--tenant-primary)' }}>
                    Your experience matters to us
                  </CardDescription>
                </>
              )}
              
              {step === 2 && (
                <>
                  <CardTitle className="text-xl text-foreground">Help Us Improve</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Tell us what happened so we can make it right
                  </CardDescription>
                </>
              )}

              {step === 6 && (
                <>
                  <CardTitle className="text-xl text-foreground">Share Your Experience</CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Help other travelers with your review
                  </CardDescription>
                </>
              )}
            </div>
          </CardHeader>
          <CardContent className="space-y-6">
            {step === 1 && (
              <div className="text-center space-y-6">
                <div className="space-y-4">
                  <Label className="text-lg font-medium">How was your experience?</Label>
                  <div className="flex justify-center py-4">
                    <StarRating 
                      rating={rating} 
                      onRatingChange={setRating}
                      interactive={true}
                      size="lg"
                      className="scale-110"
                    />
                  </div>
                  {rating > 0 && (
                    <p className="text-sm text-muted-foreground">
                      {rating === 5 ? "Excellent! 🌟" : 
                       rating === 4 ? "Great! 😊" :
                       rating === 3 ? "Good 👍" :
                       rating === 2 ? "Could be better 😐" : "We need to improve 😔"}
                    </p>
                  )}
                </div>
                <Button onClick={handleRatingSubmit} size="lg" className="w-full">
                  Continue
                </Button>
              </div>
            )}

            {step === 2 && (
              <div className="space-y-5">
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="category" className="text-base font-medium">What area needs improvement?</Label>
                    <Select value={formData.issueCategory} onValueChange={(value) => setFormData(prev => ({...prev, issueCategory: value}))}>
                      <SelectTrigger className="h-12 mt-2">
                        <SelectValue placeholder="Choose category" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Room Quality">🛏️ Room Quality</SelectItem>
                        <SelectItem value="Service">👥 Service</SelectItem>
                        <SelectItem value="Cleanliness">🧹 Cleanliness</SelectItem>
                        <SelectItem value="Amenities">🏊 Amenities</SelectItem>
                        <SelectItem value="Food & Beverage">🍽️ Food & Beverage</SelectItem>
                        <SelectItem value="Check-in/Check-out">🔑 Check-in/Check-out</SelectItem>
                        <SelectItem value="Staff Behavior">💼 Staff</SelectItem>
                        <SelectItem value="Noise">🔊 Noise</SelectItem>
                        <SelectItem value="Conferences/Meetings">🎤 Conferences/Meetings</SelectItem>
                        <SelectItem value="Internet">📶 Internet</SelectItem>
                        <SelectItem value="Spa">💆 Spa</SelectItem>
                        <SelectItem value="Gym">💪 Gym</SelectItem>
                        <SelectItem value="Security">🔒 Security</SelectItem>
                        <SelectItem value="Swimming Pool">🏊 Swimming Pool</SelectItem>
                        <SelectItem value="Other">📝 Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>

                  <div>
                    <Label htmlFor="feedback" className="text-base font-medium">Tell us what happened</Label>
                    <Textarea
                      id="feedback"
                      value={formData.feedbackText}
                      onChange={(e) => setFormData(prev => ({...prev, feedbackText: e.target.value.slice(0, 500)}))}
                      placeholder="Brief description..."
                      rows={3}
                      className="resize-none h-24 mt-2"
                      maxLength={500}
                    />
                    <p className="text-xs text-muted-foreground text-right mt-1">
                      {formData.feedbackText.length}/500 characters
                    </p>
                  </div>

                  <div className="space-y-3 pt-3 border-t border-muted/30">
                    <Label className="text-sm font-medium text-muted-foreground">Contact info (optional - for follow-up)</Label>
                    
                    <div className="grid grid-cols-2 gap-3">
                      <Input
                        placeholder="Your name"
                        value={formData.guestName}
                        onChange={(e) => setFormData(prev => ({...prev, guestName: e.target.value.slice(0, 50)}))}
                        maxLength={50}
                        className="h-10"
                      />
                      <Input
                        placeholder="Room #"
                        value={formData.roomNumber}
                        onChange={(e) => setFormData(prev => ({...prev, roomNumber: e.target.value.slice(0, 10)}))}
                        maxLength={10}
                        className="h-10"
                      />
                    </div>
                    <Input
                      placeholder="Email address"
                      type="email"
                      value={formData.guestEmail}
                      onChange={(e) => setFormData(prev => ({...prev, guestEmail: e.target.value.slice(0, 100)}))}
                      maxLength={100}
                      className="h-10"
                    />
                  </div>
                </div>

                <Button onClick={handleDetailedFeedback} disabled={loading} className="w-full" size="lg">
                  {loading ? (
                    <div className="flex items-center gap-2">
                      <LoadingSpinner size="sm" />
                      Submitting...
                    </div>
                  ) : "Submit Feedback"}
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  We'll address this issue to improve your future stays
                </p>
              </div>
            )}


            {step === 5 && (
              <div className="text-center space-y-6 py-8">
                <div className="space-y-2">
                  <h3 className="text-xl font-semibold text-success">Thank You!</h3>
                  <p className="text-muted-foreground">
                    {formData.guestEmail
                      ? "Thanks, we've sent you a response and a copy to your email."
                      : (rating >= 4
                          ? "Thanks for your feedback!"
                          : "Your feedback helps us create better experiences for all guests.")}
                  </p>
                </div>

                {!formData.guestEmail && (
                  <div className="max-w-md mx-auto text-left space-y-3">
                    <div className="p-3 border rounded-md bg-muted/30">
                      {inlineReplyLoading ? (
                        <div className="text-sm text-muted-foreground">Generating our response...</div>
                      ) : (
                        inlineReply ? (
                          <div className="prose prose-sm whitespace-pre-wrap">{inlineReply}</div>
                        ) : (
                          <div className="text-sm text-muted-foreground">Our response will appear here in a moment.</div>
                        )
                      )}
                    </div>

                    <div className="pt-2">
                      <Label className="text-sm">Want a copy by email? (optional)</Label>
                      <div className="flex gap-2 mt-1">
                        <Input
                          type="email"
                          placeholder="your@email.com"
                          value={emailCapture}
                          onChange={(e) => setEmailCapture(e.target.value)}
                          className="h-10"
                        />
                        <Button
                          disabled={!inlineReply || inlineReplyLoading || !emailCapture}
                          onClick={async () => {
                            try {
                              // Process AI response with professional email processor
                              const processed = processEmailContent(inlineReply || '')
                              const html = wrapEmailHtml(processed.html, tenant.name || 'Eusbett Hotel')

                              await supabase.functions.invoke('send-tenant-emails', {
                                body: {
                                  feedback_id: undefined,
                                  email_type: 'guest_thank_you',
                                  recipient_email: emailCapture,
                                  subject: 'Our response to your feedback',
                                  html_content: html,
                                  tenant_id: tenant.id,
                                  tenant_slug: tenant.slug,
                                  priority: 'normal'
                                }
                              })
                              toast({ title: 'Email sent', description: 'We sent a copy to your email.' })
                            } catch (_) {
                              toast({ title: 'Failed to send email', variant: 'destructive' })
                            }
                          }}
                        >
                          Send Copy
                        </Button>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1">Or email us at {tenant.contact_email || 'system-fallback@guest-glow.com'}</p>
                    </div>
                  </div>
                )}

                {/* Contact options */}
                {tenant && (() => {
                  const phoneDigits = (tenant.contact_phone || '').replace(/\D/g, '')
                  const text = encodeURIComponent('Hello, I just left feedback via QR and would like to chat with a manager.')
                  const waLink = phoneDigits ? `https://wa.me/${phoneDigits}?text=${text}` : ''
                  return waLink ? (
                    <div>
                      <a href={waLink} target="_blank" rel="noopener" className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-md bg-green-600 text-white hover:bg-green-700 text-sm font-medium transition-colors">
                        <MessageSquare className="w-4 h-4" />
                        Message us on WhatsApp
                      </a>
                    </div>
                  ) : null
                })()}

                <div className="space-y-3">
                  <Button
                    onClick={startOver}
                    variant="outline"
                    className="w-full max-w-xs"
                  >
                    Submit Another Feedback
                  </Button>
                  <p className="text-sm text-muted-foreground">
                    You can now close this page or submit another feedback.
                  </p>
                </div>
              </div>
            )}

            {step === 6 && (
              <div className="text-center space-y-6 py-8">
                <div className="space-y-4">
                  <h3 className="text-xl font-semibold text-primary">Help Other Travelers! 🌟</h3>
                  <p className="text-muted-foreground">
                    Since you loved your stay, help other families discover Eusbett Hotel too!
                  </p>
                  <p className="text-sm text-muted-foreground/80">
                    Join 200+ happy guests on TripAdvisor • Quick 30-second review
                  </p>
                </div>

                <div className="space-y-3">
                  <Button
                    onClick={handleExternalReviewYes}
                    size="lg"
                    className="w-full bg-green-600 hover:bg-green-700"
                    disabled={loading}
                  >
                    🚀 Share My Experience
                  </Button>
                  <Button
                    onClick={handleExternalReviewNo}
                    variant="ghost"
                    size="sm"
                    className="w-full text-muted-foreground"
                    disabled={loading}
                  >
                    Maybe later
                  </Button>
                </div>
              </div>
            )}
          </CardContent>

          {/* Powered by GuestGlow */}
          <div className="px-6 pb-4">
            <div className="text-right">
              <p className="text-xs text-muted-foreground/70">
                Powered by{' '}
                <span className="font-medium text-muted-foreground">
                  GuestGlow
                </span>
              </p>
            </div>
          </div>
        </Card>
      </div>
    </div>
  )
}