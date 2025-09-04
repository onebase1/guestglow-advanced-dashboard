import { useEffect, useState } from 'react'
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ScrollArea } from '@/components/ui/scroll-area'
import { CommunicationLogsModal } from './CommunicationLogsModal'
import { StarRating } from '@/components/ui/star-rating'
import { MessageSquare, Clock, User, X } from 'lucide-react'

interface FeedbackDetailsPanelProps {
  isOpen: boolean
  onClose: () => void
  feedback: {
    id: string
    guest_name: string | null
    guest_email: string | null
    rating: number
    feedback_text: string
    issue_category: string | null
    status: string
    created_at: string
    response_sent_at?: string | null
  } | null
}

export default function FeedbackDetailsPanel({ isOpen, onClose, feedback }: FeedbackDetailsPanelProps) {
  const [logsOpen, setLogsOpen] = useState(false)

  useEffect(() => {
    if (!isOpen) setLogsOpen(false)
  }, [isOpen])

  if (!feedback) return null

  // Simple SLA visualization placeholder (reuse existing logic later)
  const created = new Date(feedback.created_at)
  const hoursSince = Math.round((Date.now() - created.getTime()) / 36e5)
  const slaVariant = hoursSince > 24 ? 'critical' : hoursSince > 4 ? 'high' : 'normal'

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="h-full max-w-[46vw] w-[46vw] fixed right-0 top-0 rounded-none border-l ml-auto">
        <div className="flex flex-col h-full w-full">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <MessageSquare className="h-5 w-5" />
                Feedback Details
              </DrawerTitle>
              <Button variant="ghost" size="sm" onClick={onClose} className="h-8 w-8 p-0">
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-hidden p-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
              <div className="lg:col-span-2 space-y-4">
                <div className="flex items-center gap-3">
                  <StarRating rating={feedback.rating} size="sm" />
                  <span className="text-sm font-medium">{feedback.rating}/5</span>
                  <Badge variant="outline">{feedback.issue_category || 'General'}</Badge>
                  <Badge variant="secondary">{feedback.status}</Badge>
                  <Badge variant={slaVariant === 'critical' ? 'destructive' : slaVariant === 'high' ? 'secondary' : 'outline'}>
                    <Clock className="h-3 w-3 mr-1" /> {hoursSince}h since
                  </Badge>
                </div>
                <div className="text-sm text-muted-foreground">Created {created.toLocaleString()}</div>
                <div className="border rounded-md p-4 text-sm leading-relaxed">
                  {feedback.feedback_text}
                </div>
              </div>

              <div className="space-y-4">
                <div className="border rounded-md p-4">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2"><User className="h-4 w-4" /> Guest</div>
                  <div className="text-sm">{feedback.guest_name || 'Anonymous'}</div>
                  <div className="text-xs text-muted-foreground">{feedback.guest_email || '—'}</div>
                </div>

                <div className="border rounded-md p-4">
                  <div className="text-sm font-medium mb-2 flex items-center gap-2"><Clock className="h-4 w-4" /> Communication</div>
                  <Button size="sm" variant="outline" onClick={() => setLogsOpen(true)}>View email history</Button>
                </div>
              </div>
            </div>
          </div>

          <div className="border-t p-4 flex gap-2 justify-end">
            <Button variant="secondary">Acknowledge</Button>
            <Button>Reply</Button>
            <Button variant="outline">Escalate</Button>
            <Button variant="default">Resolve</Button>
          </div>
        </div>
      </DrawerContent>

      {feedback && (
        <CommunicationLogsModal
          feedbackId={feedback.id}
          guestName={feedback.guest_name || 'Anonymous'}
          isOpen={logsOpen}
          onClose={() => setLogsOpen(false)}
        />
      )}
    </Drawer>
  )
}

