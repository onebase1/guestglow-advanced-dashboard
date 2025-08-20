import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { StarRating } from "@/components/ui/star-rating"
import { Button } from "@/components/ui/button"
import { useState } from "react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"
import { GuestResponseModal } from "./GuestResponseModal"
import { MessageCircle, CheckCircle, Mail } from "lucide-react"
import { CommunicationLogsModal } from "./CommunicationLogsModal"

interface RecentFeedback {
  id: string
  guest_name: string | null
  guest_email: string | null
  room_number: string | null
  rating: number
  feedback_preview: string | null
  feedback_text: string
  issue_category: string | null
  status: string
  created_at: string
  response_sent_at?: string | null
  response_content?: string | null
  response_sent_by?: string | null
  workflow_status?: string | null
  ack_due?: string | null
  resolve_due?: string | null
  acknowledged_at?: string | null
  resolved_at?: string | null
}

interface RecentFeedbackTabProps {
  recentFeedback: RecentFeedback[]
  onStatusUpdate?: () => void
}

export function RecentFeedbackTab({ recentFeedback, onStatusUpdate }: RecentFeedbackTabProps) {
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null)
  const [selectedFeedback, setSelectedFeedback] = useState<RecentFeedback | null>(null)
  const [responseModalOpen, setResponseModalOpen] = useState(false)
  const [communicationLogsOpen, setCommunicationLogsOpen] = useState(false)
  const [selectedFeedbackForLogs, setSelectedFeedbackForLogs] = useState<RecentFeedback | null>(null)
  const { toast } = useToast()
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'success'
      case 'RESOLVED': return 'success'
    case 'ACKNOWLEDGED': return 'warning'
      case 'pending_review': return 'destructive'
      default: return 'secondary'
    }
  }

  const updateFeedbackStatus = async (feedbackId: string, newStatus: string) => {
    setUpdatingStatus(feedbackId)
    try {
      const fields: any = { status: newStatus }
      if (newStatus === 'resolved' || newStatus === 'RESOLVED') {
        fields.resolved_at = new Date().toISOString()
        fields.workflow_status = 'RESOLVED'
      }
      if (newStatus === 'acknowledged' || newStatus === 'ACKNOWLEDGED') {
        fields.acknowledged_at = new Date().toISOString()
        fields.workflow_status = 'ACKNOWLEDGED'
      }

      const { error } = await supabase
        .from('feedback')
        .update(fields)
        .eq('id', feedbackId)

      if (error) throw error

      // Trigger satisfaction follow-up email when resolved or reviewed_no_action
      if (newStatus === 'resolved' || newStatus === 'RESOLVED' || newStatus === 'REVIEWED_NO_ACTION') {
        try {
          await supabase.functions.invoke('send-satisfaction-followup', { body: { feedback_id: feedbackId } })
        } catch (_) {
          // non-blocking
        }
      }

      if (error) throw error

      toast({
        title: "Status updated",
        description: `Feedback marked as ${newStatus.replace('_', ' ')}`,
      })

      onStatusUpdate?.()
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      })
    } finally {
      setUpdatingStatus(null)
    }
  }

  const openResponseModal = (feedback: RecentFeedback) => {
    setSelectedFeedback(feedback)
    setResponseModalOpen(true)
  }

  const handleResponseSent = () => {
    onStatusUpdate?.()
    toast({
      title: "Response sent",
      description: "Guest has been notified via email",
    })
  }

  const openCommunicationLogs = (feedback: RecentFeedback) => {
    setSelectedFeedbackForLogs(feedback)
    setCommunicationLogsOpen(true)
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Internal Reviews</CardTitle>
        <CardDescription>
          Latest reviews from your guests
        </CardDescription>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {recentFeedback.map((feedback) => (
            <div key={feedback.id} className="group flex flex-col space-y-3 p-4 border rounded-lg hover:border-primary/30 hover:shadow-medium transition-all duration-200 sm:flex-row sm:items-start sm:space-y-0 sm:space-x-4">
              <div className="flex-1 space-y-3">
                <div className="flex flex-col space-y-3 sm:flex-row sm:items-start sm:justify-between sm:space-y-0">
                  <div className="flex flex-col space-y-2">
                    <div className="flex items-center gap-3">
                      <span className="font-semibold text-base">{feedback.guest_name || 'Anonymous'}</span>
                      <Badge variant="outline" className="text-xs">{feedback.room_number}</Badge>
                      <StarRating rating={feedback.rating} size="sm" />
                    </div>
                    <p className="text-sm text-muted-foreground line-clamp-2 leading-relaxed">{feedback.feedback_preview || 'No detailed feedback given'}</p>
                    <div className="flex items-center gap-2 text-xs text-muted-foreground">
                      <span className="font-medium">{feedback.issue_category}</span>
                      <span>•</span>
                      <span>{new Date(feedback.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                  <div className="flex flex-col gap-2 self-start">
                    <div className="flex flex-col gap-2">
                      {/* SLA Actions */}
                      <div className="flex gap-2 flex-wrap">
                        {/* Acknowledge visible if action required and not yet acknowledged */}
                        {((feedback.workflow_status === 'ACTION_REQUIRED' || feedback.workflow_status === 'OPTIONAL_FOLLOWUP') && !feedback.acknowledged_at) && (
                          <Button
                            size="sm"
                            onClick={() => updateFeedbackStatus(feedback.id, 'ACKNOWLEDGED')}
                            disabled={updatingStatus === feedback.id}
                            className="text-xs bg-yellow-500 hover:bg-yellow-600 text-white"
                          >
                            Acknowledge
                          </Button>
                        )}

                        {/* Resolve button */}
                        <Button
                          size="sm"
                          onClick={() => updateFeedbackStatus(feedback.id, 'RESOLVED')}
                          disabled={updatingStatus === feedback.id}
                          className="text-xs bg-success hover:bg-success/90 text-success-foreground"
                        >
                          Mark Resolved
                        </Button>

                        {/* Contact guest if email */}
                        {feedback.guest_email && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => openResponseModal(feedback)}
                            className="text-xs border-primary text-primary hover:bg-primary hover:text-primary-foreground"
                          >
                            Contact Guest
                          </Button>
                        )}

                        {/* Current basic status badge (legacy) */}
                        {feedback.status && (
                          <Badge variant={getStatusColor(feedback.status) as any} className="self-start text-xs">
                            {feedback.status.replace('_', ' ')}
                          </Badge>
                        )}
                      </div>

                      {/* Timers */}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {feedback.ack_due && (
                          <span>
                            Ack due: {new Date(feedback.ack_due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {feedback.resolve_due && (
                          <span>
                            Resolve due: {new Date(feedback.resolve_due).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        )}
                        {feedback.resolve_due && new Date(feedback.resolve_due) < new Date() && (
                          <Badge variant="destructive" className="text-[10px]">Overdue</Badge>
                        )}
                      </div>

                      {/* Follow-up status */}
                      <div className="flex gap-3 text-xs text-muted-foreground">
                        {feedback.followup_sent_at && (
                          <span>
                            Follow-up: <span className="font-medium">{feedback.followup_result || 'pending'}</span>
                          </span>
                        )}
                      </div>

                    </div>

                    <div className="flex gap-2">
                      {/* Communication Actions */}
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => openCommunicationLogs(feedback)}
                        className="text-xs h-7 px-2 text-primary hover:text-primary"
                      >
                        <Mail className="h-3 w-3 mr-1" />
                        View Emails
                      </Button>

                      {/* Response Status Display */}
                      {feedback.response_sent_at && (
                        <div className="flex items-center gap-1 text-xs text-success">
                          <CheckCircle className="h-3 w-3" />
                          Response sent
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      </CardContent>

      {/* Modals */}
      {selectedFeedback && (
        <GuestResponseModal
          feedback={selectedFeedback}
          isOpen={responseModalOpen}
          onClose={() => setResponseModalOpen(false)}
          onResponseSent={handleResponseSent}
        />
      )}

      {selectedFeedbackForLogs && (
        <CommunicationLogsModal
          feedbackId={selectedFeedbackForLogs.id}
          guestName={selectedFeedbackForLogs.guest_name || 'Anonymous'}
          isOpen={communicationLogsOpen}
          onClose={() => setCommunicationLogsOpen(false)}
        />
      )}
    </Card>
  )
}