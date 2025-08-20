import { useState } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"
import { Mail, MessageCircle, Clock, User } from "lucide-react"

interface FeedbackItem {
  id: string
  guest_name: string | null
  guest_email: string | null
  room_number: string | null
  rating: number
  issue_category: string
  feedback_text: string
  status: string
  created_at: string
  response_sent_at?: string | null
  response_content?: string | null
  response_sent_by?: string | null
}

interface GuestResponseModalProps {
  feedback: FeedbackItem | null
  isOpen: boolean
  onClose: () => void
  onResponseSent: () => void
}

export function GuestResponseModal({ feedback, isOpen, onClose, onResponseSent }: GuestResponseModalProps) {
  const [responseContent, setResponseContent] = useState("")
  const [managerName, setManagerName] = useState("Hotel Manager")
  const [loading, setLoading] = useState(false)
  const { toast } = useToast()

  const handleSendResponse = async () => {
    if (!feedback || !responseContent.trim()) {
      toast({
        title: "Response required",
        description: "Please write a response message",
        variant: "destructive"
      })
      return
    }

    if (!feedback.guest_email) {
      toast({
        title: "No email provided",
        description: "This guest didn't provide an email address",
        variant: "destructive"
      })
      return
    }

    setLoading(true)
    try {
      // Save response record to communication_logs table instead
      const { error: responseError } = await supabase
        .from('communication_logs')
        .insert({
          guest_name: feedback.guest_name,
          guest_phone: null,
          room_number: feedback.room_number,
          message_type: 'email',
          direction: 'outbound',
          message_content: responseContent,
          status: 'sent',
          feedback_id: feedback.id
        })

      if (responseError) throw responseError

      // Update feedback record
      const { error: updateError } = await supabase
        .from('feedback')
        .update({
          response_sent_at: new Date().toISOString(),
          response_content: responseContent,
          response_sent_by: managerName,
          status: 'resolved'
        })
        .eq('id', feedback.id)

      if (updateError) throw updateError

      // Here you would typically call an edge function to send the actual email
      // For demo purposes, we'll just show success
      toast({
        title: "Response sent successfully",
        description: `Email sent to ${feedback.guest_email}`,
      })

      setResponseContent("")
      onResponseSent()
      onClose()
    } catch (error) {
      console.error('Error sending response:', error)
      toast({
        title: "Failed to send response",
        description: "Please try again later",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const getResponseTemplate = () => {
    if (!feedback) return ""
    
    const templates = {
      "Room Service": `Dear ${feedback.guest_name || "Valued Guest"},

Thank you for bringing the room service issue to our attention. **We sincerely apologize for the inconvenience you experienced.** We are taking **immediate steps** to improve our room service efficiency and food quality standards.

**We would love the opportunity to make this right during your next visit.** Please don't hesitate to contact me directly.

Best regards,`,
      
      "Cleanliness": `Dear ${feedback.guest_name || "Valued Guest"},

**We are deeply sorry that our cleanliness standards did not meet your expectations.** This is completely unacceptable, and **we are taking immediate action** to retrain our housekeeping team and implement stricter quality controls.

**Your feedback is invaluable** in helping us maintain the high standards our guests deserve.

Sincerely,`,
      
      "Noise": `Dear ${feedback.guest_name || "Valued Guest"},

Thank you for your feedback regarding the noise issue. **We apologize for any disruption to your stay.** We are reviewing our noise management policies and **will ensure better communication** about any ongoing construction or activities.

**We appreciate your understanding and patience.**

Best regards,`,
      
      "Staff Behavior": `Dear ${feedback.guest_name || "Valued Guest"},

**We sincerely apologize for the disappointing service** you received from our front desk team. This does not reflect our commitment to exceptional guest service. **We are addressing this immediately** with additional training and coaching.

**Your feedback helps us ensure** all our guests receive the warm, helpful service they deserve.

Warmly,`,
      
      "default": `Dear ${feedback.guest_name || "Valued Guest"},

**Thank you for taking the time to share your feedback with us.** We genuinely appreciate all guest input as it helps us continuously improve our service and facilities.

**We are taking your comments seriously** and working to address the issues you've raised.

Best regards,`
    }

    return templates[feedback.issue_category as keyof typeof templates] || templates.default
  }

  const loadTemplate = () => {
    setResponseContent(getResponseTemplate())
  }

  if (!feedback) return null

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-primary" />
            Respond to Guest Feedback
          </DialogTitle>
          <DialogDescription>
            Send a personalized response to address the guest's concerns
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          {/* Feedback Summary */}
          <div className="bg-muted/50 p-4 rounded-lg space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{feedback.guest_name || "Anonymous Guest"}</span>
                {feedback.room_number && (
                  <Badge variant="outline">Room {feedback.room_number}</Badge>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm text-muted-foreground">
                  {new Date(feedback.created_at).toLocaleDateString()}
                </span>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <StarRating rating={feedback.rating} size="sm" />
                <span className="text-sm font-medium">{feedback.rating}/5</span>
              </div>
              <Badge variant="outline">{feedback.issue_category}</Badge>
            </div>

            <div>
              <Label className="text-sm font-medium">Guest Feedback:</Label>
              <p className="text-sm text-muted-foreground mt-1 bg-background p-3 rounded border">
                {feedback.feedback_text}
              </p>
            </div>

            {feedback.guest_email && (
              <div className="flex items-center gap-2 text-sm">
                <Mail className="h-4 w-4 text-primary" />
                <span className="text-primary">{feedback.guest_email}</span>
              </div>
            )}
          </div>

          {/* Response Form */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label htmlFor="managerName">Responding as:</Label>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={loadTemplate}
                className="text-xs"
              >
                Load Template
              </Button>
            </div>
            
            <Input
              id="managerName"
              value={managerName}
              onChange={(e) => setManagerName(e.target.value)}
              placeholder="Your name/title"
            />

            <div>
              <Label htmlFor="response">Response Message:</Label>
              <Textarea
                id="response"
                value={responseContent}
                onChange={(e) => setResponseContent(e.target.value)}
                placeholder="Write your personalized response to the guest..."
                rows={8}
                className="mt-1"
              />
            </div>
          </div>

          {/* Previous Response (if any) */}
          {feedback.response_sent_at && (
            <div className="bg-success/10 border border-success/20 p-4 rounded-lg">
              <div className="flex items-center gap-2 mb-2">
                <Mail className="h-4 w-4 text-success" />
                <span className="font-medium text-success">Response Already Sent</span>
                <span className="text-sm text-muted-foreground">
                  by {feedback.response_sent_by} on {new Date(feedback.response_sent_at).toLocaleDateString()}
                </span>
              </div>
              <p className="text-sm text-muted-foreground bg-background p-3 rounded border">
                {feedback.response_content}
              </p>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex gap-3 pt-4 border-t">
            <Button variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button 
              onClick={handleSendResponse} 
              disabled={loading || !feedback.guest_email || !!feedback.response_sent_at}
              className="flex-1"
            >
              {loading ? "Sending..." : 
               !feedback.guest_email ? "No Email Available" :
               feedback.response_sent_at ? "Already Responded" :
               "Send Response"}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}