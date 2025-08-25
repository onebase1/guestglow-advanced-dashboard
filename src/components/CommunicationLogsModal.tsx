import { useState, useEffect } from 'react';
import { Drawer, DrawerContent, DrawerHeader, DrawerTitle } from '@/components/ui/drawer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { ScrollArea } from '@/components/ui/scroll-area';
import { supabase } from '@/integrations/supabase/client';
import { Mail, User, AlertTriangle, Copy, CheckCircle, X } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { processEmailContent } from '@/utils/emailContentProcessor';

interface CommunicationLog {
  id: string;
  created_at: string;
  feedback_id?: string;
  email_subject?: string;
  email_html?: string;
  recipient_email?: string;
  email_type?: string;
  ai_generated?: boolean;
  sent?: boolean;
  status?: string;
  message_content?: string;
  guest_name?: string;
  room_number?: string;
}

interface CommunicationLogsModalProps {
  feedbackId: string;
  guestName: string;
  isOpen: boolean;
  onClose: () => void;
}

export function CommunicationLogsModal({ feedbackId, guestName, isOpen, onClose }: CommunicationLogsModalProps) {
  const [logs, setLogs] = useState<CommunicationLog[]>([]);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    if (isOpen && feedbackId) {
      loadCommunicationLogs();
    }
  }, [isOpen, feedbackId]);

  const loadCommunicationLogs = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('communication_logs')
        .select('*')
        .eq('feedback_id', feedbackId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setLogs(data || []);
    } catch (error) {
      // Communication logs loading failed
      toast({
        title: "Error loading communication logs",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const copyToClipboard = async (text: string, type: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: `${type} copied to clipboard`,
        description: "Ready to paste anywhere"
      });
    } catch (error) {
      toast({
        title: "Failed to copy",
        variant: "destructive"
      });
    }
  };

  const guestEmails = logs.filter(log => log.email_type === 'guest_thank_you');
  const managerEmails = logs.filter(log => log.email_type === 'manager_alert');

  const renderEmailCard = (log: CommunicationLog) => (
    <Card key={log.id} className="mb-4">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-lg flex items-center gap-2">
            {log.email_type === 'guest_thank_you' ? (
              <Mail className="h-5 w-5 text-blue-500" />
            ) : (
              <AlertTriangle className="h-5 w-5 text-orange-500" />
            )}
            {log.email_subject}
          </CardTitle>
          <div className="flex gap-2">
            {log.ai_generated && (
              <Badge variant="secondary">AI Generated</Badge>
            )}
            <Badge variant={log.sent ? "default" : "outline"}>
              {log.sent ? "Sent" : "Draft"}
            </Badge>
          </div>
        </div>
        <div className="flex items-center gap-4 text-sm text-muted-foreground">
          <span>To: {log.recipient_email}</span>
          <span>Created: {new Date(log.created_at).toLocaleString()}</span>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <div className="flex gap-2">
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(log.email_subject, 'Subject')}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy Subject
            </Button>
            <Button
              size="sm"
              variant="outline"
              onClick={() => copyToClipboard(log.email_html, 'Email Content')}
            >
              <Copy className="h-4 w-4 mr-1" />
              Copy Email
            </Button>
          </div>
          
          <div className="w-full border rounded-md p-4">
            <div className="space-y-4 text-sm leading-relaxed">
              {log.email_html ? (
                (() => {
                  // Process email content with professional processor
                  const processed = processEmailContent(log.email_html);

                  return (
                    <div>
                      {processed.warnings.length > 0 && (
                        <div className="mb-2 text-xs text-amber-600 bg-amber-50 p-2 rounded">
                          ⚠️ Content processed: {processed.warnings.join(', ')}
                        </div>
                      )}
                      <div
                        className="prose prose-sm max-w-none dark:prose-invert [&_p]:text-foreground [&_p]:leading-relaxed [&_p]:mb-3"
                        dangerouslySetInnerHTML={{ __html: processed.html }}
                      />
                    </div>
                  );
                })()
              ) : (
                <p className="text-muted-foreground italic">No content available</p>
              )}
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <Drawer open={isOpen} onOpenChange={onClose} direction="right">
      <DrawerContent className="h-full max-w-[50vw] w-[50vw] fixed right-0 top-0 rounded-none border-l ml-auto">
        <div className="flex flex-col h-full w-full">
          <DrawerHeader className="border-b">
            <div className="flex items-center justify-between">
              <DrawerTitle className="flex items-center gap-2">
                <Mail className="h-5 w-5" />
                Communication History - {guestName}
              </DrawerTitle>
              <Button
                variant="ghost"
                size="sm"
                onClick={onClose}
                className="h-8 w-8 p-0"
              >
                <X className="h-4 w-4" />
                <span className="sr-only">Close</span>
              </Button>
            </div>
          </DrawerHeader>

          <div className="flex-1 overflow-hidden p-6">
            {loading ? (
              <div className="flex items-center justify-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
              </div>
            ) : logs.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No communication logs found for this feedback.
              </div>
            ) : (
              <Tabs defaultValue="guest" className="h-full flex flex-col">
                <TabsList className="grid w-full grid-cols-2">
                  <TabsTrigger value="guest" className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Guest Emails ({guestEmails.length})
                  </TabsTrigger>
                  <TabsTrigger value="manager" className="flex items-center gap-2">
                    <AlertTriangle className="h-4 w-4" />
                    Manager Alerts ({managerEmails.length})
                  </TabsTrigger>
                </TabsList>

                <TabsContent value="guest" className="flex-1 mt-4 overflow-hidden">
                  <ScrollArea className="h-full">
                    {guestEmails.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No guest emails found
                      </div>
                    ) : (
                      guestEmails.map(renderEmailCard)
                    )}
                  </ScrollArea>
                </TabsContent>

                <TabsContent value="manager" className="flex-1 mt-4 overflow-hidden">
                  <ScrollArea className="h-full">
                    {managerEmails.length === 0 ? (
                      <div className="text-center py-8 text-muted-foreground">
                        No manager alerts found
                      </div>
                    ) : (
                      managerEmails.map(renderEmailCard)
                    )}
                  </ScrollArea>
                </TabsContent>
              </Tabs>
            )}
          </div>
        </div>
      </DrawerContent>
    </Drawer>
  );
}