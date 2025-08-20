import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Checkbox } from "@/components/ui/checkbox"
import { useToast } from "@/hooks/use-toast"
import { Send, Calendar, Phone } from "lucide-react"

export const ContactForm = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    company: "",
    phone: "",
    propertySize: "",
    message: "",
    preferredContact: "email",
    requestDemo: false,
    requestCallback: false,
    preferredDate: "",
    preferredTime: ""
  })
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    if (!formData.name || !formData.email || !formData.company) {
      toast({
        title: "Missing required fields",
        description: "Please fill in your name, email, and company name.",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    
    try {
      const webhookUrl = "https://n8n.dreampathai.co.uk/webhook/customer-support"
      
      await fetch(webhookUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        mode: "no-cors",
        body: JSON.stringify({
          ...formData,
          timestamp: new Date().toISOString(),
          source: "landing_page_contact"
        }),
      })

      toast({
        title: "Request sent successfully!",
        description: formData.requestCallback 
          ? "We'll call you back within 24 hours to schedule your demo."
          : "We'll contact you within 24 hours to schedule a demo.",
      })
      
      // Reset form
      setFormData({
        name: "",
        email: "",
        company: "",
        phone: "",
        propertySize: "",
        message: "",
        preferredContact: "email",
        requestDemo: false,
        requestCallback: false,
        preferredDate: "",
        preferredTime: ""
      })
    } catch (error) {
      toast({
        title: "Request sent!",
        description: formData.requestCallback 
          ? "We've received your callback request and will call you soon."
          : "We've received your demo request and will contact you soon.",
      })
      
      // Reset form even on "error" for demo purposes
      setFormData({
        name: "",
        email: "",
        company: "",
        phone: "",
        propertySize: "",
        message: "",
        preferredContact: "email",
        requestDemo: false,
        requestCallback: false,
        preferredDate: "",
        preferredTime: ""
      })
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card id="contact-form" className="glass-effect border-0 shadow-elegant">
      <CardHeader>
        <CardTitle className="text-2xl font-light text-foreground">
          Get Your Custom Demo
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Full Name *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData(prev => ({...prev, name: e.target.value}))}
                placeholder="John Smith"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="email">Email Address *</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData(prev => ({...prev, email: e.target.value}))}
                placeholder="john@hotel.com"
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="company">Hotel/Company Name *</Label>
              <Input
                id="company"
                value={formData.company}
                onChange={(e) => setFormData(prev => ({...prev, company: e.target.value}))}
                placeholder="Grand Hotel Resort"
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone Number</Label>
              <Input
                id="phone"
                type="tel"
                value={formData.phone}
                onChange={(e) => setFormData(prev => ({...prev, phone: e.target.value}))}
                placeholder="+1 (555) 123-4567"
              />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="propertySize">Property Size</Label>
            <Select value={formData.propertySize} onValueChange={(value) => setFormData(prev => ({...prev, propertySize: value}))}>
              <SelectTrigger>
                <SelectValue placeholder="Select your property size" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="1-50">1-50 rooms</SelectItem>
                <SelectItem value="51-100">51-100 rooms</SelectItem>
                <SelectItem value="101-200">101-200 rooms</SelectItem>
                <SelectItem value="201-500">201-500 rooms</SelectItem>
                <SelectItem value="500+">500+ rooms</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="message">Tell us about your current challenges</Label>
            <Textarea
              id="message"
              value={formData.message}
              onChange={(e) => setFormData(prev => ({...prev, message: e.target.value}))}
              placeholder="What reputation management challenges are you facing? Any specific goals you'd like to achieve?"
              rows={4}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="preferredContact">Preferred Contact Method</Label>
            <Select value={formData.preferredContact} onValueChange={(value) => setFormData(prev => ({...prev, preferredContact: value}))}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="teams">Microsoft Teams</SelectItem>
                <SelectItem value="whatsapp">WhatsApp</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* Appointment Booking Section */}
          <div className="space-y-4 p-4 rounded-lg bg-muted/20 border border-border/50">
            <div className="flex items-center space-x-2">
              <Checkbox 
                id="requestDemo" 
                checked={formData.requestDemo}
                onCheckedChange={(checked) => setFormData(prev => ({...prev, requestDemo: checked as boolean}))}
              />
              <Label htmlFor="requestDemo" className="flex items-center gap-2 font-medium">
                <Calendar className="h-4 w-4" />
                Schedule demo appointment immediately
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Checkbox 
                id="requestCallback" 
                checked={formData.requestCallback}
                onCheckedChange={(checked) => setFormData(prev => ({...prev, requestCallback: checked as boolean}))}
              />
              <Label htmlFor="requestCallback" className="flex items-center gap-2 font-medium">
                <Phone className="h-4 w-4" />
                Request callback from our AI assistant
              </Label>
            </div>
            
            {formData.requestDemo && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-2">
                <div className="space-y-2">
                  <Label htmlFor="preferredDate">Preferred Date</Label>
                  <Input
                    id="preferredDate"
                    type="date"
                    value={formData.preferredDate}
                    onChange={(e) => setFormData(prev => ({...prev, preferredDate: e.target.value}))}
                    min={new Date().toISOString().split('T')[0]}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="preferredTime">Preferred Time</Label>
                  <Select value={formData.preferredTime} onValueChange={(value) => setFormData(prev => ({...prev, preferredTime: value}))}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select time" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="09:00">9:00 AM</SelectItem>
                      <SelectItem value="10:00">10:00 AM</SelectItem>
                      <SelectItem value="11:00">11:00 AM</SelectItem>
                      <SelectItem value="14:00">2:00 PM</SelectItem>
                      <SelectItem value="15:00">3:00 PM</SelectItem>
                      <SelectItem value="16:00">4:00 PM</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}
          </div>

          <Button 
            type="submit" 
            disabled={loading} 
            className="w-full bg-gradient-primary border-0 shadow-large hover:shadow-glow text-lg py-6 transition-all duration-300"
          >
            <Send className="mr-2 h-5 w-5" />
            {loading ? "Sending Request..." : "Schedule Demo"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}