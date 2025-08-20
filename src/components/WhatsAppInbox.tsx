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
    if (!reply || !to) return

    // 1) send via edge function
    await supabase.functions.invoke('whatsapp-send', {
      body: { action: 'send_text', to, text: reply, dry_run: false }
    })

    // 2) log outbound so it shows up immediately
    await supabase.from('communication_logs').insert({
      message_type: 'whatsapp',
      direction: 'outbound',
      guest_phone: to,
      message_content: reply,
      status: 'sent',
      attempt_timestamp: new Date().toISOString()
    })

    setReply('')
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
          <Input placeholder="Type a reply..." value={reply} onChange={e => setReply(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter') sendReply() }} />
          <Button onClick={sendReply}>Send</Button>
          <Button variant="outline" onClick={load}>Refresh</Button>
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
