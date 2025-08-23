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
  const [widenComments, setWidenComments] = useState(false)
  const { toast } = useToast()
  const getStatusColor = (status: string) => {
    switch (status) {
      case 'resolved': return 'success'
      case 'RESOLVED': return 'success'
      case 'ACKNOWLEDGED': return 'warning'
      case 'ACTION_REQUIRED': return 'destructive'
      case 'AUTO_RESPONDED': return 'secondary'
      default: return 'secondary'
    }
  }
  const getStatusLabel = (f: RecentFeedback) => {
    const ws = f.workflow_status?.toUpperCase()
    if (ws === 'RESOLVED') return 'Resolved'
    if (ws === 'ACKNOWLEDGED') return 'Acknowledged'
    if (ws === 'ACTION_REQUIRED') return 'Action Required'
    if (ws === 'AUTO_RESPONDED') return 'Auto Responded'
    if (f.resolved_at) return 'Resolved'
    if (f.response_sent_at) return 'Responded'
    return 'New'
  }

  const getStatusDot = (f: RecentFeedback) => {
    const ws = (f.workflow_status || '').toUpperCase()
    if (ws === 'RESOLVED' || f.resolved_at) return 'bg-emerald-500'
    if (ws === 'ACKNOWLEDGED') return 'bg-amber-500'
    if (ws === 'ACTION_REQUIRED') return 'bg-rose-500'
    if (ws === 'AUTO_RESPONDED') return 'bg-sky-500'
    return 'bg-gray-400'
  }
  const gridTemplate = widenComments
    ? 'md:grid-cols-[110px,110px,120px,110px,160px,2fr,140px,80px,130px]'
    : 'md:grid-cols-[110px,110px,120px,110px,160px,1fr,140px,80px,130px]'

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
        <div className="rounded-lg border border-gray-200 dark:border-gray-800 overflow-hidden">
          <div className={`hidden md:grid ${widenComments ? 'grid-cols-[110px,110px,120px,110px,160px,2fr,140px,80px,130px]' : 'grid-cols-[110px,110px,120px,110px,160px,1fr,140px,80px,130px]'} bg-gray-50 dark:bg-gray-800/50 text-[11px] uppercase tracking-wide text-gray-600 dark:text-gray-300 px-4 py-2`}>
            <div className="self-center">Date</div>
            <div className="self-center pl-3">Source</div>
            <div className="self-center pl-3">Category</div>
            <div className="self-center pl-3">Rating</div>
            <div className="self-center pl-3">Guest</div>
            <div className="self-center pl-5">Comment</div>
            <div className="self-center">Status</div>
            <div className="self-center">Emails</div>
            <div className="self-center text-right">Actions</div>
          </div>
          <div className="divide-y divide-gray-200 dark:divide-gray-800">
            {recentFeedback.map((feedback) => (
              <div
                key={feedback.id}
                className={`grid grid-cols-1 ${gridTemplate} items-center gap-3 px-4 py-3 bg-white dark:bg-gray-900 hover:bg-gray-50 dark:hover:bg-gray-900/80 transition`}
              >
                <div className="text-xs text-muted-foreground">{new Date(feedback.created_at).toLocaleDateString()}</div>
                <div className="flex items-center gap-2">
                  <Badge variant="outline" className="text-[10px]">Internal</Badge>
                </div>
                <div className="text-xs text-muted-foreground pl-3">{feedback.issue_category || 'General'}</div>
                <div className="flex items-center gap-2 pl-3">
                  <StarRating rating={feedback.rating} size="sm" />
                </div>
                <div className="text-xs text-muted-foreground truncate pl-3">{feedback.guest_name || 'Anonymous'}</div>
                <div className="min-w-0 pr-2 pl-5">
                  <p className="text-sm text-gray-800 dark:text-gray-200 break-words overflow-hidden line-clamp-1 md:line-clamp-2 leading-5">{feedback.feedback_preview || feedback.feedback_text || 'No details'}</p>
                  <div className="text-[10px] text-muted-foreground mt-1 truncate leading-4">Room {feedback.room_number || '-'} • {feedback.issue_category || 'Uncategorized'}</div>
                </div>
                {/* Status */}
                <div className="flex items-center gap-2">
                  <span className={`inline-block h-2.5 w-2.5 rounded-full ${getStatusDot(feedback)}`} />
                  <span className="text-xs text-muted-foreground">{getStatusLabel(feedback)}</span>
                </div>
                {/* Emails */}
                <div className="flex items-center">
                  <Button size="icon" variant="ghost" onClick={() => openCommunicationLogs(feedback)} className="h-8 w-8" title="View email history">
                    <Mail className="h-4 w-4" />
                  </Button>
                </div>
                {/* Actions */}
                <div className="flex justify-end items-center gap-2">
                  <Button
                    size="sm"
                    onClick={() => updateFeedbackStatus(feedback.id, 'RESOLVED')}
                    disabled={updatingStatus === feedback.id}
                    className="h-8 bg-emerald-500 hover:bg-emerald-600 text-white"
                    title="Mark issue resolved to stop escalations"
                  >
                    Resolve
                  </Button>
                </div>
              </div>
            ))}
          </div>
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