import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { StarRating } from '@/components/ui/star-rating';
import { useToast } from '@/hooks/use-toast';
import { CheckCircle, XCircle, Edit3, Copy, Clock, MessageSquare } from 'lucide-react';
import { LoadingSpinner } from '@/components/ui/loading-spinner';

interface ReviewResponse {
  id: string;
  external_review_id: string;
  response_text: string;
  status: 'draft' | 'approved' | 'rejected' | 'posted';
  created_at: string;
  updated_at: string;
  approved_at?: string;
  approved_by?: string;
  rejected_at?: string;
  rejection_reason?: string;
  posted_at?: string;
  ai_model_used?: string;
  response_version: number;
  manager_notes?: string;
  external_reviews: {
    provider: string;
    place_name: string;
    author_name: string;
    review_rating: number;
    review_text: string;
    review_date: string;
    sentiment?: string;
  };
}

interface ResponseManagementTabProps {
  onStatusUpdate?: () => void;
}

export function ResponseManagementTab({ onStatusUpdate }: ResponseManagementTabProps) {
  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [updating, setUpdating] = useState<string | null>(null);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    loadResponses();
  }, []);

  const loadResponses = async () => {
    try {
      const { data, error } = await supabase
        .from('review_responses')
        .select(`
          *,
          external_reviews (
            provider,
            place_name,
            author_name,
            review_rating,
            review_text,
            review_date,
            sentiment
          )
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error loading responses:', error);
        toast({
          title: "Error",
          description: "Failed to load responses",
          variant: "destructive",
        });
        return;
      }

      setResponses((data as ReviewResponse[]) || []);
    } catch (error) {
      console.error('Error loading responses:', error);
      toast({
        title: "Error",
        description: "Failed to load responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const updateResponseStatus = async (responseId: string, newStatus: 'approved' | 'rejected', rejectionReason?: string) => {
    setUpdating(responseId);
    try {
      const updateData: any = {
        status: newStatus,
        updated_at: new Date().toISOString(),
      };

      if (newStatus === 'approved') {
        updateData.approved_at = new Date().toISOString();
        updateData.approved_by = 'current_manager'; // You can get this from user context
      } else if (newStatus === 'rejected') {
        updateData.rejected_at = new Date().toISOString();
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('review_responses')
        .update(updateData)
        .eq('id', responseId);

      if (error) {
        console.error('Error updating response:', error);
        toast({
          title: "Error",
          description: "Failed to update response status",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: `Response ${newStatus} successfully`,
      });

      loadResponses();
      onStatusUpdate?.();

      // If rejected, trigger N8N workflow to regenerate
      if (newStatus === 'rejected') {
        await triggerResponseRegeneration(responseId, rejectionReason);
      }

    } catch (error) {
      console.error('Error updating response:', error);
      toast({
        title: "Error",
        description: "Failed to update response status",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const triggerResponseRegeneration = async (responseId: string, rejectionReason?: string) => {
    try {
      // Get the original response data to regenerate
      const { data: responseData, error: fetchError } = await supabase
        .from('review_responses')
        .select(`
          *,
          external_reviews (
            id,
            provider,
            author_name,
            review_rating,
            review_text,
            review_date,
            sentiment
          )
        `)
        .eq('id', responseId)
        .single();

      if (fetchError || !responseData) {
        throw new Error('Failed to fetch response data');
      }

      const review = responseData.external_reviews;

      // Extract specific issues from review text for personalized responses
      const reviewText = review.review_text.toLowerCase();
      const issues = [];

      // Common issue detection
      if (reviewText.includes('wifi') || reviewText.includes('internet')) issues.push('WiFi connectivity');
      if (reviewText.includes('breakfast')) issues.push('breakfast service');
      if (reviewText.includes('room service')) issues.push('room service timing');
      if (reviewText.includes('clean') || reviewText.includes('dirty')) issues.push('room cleanliness');
      if (reviewText.includes('air condition') || reviewText.includes('ac')) issues.push('air conditioning');
      if (reviewText.includes('staff') || reviewText.includes('service')) issues.push('staff service');
      if (reviewText.includes('shower') || reviewText.includes('water pressure')) issues.push('water pressure');
      if (reviewText.includes('noise') || reviewText.includes('loud')) issues.push('noise levels');

      // Create specific acknowledgment text
      const issueText = issues.length > 0
        ? `the specific issues you raised regarding **${issues.join(', ')}**`
        : 'the concerns you experienced during your stay';

      // Professional response template with proper formatting
      let newResponseText = `Dear ${review.author_name || 'Valued Guest'},

**Thank you for taking the time to share your valuable feedback with us.** We deeply appreciate your candid review as it helps us identify areas where we can enhance our service delivery.

I sincerely apologize for ${issueText}. This does not reflect the **exceptional standards we strive to maintain**, and we take full responsibility for not meeting your expectations. We have immediately addressed these concerns with our team and have implemented enhanced protocols to ensure better service delivery for all our guests.

Your feedback is instrumental in our continuous improvement efforts, and we would be honored to welcome you back to demonstrate the improvements we've made. Please feel free to contact me directly at **system-fallback@guest-glow.com** for your next visit, and I will personally ensure your experience exceeds expectations.

**Warm regards,**
The Eusbett Hotel Guest Relations Team`;

      // Add character count footer
      newResponseText += `

---
*Ready for platform posting* • **${newResponseText.length + 50} characters**`;

      // Mark current response as rejected and insert new draft
      await supabase
        .from('review_responses')
        .update({
          status: 'rejected',
          rejection_reason: rejectionReason,
          rejected_at: new Date().toISOString()
        })
        .eq('id', responseId);

      // Insert new draft response
      const { error: insertError } = await supabase
        .from('review_responses')
        .insert({
          external_review_id: review.id,
          response_text: newResponseText,
          status: 'draft',
          ai_model_used: 'regenerated-template',
          response_version: (responseData.response_version || 1) + 1,
          priority: review.review_rating <= 2 ? 'high' : 'normal'
        });

      if (insertError) {
        throw new Error('Failed to create new response');
      }

      toast({
        title: "Response Regenerated",
        description: "New draft response created with improved formatting and specific issue acknowledgment",
      });

      // Reload responses to show the new draft
      loadResponses();

    } catch (error) {
      console.error('Error regenerating response:', error);
      toast({
        title: "Regeneration Failed",
        description: "Failed to generate new response. Please try again.",
        variant: "destructive",
      });
    }
  };

  const updateResponseText = async (responseId: string, newText: string) => {
    setUpdating(responseId);
    try {
      const { error } = await supabase
        .from('review_responses')
        .update({
          response_text: newText,
          updated_at: new Date().toISOString(),
        })
        .eq('id', responseId);

      if (error) {
        console.error('Error updating response text:', error);
        toast({
          title: "Error",
          description: "Failed to update response text",
          variant: "destructive",
        });
        return;
      }

      toast({
        title: "Success",
        description: "Response text updated successfully",
      });

      loadResponses();
      setEditingResponse(null);
      setEditedText('');

    } catch (error) {
      console.error('Error updating response text:', error);
      toast({
        title: "Error",
        description: "Failed to update response text",
        variant: "destructive",
      });
    } finally {
      setUpdating(null);
    }
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      toast({
        title: "Copied",
        description: "Response copied to clipboard",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to copy to clipboard",
        variant: "destructive",
      });
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'draft': return 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300';
      case 'approved': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'rejected': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'posted': return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  const getSentimentColor = (sentiment: string) => {
    switch (sentiment?.toLowerCase()) {
      case 'positive': return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300';
      case 'negative': return 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300';
      case 'neutral': return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
      default: return 'bg-gray-100 text-gray-800 dark:bg-gray-900 dark:text-gray-300';
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <LoadingSpinner size="lg" />
      </div>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <MessageSquare className="h-5 w-5" />
          Response Management
        </CardTitle>
        <CardDescription>
          Review and manage AI-generated responses to external reviews
        </CardDescription>
      </CardHeader>
      <CardContent>
        {responses.length === 0 ? (
          <div className="text-center py-8 text-muted-foreground">
            No responses found. Responses will appear here once generated by your N8N workflow.
          </div>
        ) : (
          <div className="space-y-6">
            {responses.map((response) => (
              <div key={response.id} className="border rounded-lg p-4 space-y-4">
                <div className="flex items-start justify-between">
                  <div className="space-y-2 flex-1">
                    <div className="flex items-center gap-2 flex-wrap">
                      <Badge variant="outline">{response.external_reviews.provider}</Badge>
                      <Badge className={getStatusColor(response.status)}>
                        {response.status}
                      </Badge>
                      {response.external_reviews.sentiment && (
                        <Badge className={getSentimentColor(response.external_reviews.sentiment)}>
                          {response.external_reviews.sentiment}
                        </Badge>
                      )}
                      <span className="text-sm text-muted-foreground">
                        v{response.response_version}
                      </span>
                    </div>
                    <div className="space-y-1">
                      <p className="font-medium">{response.external_reviews.place_name}</p>
                      <p className="text-sm text-muted-foreground">
                        By {response.external_reviews.author_name} • {new Date(response.external_reviews.review_date).toLocaleDateString()}
                      </p>
                      <div className="flex items-center gap-2">
                        <StarRating rating={response.external_reviews.review_rating} size="sm" />
                        <span className="text-sm text-muted-foreground">
                          {response.external_reviews.review_rating}/5
                        </span>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => copyToClipboard(response.response_text)}
                    >
                      <Copy className="h-4 w-4" />
                    </Button>
                    {response.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setEditingResponse(response.id);
                          setEditedText(response.response_text);
                        }}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>

                <div className="space-y-3">
                  <div>
                    <h4 className="font-medium text-sm mb-2">Original Review:</h4>
                    <p className="text-sm bg-muted p-3 rounded">
                      {response.external_reviews.review_text}
                    </p>
                  </div>

                   <div className="bg-gradient-to-br from-background to-muted/30 border border-border rounded-xl p-6 shadow-sm">
                     <div className="flex items-center justify-between mb-4">
                       <h4 className="font-semibold text-lg flex items-center gap-2">
                         <MessageSquare className="h-5 w-5 text-primary" />
                         Professional Response
                       </h4>
                       <div className="flex items-center gap-2">
                         <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded-full">
                           {response.ai_model_used || 'AI Generated'}
                         </span>
                         <Button
                           variant="outline"
                           size="sm"
                           onClick={() => copyToClipboard(response.response_text)}
                           className="h-8 px-3"
                         >
                           <Copy className="h-3 w-3 mr-1" />
                           Copy
                         </Button>
                       </div>
                     </div>
                     
                     {editingResponse === response.id ? (
                       <div className="space-y-3">
                         <Textarea
                           value={editedText}
                           onChange={(e) => setEditedText(e.target.value)}
                           className="min-h-[200px] font-medium leading-relaxed resize-none"
                           placeholder="Edit the professional response..."
                         />
                         <div className="flex gap-2">
                           <Button
                             size="sm"
                             onClick={() => updateResponseText(response.id, editedText)}
                             disabled={updating === response.id}
                           >
                             {updating === response.id ? <LoadingSpinner size="sm" /> : 'Save Changes'}
                           </Button>
                           <Button
                             size="sm"
                             variant="outline"
                             onClick={() => {
                               setEditingResponse(null);
                               setEditedText('');
                             }}
                           >
                             Cancel
                           </Button>
                         </div>
                       </div>
                     ) : (
                       <div className="space-y-4">
                         <div className="prose prose-sm max-w-none">
                           <div 
                             className="whitespace-pre-wrap leading-relaxed font-medium text-foreground/95 select-all"
                             style={{ 
                               fontFamily: 'ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif',
                               lineHeight: '1.8',
                               fontSize: '0.95rem'
                             }}
                           >
                             {response.response_text}
                           </div>
                         </div>
                         
                         <div className="flex items-center justify-between pt-4 border-t border-border/50">
                           <div className="flex items-center gap-2 text-xs text-muted-foreground">
                             <Clock className="h-3 w-3" />
                             Ready for {response.external_reviews?.provider || 'platform'} posting
                           </div>
                           <div className="flex items-center gap-2">
                             <span className="text-xs text-muted-foreground">
                               {response.response_text.length} characters
                             </span>
                             <Button
                               variant="ghost"
                               size="sm"
                               onClick={() => copyToClipboard(response.response_text)}
                               className="h-7 px-2 text-xs hover:bg-primary/10"
                             >
                               <Copy className="h-3 w-3 mr-1" />
                               Quick Copy
                             </Button>
                           </div>
                         </div>
                       </div>
                     )}
                   </div>
                </div>

                {response.status === 'draft' && (
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      onClick={() => updateResponseStatus(response.id, 'approved')}
                      disabled={updating === response.id}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      {updating === response.id ? <LoadingSpinner size="sm" /> : <CheckCircle className="h-4 w-4 mr-1" />}
                      Approve
                    </Button>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => {
                        const reason = prompt('Please provide a reason for rejection (optional):');
                        updateResponseStatus(response.id, 'rejected', reason || undefined);
                      }}
                      disabled={updating === response.id}
                    >
                      {updating === response.id ? <LoadingSpinner size="sm" /> : <XCircle className="h-4 w-4 mr-1" />}
                      Reject & Regenerate
                    </Button>
                  </div>
                )}

                {response.status === 'rejected' && response.rejection_reason && (
                  <div className="bg-red-50 dark:bg-red-950 p-3 rounded">
                    <p className="text-sm font-medium text-red-800 dark:text-red-300 mb-1">
                      Rejection Reason:
                    </p>
                    <p className="text-sm text-red-700 dark:text-red-400">
                      {response.rejection_reason}
                    </p>
                  </div>
                )}

                <div className="text-xs text-muted-foreground pt-2 border-t">
                  <div className="flex items-center gap-4">
                    <span>Created: {new Date(response.created_at).toLocaleString()}</span>
                    <span>Model: {response.ai_model_used}</span>
                    {response.approved_at && (
                      <span>Approved: {new Date(response.approved_at).toLocaleString()}</span>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
}