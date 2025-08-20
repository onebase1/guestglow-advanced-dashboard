import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { 
  Workflow, 
  MessageSquare, 
  Clock, 
  Users, 
  Settings, 
  Play, 
  Pause,
  Webhook,
  Smartphone
} from "lucide-react"
import { supabase } from "@/integrations/supabase/client"
import { useToast } from "@/hooks/use-toast"

interface WorkflowData {
  id: string
  name: string
  description: string
  workflow_type: string
  trigger_event: string
  is_active: boolean
  created_at: string
}

interface WorkflowStep {
  id: string
  workflow_id: string
  step_order: number
  step_type: string
  step_config: any
  delay_minutes: number
}

interface CommunicationLog {
  id: string
  guest_name: string
  guest_phone: string
  room_number: string
  message_type: string
  direction: string
  message_content: string
  status: string
  created_at: string
}

interface StaffMember {
  id: string
  staff_name: string
  staff_phone: string
  department: string
  is_active: boolean
}

export function WorkflowManager() {
  const [workflows, setWorkflows] = useState<WorkflowData[]>([])
  const [communicationLogs, setCommunicationLogs] = useState<CommunicationLog[]>([])
  const [staffMembers, setStaffMembers] = useState<StaffMember[]>([])
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()

  useEffect(() => {
    loadWorkflowData()
  }, [])

  const loadWorkflowData = async () => {
    try {
      const [workflowsData, logsData, staffData] = await Promise.all([
        supabase.from('workflows').select('*').order('created_at', { ascending: false }),
        supabase.from('communication_logs').select('*').order('created_at', { ascending: false }).limit(50),
        supabase.from('staff_assignments').select('*').eq('is_active', true)
      ])

      if (workflowsData.data) setWorkflows(workflowsData.data)
      if (logsData.data) setCommunicationLogs(logsData.data)
      if (staffData.data) setStaffMembers(staffData.data)
    } catch (error) {
      console.error('Error loading workflow data:', error)
      toast({
        title: "Error loading workflows",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  const toggleWorkflow = async (workflowId: string, isActive: boolean) => {
    try {
      const { error } = await supabase
        .from('workflows')
        .update({ is_active: isActive })
        .eq('id', workflowId)

      if (error) throw error

      setWorkflows(prev => 
        prev.map(w => w.id === workflowId ? { ...w, is_active: isActive } : w)
      )

      toast({
        title: `Workflow ${isActive ? 'activated' : 'deactivated'}`
      })
    } catch (error) {
      console.error('Error toggling workflow:', error)
      toast({
        title: "Error updating workflow",
        variant: "destructive"
      })
    }
  }

  const getWorkflowTypeIcon = (type: string) => {
    switch (type) {
      case 'guest_feedback': return <MessageSquare className="h-4 w-4" />
      case 'review_monitoring': return <Smartphone className="h-4 w-4" />
      case 'issue_resolution': return <Settings className="h-4 w-4" />
      default: return <Workflow className="h-4 w-4" />
    }
  }

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered': return 'default'
      case 'read': return 'secondary'
      case 'failed': return 'destructive'
      default: return 'outline'
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto"></div>
          <p className="mt-2 text-muted-foreground">Loading workflows...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-primary">Workflow Management</h2>
          <p className="text-muted-foreground">Manage WhatsApp & SMS guest communication workflows</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline">
            <Webhook className="h-4 w-4 mr-2" />
            PMS Webhooks
          </Button>
          <Button>
            <Workflow className="h-4 w-4 mr-2" />
            New Workflow
          </Button>
        </div>
      </div>

      <Tabs defaultValue="workflows" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="workflows">Active Workflows</TabsTrigger>
          <TabsTrigger value="communications">Message Logs</TabsTrigger>
          <TabsTrigger value="staff">Staff Setup</TabsTrigger>
          <TabsTrigger value="settings">Settings</TabsTrigger>
        </TabsList>

        <TabsContent value="workflows" className="space-y-4">
          <div className="grid gap-4">
            {workflows.map((workflow) => (
              <Card key={workflow.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      {getWorkflowTypeIcon(workflow.workflow_type)}
                      <div>
                        <CardTitle className="text-lg">{workflow.name}</CardTitle>
                        <CardDescription>{workflow.description}</CardDescription>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <Badge variant="outline">{workflow.trigger_event.replace('_', ' ')}</Badge>
                      <Switch
                        checked={workflow.is_active}
                        onCheckedChange={(checked) => toggleWorkflow(workflow.id, checked)}
                      />
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="flex items-center gap-4 text-sm text-muted-foreground">
                    <span>Type: {workflow.workflow_type.replace('_', ' ')}</span>
                    <span>•</span>
                    <span>Created: {new Date(workflow.created_at).toLocaleDateString()}</span>
                    <span>•</span>
                      <Badge variant={workflow.is_active ? 'default' : 'secondary'}>
                        {workflow.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="communications" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Recent Communications</CardTitle>
              <CardDescription>WhatsApp & SMS message history</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {communicationLogs.map((log) => (
                  <div key={log.id} className="flex items-start space-x-4 p-4 border rounded-lg">
                    <div className="p-2 bg-muted rounded-full">
                      {log.message_type === 'whatsapp' ? 
                        <MessageSquare className="h-4 w-4" /> : 
                        <Smartphone className="h-4 w-4" />
                      }
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{log.guest_name || 'Unknown Guest'}</span>
                          <Badge variant="outline">{log.room_number}</Badge>
                          <Badge variant={log.direction === 'outbound' ? 'secondary' : 'default'}>
                            {log.direction}
                          </Badge>
                        </div>
                        <Badge variant={getStatusColor(log.status) as any}>
                          {log.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-muted-foreground">{log.message_content}</p>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{log.message_type.toUpperCase()}</span>
                        <span>•</span>
                        <span>{log.guest_phone}</span>
                        <span>•</span>
                        <span>{new Date(log.created_at).toLocaleString()}</span>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="staff" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Staff Assignments</CardTitle>
              <CardDescription>Manage staff notifications and assignments</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {staffMembers.map((staff) => (
                  <div key={staff.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center gap-3">
                      <div className="p-2 bg-muted rounded-full">
                        <Users className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="font-medium">{staff.staff_name}</p>
                        <p className="text-sm text-muted-foreground">{staff.staff_phone}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{staff.department}</Badge>
                      <Badge variant={staff.is_active ? 'default' : 'secondary'}>
                        {staff.is_active ? 'Active' : 'Inactive'}
                      </Badge>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="settings" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Workflow Settings</CardTitle>
              <CardDescription>Configure WhatsApp Business API and SMS settings</CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-4">
                <div>
                  <Label htmlFor="whatsapp-token">WhatsApp Business Token</Label>
                  <Textarea
                    id="whatsapp-token"
                    placeholder="Your WhatsApp Business API token will go here"
                    className="mt-1"
                    disabled
                  />
                  <p className="text-xs text-muted-foreground mt-1">
                    This will be configured when you set up your webhooks tomorrow
                  </p>
                </div>
                
                <div>
                  <Label htmlFor="sms-provider">SMS Provider</Label>
                  <Select disabled>
                    <SelectTrigger>
                      <SelectValue placeholder="Select SMS provider" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="twilio">Twilio</SelectItem>
                      <SelectItem value="nexmo">Vonage (Nexmo)</SelectItem>
                      <SelectItem value="messagebird">MessageBird</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="p-4 bg-muted/50 rounded-lg">
                  <h4 className="font-semibold mb-2">Ready for Integration</h4>
                  <p className="text-sm text-muted-foreground">
                    Your database and workflow foundation is ready. Tomorrow when you configure the actual webhooks:
                  </p>
                  <ul className="text-sm text-muted-foreground mt-2 space-y-1">
                    <li>• Replace mock data with real PMS webhooks</li>
                    <li>• Connect WhatsApp Business API</li>
                    <li>• Configure SMS provider credentials</li>
                    <li>• Test end-to-end workflows</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}