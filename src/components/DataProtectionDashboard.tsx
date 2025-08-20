import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Shield, Download, Trash2, Clock, AlertTriangle } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';

interface DataRetentionPolicy {
  id: string;
  data_type: string;
  retention_days: number;
  auto_delete: boolean;
  created_at: string;
}

interface DataExportRequest {
  id: string;
  requester_email: string;
  request_type: string;
  status: string;
  data_types: string[];
  export_file_url?: string;
  created_at: string;
  completed_at?: string;
}

interface SecurityAuditLog {
  id: string;
  action: string;
  resource: string;
  ip_address: string;
  success: boolean;
  created_at: string;
  details: any;
}

interface DataProtectionDashboardProps {
  tenantId: string;
}

export const DataProtectionDashboard = ({ tenantId }: DataProtectionDashboardProps) => {
  const [retentionPolicies, setRetentionPolicies] = useState<DataRetentionPolicy[]>([]);
  const [exportRequests, setExportRequests] = useState<DataExportRequest[]>([]);
  const [auditLogs, setAuditLogs] = useState<SecurityAuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadDataProtectionData();
  }, [tenantId]);

  const loadDataProtectionData = async () => {
    try {
      const [policiesData, requestsData, logsData] = await Promise.all([
        supabase
          .from('data_retention_policies')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false }),
        supabase
          .from('data_export_requests')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(10),
        supabase
          .from('security_audit_logs')
          .select('*')
          .eq('tenant_id', tenantId)
          .order('created_at', { ascending: false })
          .limit(20)
      ]);

      if (policiesData.error) throw policiesData.error;
      if (requestsData.error) throw requestsData.error;
      if (logsData.error) throw logsData.error;

      setRetentionPolicies(policiesData.data || []);
      setExportRequests(requestsData.data || []);
      setAuditLogs(logsData.data || []);
    } catch (error) {
      console.error('Error loading data protection data:', error);
      toast({
        title: "Error",
        description: "Failed to load data protection information",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const handleDataExport = async (email: string) => {
    try {
      const { data, error } = await supabase
        .from('data_export_requests')
        .insert({
          tenant_id: tenantId,
          requester_email: email,
          request_type: 'export',
          data_types: ['feedback', 'external_reviews'],
          status: 'pending'
        })
        .select()
        .single();

      if (error) throw error;

      toast({
        title: "Export Request Created",
        description: "Data export request has been submitted and will be processed within 30 days.",
      });

      loadDataProtectionData();
    } catch (error) {
      console.error('Error creating export request:', error);
      toast({
        title: "Error",
        description: "Failed to create data export request",
        variant: "destructive",
      });
    }
  };

  const handleDataDeletion = async (email: string) => {
    try {
      const { data, error } = await supabase.rpc('delete_user_data', {
        p_tenant_id: tenantId,
        p_email: email
      });

      if (error) throw error;

      toast({
        title: "Data Deleted",
        description: `All data for ${email} has been permanently deleted.`,
      });

      loadDataProtectionData();
    } catch (error) {
      console.error('Error deleting user data:', error);
      toast({
        title: "Error",
        description: "Failed to delete user data",
        variant: "destructive",
      });
    }
  };

  const runDataCleanup = async () => {
    try {
      const { data, error } = await supabase.rpc('cleanup_expired_data');

      if (error) throw error;

      toast({
        title: "Data Cleanup Complete",
        description: `${data || 0} expired records were removed according to retention policies.`,
      });

      loadDataProtectionData();
    } catch (error) {
      console.error('Error running data cleanup:', error);
      toast({
        title: "Error",
        description: "Failed to run data cleanup",
        variant: "destructive",
      });
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading data protection dashboard...</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6" />
          Data Protection & Compliance
        </h2>
        <Button onClick={runDataCleanup} variant="outline">
          <Trash2 className="h-4 w-4 mr-2" />
          Run Data Cleanup
        </Button>
      </div>

      <Tabs defaultValue="policies" className="space-y-4">
        <TabsList>
          <TabsTrigger value="policies">Retention Policies</TabsTrigger>
          <TabsTrigger value="requests">Export Requests</TabsTrigger>
          <TabsTrigger value="audit">Security Audit</TabsTrigger>
        </TabsList>

        <TabsContent value="policies" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Clock className="h-5 w-5" />
                Data Retention Policies
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {retentionPolicies.map((policy) => (
                  <div key={policy.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div>
                      <h3 className="font-medium capitalize">{policy.data_type.replace('_', ' ')}</h3>
                      <p className="text-sm text-muted-foreground">
                        Retained for {policy.retention_days} days
                      </p>
                    </div>
                    <Badge variant={policy.auto_delete ? "default" : "secondary"}>
                      {policy.auto_delete ? "Auto-delete enabled" : "Manual cleanup"}
                    </Badge>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Download className="h-5 w-5" />
                GDPR Data Export Requests
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {exportRequests.length === 0 ? (
                  <p className="text-muted-foreground">No data export requests found.</p>
                ) : (
                  exportRequests.map((request) => (
                    <div key={request.id} className="flex items-center justify-between p-4 border rounded-lg">
                      <div>
                        <h3 className="font-medium">{request.requester_email}</h3>
                        <p className="text-sm text-muted-foreground">
                          {request.request_type} request • {new Date(request.created_at).toLocaleDateString()}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          Data types: {request.data_types.join(', ')}
                        </p>
                      </div>
                      <Badge 
                        variant={
                          request.status === 'completed' ? 'default' :
                          request.status === 'failed' ? 'destructive' :
                          'secondary'
                        }
                      >
                        {request.status}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="audit" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <AlertTriangle className="h-5 w-5" />
                Security Audit Logs
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {auditLogs.length === 0 ? (
                  <p className="text-muted-foreground">No security audit logs found.</p>
                ) : (
                  auditLogs.map((log) => (
                    <div key={log.id} className="flex items-center justify-between p-3 border rounded text-sm">
                      <div>
                        <span className="font-medium">{log.action}</span>
                        {log.resource && <span className="text-muted-foreground"> on {log.resource}</span>}
                        <div className="text-xs text-muted-foreground">
                          {new Date(log.created_at).toLocaleString()} • IP: {log.ip_address}
                        </div>
                      </div>
                      <Badge variant={log.success ? "default" : "destructive"}>
                        {log.success ? "Success" : "Failed"}
                      </Badge>
                    </div>
                  ))
                )}
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};
