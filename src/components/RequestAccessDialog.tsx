import { useState } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/hooks/use-toast"
import { supabase } from "@/integrations/supabase/client"

interface Props {
  tenantSlug: string
  tenantId?: string
  triggerClassName?: string
  triggerText?: string
  emailPrefill?: string
}

export function RequestAccessDialog({ tenantSlug, tenantId, triggerClassName, triggerText = 'Request access', emailPrefill }: Props) {
  const { toast } = useToast()
  const [open, setOpen] = useState(false)
  const [submitting, setSubmitting] = useState(false)
  const [name, setName] = useState("")
  const [email, setEmail] = useState(emailPrefill || "")
  const [note, setNote] = useState("")

  const submit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!email) {
      toast({ title: 'Email is required', variant: 'destructive' })
      return
    }

    setSubmitting(true)
    try {
      // Prefer functions.invoke to keep base URL/env consistent
      const { error } = await supabase.functions.invoke('request-dashboard-access', {
        body: {
          tenant_id: tenantId,
          manager_email: email,
          manager_name: name || undefined,
          note: note || undefined,
        }
      })
      if (error) throw error

      toast({ title: 'Request submitted', description: 'We will review and grant access if appropriate.' })
      setOpen(false)
      setName("")
      setNote("")
    } catch (err: any) {
      toast({ title: 'Failed to submit request', description: err?.message || 'Try again later', variant: 'destructive' })
    } finally {
      setSubmitting(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" className={triggerClassName}>{triggerText}</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request dashboard access</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Your name (optional)</Label>
            <Input id="name" value={name} onChange={(e) => setName(e.target.value)} placeholder="John Doe" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Work email</Label>
            <Input id="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder="name@hotel.com" />
          </div>
          <div className="space-y-2">
            <Label htmlFor="note">Note (optional)</Label>
            <Textarea id="note" value={note} onChange={(e) => setNote(e.target.value)} placeholder={`Tell us which property/role you need access to (${tenantSlug})`} />
          </div>
          <div className="flex gap-2">
            <Button type="submit" disabled={submitting} className="w-full">{submitting ? 'Submitting...' : 'Submit request'}</Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}

