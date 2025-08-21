import { useEffect, useRef, useState } from 'react'
import { supabase } from '@/integrations/supabase/client'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { LoadingSpinner } from '@/components/ui/loading-spinner'

interface Message {
  id?: string
  attempt_timestamp?: string
  direction: 'inbound' | 'outbound' | 'internal'
  guest_phone?: string | null
  message_content?: string | null
}

export default function WhatsAppInbox() {
  const [messages, setMessages] = useState<Message[]>([])
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [reply, setReply] = useState('')
  const [to, setTo] = useState('')
  const listRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    const el = listRef.current
    if (el) el.scrollTop = el.scrollHeight
  }

  const load = async () => {
    setLoading(true)
    const { data, error } = await supabase
      .from('communication_logs')
      .select('id, attempt_timestamp, direction, guest_phone, message_content')
      .eq('message_type', 'whatsapp')
      .order('attempt_timestamp', { ascending: true })
      .limit(100)
    if (!error && data) {
      setMessages(data as any)
      // scroll after next paint
      setTimeout(scrollToBottom, 0)
    }
    setLoading(false)
  }

  useEffect(() => {
    load()

    // realtime: new whatsapp messages
    const channel = supabase
      .channel('wa-inbox')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'communication_logs', filter: 'message_type=eq.whatsapp' },
        (payload: any) => {
          setMessages((prev) => [...prev, payload.new as Message])
          setTimeout(scrollToBottom, 0)
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [])

  const sendReply = async () => {
    if (!reply || !to) {
      console.log('WhatsApp send: Missing reply or to field', { reply, to })
      return
    }

    if (sending) {
      console.log('WhatsApp send: Already sending, ignoring click')
      return
    }

    console.log('WhatsApp send: Starting send process', { to, reply })
    setSending(true)

    try {
      // 1) send via edge function
      console.log('WhatsApp send: Invoking whatsapp-send function')
      const { data, error } = await supabase.functions.invoke('whatsapp-send', {
        body: { action: 'send_text', to, text: reply, dry_run: false }
      })

      console.log('WhatsApp send: Function response', { data, error })

      if (error) {
        console.error('WhatsApp send: Function error', error)
        alert(`WhatsApp send failed: ${error.message}`)
        return
      }

      // 2) log outbound so it shows up immediately
      console.log('WhatsApp send: Logging to communication_logs')
      const { error: logError } = await supabase.from('communication_logs').insert({
        message_type: 'whatsapp',
        direction: 'outbound',
        guest_phone: to,
        message_content: reply,
        status: 'sent',
        attempt_timestamp: new Date().toISOString()
      })

      if (logError) {
        console.error('WhatsApp send: Log error', logError)
      }

      console.log('WhatsApp send: Success, clearing reply field')
      setReply('')

      // Refresh messages to show the new outbound message
      setTimeout(load, 500)

    } catch (err) {
      console.error('WhatsApp send: Unexpected error', err)
      alert(`WhatsApp send failed: ${err}`)
    } finally {
      setSending(false)
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>WhatsApp Inbox</CardTitle>
        <CardDescription>Inbound/Outbound messages. Basic view styled like WhatsApp.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex items-center gap-2 mb-4">
          <Input placeholder="To number e.g. +447557679989" value={to} onChange={e => setTo(e.target.value)} />
          <Input
            placeholder="Type a reply..."
            value={reply}
            onChange={e => setReply(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter' && !sending) sendReply() }}
            disabled={sending}
          />
          <Button onClick={sendReply} disabled={sending || !reply || !to}>
            {sending ? 'Sending...' : 'Send'}
          </Button>
          <Button variant="outline" onClick={load} disabled={loading}>
            {loading ? 'Loading...' : 'Refresh'}
          </Button>
        </div>

        {loading ? (
          <div className="flex items-center gap-2 text-muted-foreground"><LoadingSpinner size="sm" /> Loading...</div>
        ) : (
          <div className="relative rounded-md border overflow-hidden">
            {/* WhatsApp-like subtle wallpaper */}
            <div className="absolute inset-0 opacity-40 pointer-events-none"
                 style={{ backgroundImage: 'radial-gradient(#e5e7eb 1px, transparent 1px)', backgroundSize: '16px 16px' }} />

            {/* Messages list */}
            <div ref={listRef} className="relative z-10 max-h-[460px] overflow-auto p-3 space-y-2 bg-[#efeae2]/30">
              {messages.length === 0 ? (
                <div className="text-sm text-muted-foreground">No messages yet.</div>
              ) : (
                messages.map((m) => (
                  <div key={m.id} className={`flex ${m.direction === 'outbound' ? 'justify-end' : 'justify-start'}`}>
                    <div className={`max-w-[75%] px-3 py-2 rounded-lg shadow text-sm whitespace-pre-wrap ${m.direction === 'outbound' ? 'bg-[#dcf8c6]' : 'bg-white'}`}>
                      {m.message_content}
                      <div className="mt-1 text-[10px] text-muted-foreground text-right">
                        {new Date(m.attempt_timestamp || '').toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}
