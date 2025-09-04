import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface RequestRow {
  id: string
  tenant_id: string
  manager_email: string
  manager_name?: string | null
  note?: string | null
  requested_at: string
  status?: 'pending' | 'approved' | 'denied'
}

export default function AccessRequests() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { toast } = useToast()
  const [rows, setRows] = useState<RequestRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = async () => {
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('gm_access_requests')
        .select('*')
        .order('requested_at', { ascending: false })
      if (error) throw error
      setRows((data as any) || [])
    } catch (e: any) {
      toast({ title: 'Failed to load requests', description: e?.message, variant: 'destructive' })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const act = async (id: string, action: 'approve' | 'deny') => {
    try {
      const { error } = await supabase.functions.invoke('manage-access-request', {
        body: { action, request_id: id }
      })
      if (error) throw error
      toast({ title: `Request ${action}d` })
      await load()
    } catch (e: any) {
      toast({ title: 'Action failed', description: e?.message, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Access Requests</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div>Loading...</div>
          ) : rows.length === 0 ? (
            <div className="text-muted-foreground">No requests found.</div>
          ) : (
            <div className="space-y-3">
              {rows.map((r) => (
                <div key={r.id} className="p-4 rounded border flex items-center justify-between gap-4">
                  <div>
                    <div className="font-medium">{r.manager_name || '—'} <span className="text-muted-foreground">({r.manager_email})</span></div>
                    <div className="text-sm text-muted-foreground">Requested {new Date(r.requested_at).toLocaleString()} • Status: {r.status || 'pending'}</div>
                    {r.note && <div className="text-sm mt-1">Note: {r.note}</div>}
                  </div>
                  <div className="flex gap-2">
                    <Button variant="outline" onClick={() => act(r.id, 'deny')} disabled={r.status !== 'pending'}>Deny</Button>
                    <Button onClick={() => act(r.id, 'approve')} disabled={r.status !== 'pending'}>Approve</Button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

