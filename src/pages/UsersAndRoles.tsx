import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useToast } from '@/hooks/use-toast'
import { supabase } from '@/integrations/supabase/client'

interface RoleRow { user_id: string, tenant_id: string, role: string, is_active: boolean }
interface Tenant { id: string, slug: string, name: string }

export default function UsersAndRoles() {
  const { tenantSlug } = useParams<{ tenantSlug: string }>()
  const { toast } = useToast()
  const [tenant, setTenant] = useState<Tenant | null>(null)
  const [rows, setRows] = useState<RoleRow[]>([])
  const [loading, setLoading] = useState(true)

  const [inviteEmail, setInviteEmail] = useState('')
  const [inviteRole, setInviteRole] = useState<'admin'|'manager'|'staff'|'viewer'>('manager')

  useEffect(() => {
    const load = async () => {
      try {
        const { data: t } = await supabase.from('tenants').select('id,slug,name').eq('slug', tenantSlug).single()
        if (t) setTenant(t as any)
        const { data: r } = await supabase.from('user_roles').select('*').eq('tenant_id', (t as any)?.id)
        setRows((r as any) || [])
      } catch (e: any) {
        toast({ title: 'Failed to load users', description: e?.message, variant: 'destructive' })
      } finally {
        setLoading(false)
      }
    }
    load()
  }, [tenantSlug])

  const invite = async () => {
    if (!tenant || !inviteEmail) return
    try {
      const { error } = await supabase.functions.invoke('admin-invite-user', {
        body: { tenant_id: tenant.id, email: inviteEmail, role: inviteRole }
      })
      if (error) throw error
      toast({ title: 'Invitation sent' })
      setInviteEmail('')
    } catch (e: any) {
      toast({ title: 'Invitation failed', description: e?.message, variant: 'destructive' })
    }
  }

  return (
    <div className="min-h-screen flex items-start justify-center bg-gray-50 dark:bg-gray-950 px-4 py-8">
      <Card className="w-full max-w-3xl">
        <CardHeader>
          <CardTitle>Users & Roles</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2 items-end mb-4">
            <div className="flex-1">
              <label className="text-sm">Invite email</label>
              <Input value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} placeholder="manager@hotel.com" />
            </div>
            <div>
              <label className="text-sm">Role</label>
              <Select value={inviteRole} onValueChange={(v: any) => setInviteRole(v)}>
                <SelectTrigger className="w-[180px]"><SelectValue placeholder="Role" /></SelectTrigger>
                <SelectContent>
                  <SelectItem value="admin">Admin</SelectItem>
                  <SelectItem value="manager">Manager</SelectItem>
                  <SelectItem value="staff">Staff</SelectItem>
                  <SelectItem value="viewer">Viewer</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <Button onClick={invite} disabled={!inviteEmail || !tenant}>Invite</Button>
          </div>

          {loading ? (
            <div>Loading...</div>
          ) : (
            <div className="space-y-2">
              {rows.map((r) => (
                <div key={`${r.user_id}-${r.role}`} className="p-3 border rounded flex items-center justify-between">
                  <div>
                    <div className="text-sm text-muted-foreground">User: {r.user_id}</div>
                    <div className="text-sm">Role: {r.role} • Active: {String(r.is_active)}</div>
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

