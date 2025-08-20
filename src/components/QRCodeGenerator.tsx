import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { QrCode, Download, Mail, Copy, Shield, Eye, MapPin } from "lucide-react"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { getCurrentUserTenant, getTenantBySlug, getQRCodeUrl, type Tenant, DEFAULT_TENANT } from '@/utils/tenant'

export function QRCodeGenerator() {
  const [roomNumber, setRoomNumber] = useState("")
  const [area, setArea] = useState("")
  const [qrType, setQrType] = useState<"privacy" | "insight">("privacy")
  const [qrCodeUrl, setQrCodeUrl] = useState("")
  const [feedbackUrl, setFeedbackUrl] = useState("")
  const [loading, setLoading] = useState(false)
  const [emailLoading, setEmailLoading] = useState(false)
  const [guestEmail, setGuestEmail] = useState("")
  const [tenant, setTenant] = useState<Tenant>(DEFAULT_TENANT)
  const { toast } = useToast()

  // Initialize tenant information
  useEffect(() => {
    const initializeTenant = async () => {
      try {
        const tenantId = await getCurrentUserTenant()
        if (tenantId) {
          // For now, default to Eusbett - in production this would fetch by tenant ID
          const tenantData = await getTenantBySlug('eusbett')
          if (tenantData) {
            setTenant(tenantData)
          }
        }
      } catch (error) {
        console.error('Error loading tenant:', error)
      }
    }

    initializeTenant()
  }, [])

  const generateQRCode = async () => {
    if (qrType === "insight" && !area.trim()) {
      toast({
        title: "Area required for Insight QR",
        description: "Please select an area for location-based feedback",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Use a configurable public base URL for production (guest-glow.com)
      const { getPublicBaseUrl } = await import('@/utils/config')
      const baseUrl = getPublicBaseUrl()
      // Use tenant-aware URL structure
      let url = `${baseUrl}/${tenant.slug}/quick-feedback`

      // Add parameters based on QR type
      const params = new URLSearchParams()
      if (roomNumber.trim()) {
        params.append('room', roomNumber)
      }
      if (qrType === "insight" && area.trim()) {
        params.append('area', area)
      }

      if (params.toString()) {
        url += `?${params.toString()}`
      }
      
      setFeedbackUrl(url)
      
      // Generate QR code using QR Server API (free service)
      const qrUrl = `https://api.qrserver.com/v1/create-qr-code/?size=300x300&data=${encodeURIComponent(url)}&format=png`
      setQrCodeUrl(qrUrl)
      
      const description = qrType === "privacy" 
        ? `Privacy QR Code${roomNumber ? ` for Room ${roomNumber}` : ""}`
        : `Insight QR Code for ${area}${roomNumber ? ` (Room ${roomNumber})` : ""}`
      
      toast({
        title: "QR Code Generated",
        description
      })
    } catch (error) {
      console.error('Error generating QR code:', error)
      toast({
        title: "Error generating QR code",
        variant: "destructive"
      })
    }
    setLoading(false)
  }

  const downloadQRCode = async () => {
    if (!qrCodeUrl) return
    
    try {
      const response = await fetch(qrCodeUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      
      const link = document.createElement('a')
      link.href = url
      link.download = `feedback-qr-room-${roomNumber}.png`
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      window.URL.revokeObjectURL(url)
      
      toast({
        title: "QR Code Downloaded",
        description: `Saved as feedback-qr-room-${roomNumber}.png`
      })
    } catch (error) {
      toast({
        title: "Download failed",
        variant: "destructive"
      })
    }
  }

  const copyUrl = async () => {
    await navigator.clipboard.writeText(feedbackUrl)
    toast({
      title: "URL Copied",
      description: "Feedback link copied to clipboard"
    })
  }

  const sendByEmail = async () => {
    if (!guestEmail.trim()) {
      toast({
        title: "Email required",
        description: "Please enter guest email address",
        variant: "destructive"
      })
      return
    }

    setEmailLoading(true)
    try {
      const { error } = await supabase.functions.invoke('send-feedback-link', {
        body: {
          guestEmail,
          roomNumber,
          feedbackUrl,
          qrCodeUrl
        }
      })

      if (error) throw error

      toast({
        title: "Email Sent",
        description: `Feedback link sent to ${guestEmail}`
      })
      setGuestEmail("")
    } catch (error) {
      console.error('Error sending email:', error)
      toast({
        title: "Failed to send email",
        description: "Please check the email address and try again",
        variant: "destructive"
      })
    }
    setEmailLoading(false)
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <QrCode className="h-5 w-5 text-primary" />
          <CardTitle>Ethical QR Code Generator</CardTitle>
        </div>
        <CardDescription>
          Generate privacy-focused or location-aware QR codes for guest feedback
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-4">
          {/* Quick Generate Strategic Locations */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <h3 className="font-semibold text-blue-900 mb-2 flex items-center gap-2">
              <MapPin className="h-4 w-4" />
              Contract Required: 5 Strategic Locations
            </h3>
            <p className="text-sm text-blue-700 mb-4">
              Generate QR codes for the 5 strategic locations specified in the Eusbett Hotel contract.
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
              {[
                { area: 'front-desk', name: 'Front Desk' },
                { area: 'lobby', name: 'Lobby/Elevators' },
                { area: 'restaurant', name: 'Restaurant' },
                { area: 'conference', name: 'Conference' },
                { area: 'spa-gym', name: 'Spa/Gym' }
              ].map((location) => (
                <Button
                  key={location.area}
                  onClick={() => {
                    setArea(location.area)
                    setQrType("insight")
                    setTimeout(() => generateQRCode(), 100)
                  }}
                  disabled={loading}
                  variant="outline"
                  size="sm"
                  className="text-xs"
                >
                  <QrCode className="h-3 w-3 mr-1" />
                  {location.name}
                </Button>
              ))}
            </div>
          </div>

          {/* QR Type Selection */}
          <div>
            <Label>QR Code Type</Label>
            <div className="grid grid-cols-2 gap-3 mt-2">
              <Button
                variant={qrType === "privacy" ? "default" : "outline"}
                onClick={() => setQrType("privacy")}
                className="flex items-center gap-2 justify-start h-auto p-3"
              >
                <Shield className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Privacy QR</div>
                  <div className="text-xs text-muted-foreground">No location tracking</div>
                </div>
              </Button>
              <Button
                variant={qrType === "insight" ? "default" : "outline"}
                onClick={() => setQrType("insight")}
                className="flex items-center gap-2 justify-start h-auto p-3"
              >
                <Eye className="h-4 w-4" />
                <div className="text-left">
                  <div className="font-medium">Insight QR</div>
                  <div className="text-xs text-muted-foreground">Area-based analytics</div>
                </div>
              </Button>
            </div>
          </div>

          {/* Room Number */}
          <div>
            <Label htmlFor="room">Room Number (Optional)</Label>
            <Input
              id="room"
              value={roomNumber}
              onChange={(e) => setRoomNumber(e.target.value)}
              placeholder="e.g. 101, 205A"
            />
          </div>

          {/* Area Selection for Insight QR */}
          {qrType === "insight" && (
            <div>
              <Label htmlFor="area">Area/Location</Label>
              <Select value={area} onValueChange={setArea}>
                <SelectTrigger>
                  <SelectValue placeholder="Select area for feedback tracking" />
                </SelectTrigger>
                <SelectContent>
                  {/* Contract Required Locations */}
                  <SelectItem value="front-desk">Front Desk / Check-in Counter</SelectItem>
                  <SelectItem value="lobby">Lobby / Elevators</SelectItem>
                  <SelectItem value="restaurant">Restaurant / Breakfast Area</SelectItem>
                  <SelectItem value="conference">Conference / Banquet Foyer</SelectItem>
                  <SelectItem value="spa-gym">Spa / Gym Entrances</SelectItem>

                  {/* Additional Locations */}
                  <SelectItem value="pool">Swimming Pool</SelectItem>
                  <SelectItem value="laundry">Laundry</SelectItem>
                  <SelectItem value="security">Security Post/Desk</SelectItem>
                  <SelectItem value="guest-rooms">Guest Rooms (Tent Cards)</SelectItem>
                  <SelectItem value="meeting-rooms">Meeting Rooms</SelectItem>
                  <SelectItem value="parking">Parking Area</SelectItem>
                  <SelectItem value="garden">Garden & Outdoor</SelectItem>
                </SelectContent>
              </Select>
            </div>
          )}

          <Button onClick={generateQRCode} disabled={loading} className="w-full">
            {loading ? "Generating..." : "Generate QR Code"}
          </Button>

          {/* Privacy Information */}
          <div className="bg-muted/50 p-3 rounded-lg">
            <div className="flex items-start gap-2">
              <MapPin className="h-4 w-4 text-muted-foreground mt-0.5" />
              <div className="text-xs text-muted-foreground">
                <div className="font-medium mb-1">Privacy Notice:</div>
                {qrType === "privacy" ? (
                  <p>Privacy QR codes collect no location data. Perfect for guest rooms and private areas.</p>
                ) : (
                  <p>Insight QR codes track the feedback area (e.g., "Restaurant") to help improve specific services. Guests remain anonymous.</p>
                )}
              </div>
            </div>
          </div>
        </div>

        {qrCodeUrl && (
          <div className="space-y-4">
            <div className="text-center space-y-4">
              <div className="inline-block p-4 bg-white rounded-lg shadow-sm border">
                <img src={qrCodeUrl} alt="Feedback QR Code" className="w-64 h-64" />
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-center gap-2">
                  <Badge variant={qrType === "privacy" ? "secondary" : "default"}>
                    {qrType === "privacy" ? "Privacy QR" : "Insight QR"}
                  </Badge>
                  {area && <Badge variant="outline">{area}</Badge>}
                  {roomNumber && <Badge variant="outline">Room {roomNumber}</Badge>}
                </div>
                <p className="text-sm text-muted-foreground">
                  {qrType === "privacy" 
                    ? "Anonymous feedback collection" 
                    : `Location-aware feedback for ${area}`}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Button onClick={downloadQRCode} variant="outline" className="w-full">
                <Download className="h-4 w-4 mr-2" />
                Download
              </Button>
              <Button onClick={copyUrl} variant="outline" className="w-full">
                <Copy className="h-4 w-4 mr-2" />
                Copy Link
              </Button>
              <a
                href={`/qr-templates/eusbett-posters/index.html`}
                target="_blank"
                rel="noopener"
                className="inline-flex items-center justify-center rounded-md border px-3 text-sm hover:bg-muted"
              >
                Open Print-Ready Poster Set
              </a>
            </div>
            
            <div className="border-t pt-4 space-y-3">
              <Label htmlFor="email">Send via Email</Label>
              <div className="flex gap-2">
                <Input
                  id="email"
                  type="email"
                  value={guestEmail}
                  onChange={(e) => setGuestEmail(e.target.value)}
                  placeholder="guest@email.com"
                />
                <Button onClick={sendByEmail} disabled={emailLoading}>
                  <Mail className="h-4 w-4 mr-2" />
                  {emailLoading ? "Sending..." : "Send"}
                </Button>
              </div>
            </div>

            <div className="bg-muted/50 p-3 rounded-lg">
              <p className="text-xs text-muted-foreground">
                <strong>Link:</strong> {feedbackUrl}
              </p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}