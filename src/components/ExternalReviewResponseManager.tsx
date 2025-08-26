import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { generateAutoResponse } from '@/utils/autoResponseGenerator';
import {
  createHumanLikeResponsePrompt,
  getImprovedSystemPrompt,
  PLATFORM_CONTEXTS,
  OPENAI_CONFIG
} from '@/config/external-review-prompts';
import {
  CheckCircle,
  XCircle,
  Clock,
  Star,
  MessageSquare,
  Send,
  Edit3,
  AlertTriangle,
  Calendar,
  User,
  Globe,
  RefreshCw
} from 'lucide-react';

interface ExternalReview {
  id: string;
  platform: string;
  guest_name: string;
  rating: number;
  review_text: string;
  review_date: string;
  sentiment: string;
}

interface ReviewResponse {
  id: string;
  external_review_id: string;
  response_text: string;
  status: 'draft' | 'approved' | 'rejected' | 'posted' | 'failed';
  priority: 'high' | 'normal' | 'low';
  created_at: string;
  approved_at?: string;
  approved_by?: string;
  posted_at?: string;
  manager_notes?: string;
  external_reviews: ExternalReview;
}

export default function ExternalReviewResponseManager() {
  const [responses, setResponses] = useState<ReviewResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingResponse, setEditingResponse] = useState<string | null>(null);
  const [editedText, setEditedText] = useState('');
  const [managerNotes, setManagerNotes] = useState('');
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
            id,
            platform,
            guest_name,
            rating,
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
          description: "Failed to load review responses",
          variant: "destructive",
        });
        return;
      }

      const responseData = (data as ReviewResponse[]) || [];
      setResponses(responseData);

      // Debug logging
      console.log('Loaded responses:', responseData.length);
      console.log('Status breakdown:', {
        draft: responseData.filter(r => r.status === 'draft').length,
        approved: responseData.filter(r => r.status === 'approved').length,
        posted: responseData.filter(r => r.status === 'posted').length,
        rejected: responseData.filter(r => r.status === 'rejected').length
      });
    } catch (error) {
      console.error('Error loading responses:', error);
      toast({
        title: "Error",
        description: "Failed to load review responses",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const createTestDraftResponse = async () => {
    try {
      // First check if we have any existing external reviews to use
      const { data: existingReviews } = await supabase
        .from('external_reviews')
        .select('id, review_text, guest_name')
        .limit(1);

      let reviewId;

      if (!existingReviews || existingReviews.length === 0) {
        // Get the default tenant ID (Eusbett)
        const { data: tenant } = await supabase
          .from('tenants')
          .select('id')
          .eq('slug', 'eusbett')
          .single();

        if (!tenant) {
          throw new Error('Default tenant not found');
        }

        // Create a test external review with correct column names
        const { data: newReview, error: reviewError } = await supabase
          .from('external_reviews')
          .insert({
            tenant_id: tenant.id,
            platform: 'google',
            platform_review_id: 'test-' + Date.now(),
            guest_name: 'Test Guest',
            rating: 2,
            review_text: 'Very disappointed with our stay. The room was not clean on arrival and the shower had very low pressure. WiFi was constantly dropping out and the breakfast was cold. Staff was unhelpful when we complained. Would not recommend.',
            review_date: new Date().toISOString().split('T')[0],
            sentiment: 'negative'
          })
          .select('id')
          .single();

        if (reviewError) {
          console.error('Review creation error:', reviewError);
          throw reviewError;
        }
        reviewId = newReview.id;
      } else {
        reviewId = existingReviews[0].id;
      }

      // Get the default tenant ID for the response
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'eusbett')
        .single();

      if (!tenant) {
        throw new Error('Default tenant not found');
      }

      // Create an old-style draft response
      const oldStyleResponse = `Dear Test Guest, We sincerely apologize for your disappointing experience. Your feedback is extremely important to us, and we are taking immediate action to address the issues you've raised. Please contact our management team directly so we can make this right. We are committed to regaining your trust and confidence. - Eusbett Hotel Management`;

      const { error: responseError } = await supabase
        .from('review_responses')
        .insert({
          external_review_id: reviewId,
          response_text: oldStyleResponse,
          status: 'draft',
          ai_model_used: 'test-old-format',
          response_version: 1,
          priority: 'high',
          tenant_id: tenant.id
        });

      if (responseError) {
        console.error('Response creation error:', responseError);
        throw responseError;
      }

      toast({
        title: "✅ Test Draft Created",
        description: "Created old-style response. Click 'Reject & Regenerate' to test the new AI system!",
      });

      loadResponses();
    } catch (error) {
      console.error('Error creating test draft:', error);
      toast({
        title: "Error",
        description: `Failed to create test draft response: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const generateImprovedResponse = async (reviewId: string) => {
    try {
      // Get the review details
      const { data: review, error: reviewError } = await supabase
        .from('external_reviews')
        .select('*')
        .eq('id', reviewId)
        .single();

      if (reviewError || !review) {
        throw new Error('Review not found');
      }

      // Get tenant information
      const { data: tenant, error: tenantError } = await supabase
        .from('tenants')
        .select('name, brand_voice, contact_email')
        .eq('id', review.tenant_id)
        .single();

      if (tenantError || !tenant) {
        throw new Error('Tenant not found');
      }

      // Get platform context
      const platformContext = PLATFORM_CONTEXTS[review.platform.toLowerCase()] || PLATFORM_CONTEXTS['default'];

      // Create the improved prompt
      const responsePrompt = createHumanLikeResponsePrompt({
        platform: review.platform,
        platformContext,
        guest_name: review.guest_name,
        rating: review.rating,
        review_text: review.review_text,
        sentiment: review.sentiment || 'neutral',
        tenant_name: tenant.name,
        brand_voice: tenant.brand_voice || 'professional and friendly',
        contact_email: tenant.contact_email || 'system-fallback@guest-glow.com'
      });

      // Get system prompt
      const systemPrompt = getImprovedSystemPrompt(review.platform, platformContext);

      // Call the improved SUPABASE edge function (not Netlify!)
      const { data: result, error: functionError } = await supabase.functions.invoke('generate-external-review-response-improved', {
        body: {
          external_review_id: reviewId,
          platform: review.platform,
          guest_name: review.guest_name,
          rating: review.rating,
          review_text: review.review_text,
          review_date: review.review_date,
          sentiment: review.sentiment || 'neutral',
          tenant_id: review.tenant_id,
          regenerate: false
        }
      });

      if (functionError) {
        throw new Error(functionError.message || 'Supabase function error');
      }

      if (!result.success) {
        throw new Error(result.error || 'Failed to generate response');
      }

      // Also check for critical issues that need manager alert
      if (review.rating <= 3) {
        try {
          const { data: alertResult } = await supabase.functions.invoke('external-review-critical-alert', {
            body: {
              external_review_id: reviewId,
              platform: review.platform,
              guest_name: review.guest_name,
              rating: review.rating,
              review_text: review.review_text,
              review_date: review.review_date,
              sentiment: review.sentiment || 'neutral',
              tenant_id: review.tenant_id
            }
          });

          if (alertResult?.critical_alert_needed) {
            toast({
              title: "🚨 Critical Alert Sent",
              description: `Manager notified of serious issues (Severity: ${alertResult.severity_score}/10)`,
              variant: "destructive",
            });
          }
        } catch (alertError) {
          console.error('Critical alert analysis failed:', alertError);
        }
      }

      toast({
        title: "Improved Response Generated",
        description: "Human-like response created with varied language!",
      });

      loadResponses();
      return result;

    } catch (error) {
      console.error('Error generating improved response:', error);
      toast({
        title: "Error",
        description: `Failed to generate improved response: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const simulateNewReview = async () => {
    try {
      // Get the tenant ID
      const { data: tenant } = await supabase
        .from('tenants')
        .select('id')
        .eq('slug', 'eusbett')
        .single();

      if (!tenant) {
        throw new Error('Tenant not found');
      }

      // Create a new external review using the correct column names
      const reviewData = {
        tenant_id: tenant.id,
        platform: 'google',
        platform_review_id: 'auto-test-' + Date.now(),
        guest_name: 'Sarah Johnson',
        rating: 2,
        review_text: 'Terrible experience. Room was dirty, WiFi was constantly dropping out, and the breakfast was cold. The shower had no water pressure and the staff seemed uninterested in helping. Would not recommend this place to anyone.',
        review_date: new Date().toISOString().split('T')[0], // Date format
        sentiment: 'negative'
      };

      // Insert the review
      const { data: newReview, error: reviewError } = await supabase
        .from('external_reviews')
        .insert(reviewData)
        .select('id')
        .single();

      if (reviewError) {
        console.error('Review insertion error:', reviewError);
        throw reviewError;
      }

      toast({
        title: "New Review Added",
        description: "Simulated adding a new external review. Creating response...",
      });

      // Create response with improved formatting
      const responseText = `Dear Sarah Johnson,

**Thank you for taking the time to share your valuable feedback with us.** We deeply appreciate your candid review as it helps us identify areas where we can enhance our service delivery.

I sincerely apologize for the specific issues you raised regarding **WiFi connectivity, room cleanliness, water pressure, breakfast service, and staff service**. This does not reflect the **exceptional standards we strive to maintain**, and we take full responsibility for not meeting your expectations. We have immediately addressed these concerns with our team and have implemented enhanced protocols to ensure better service delivery for all our guests.

Your feedback is instrumental in our continuous improvement efforts, and we would be honored to welcome you back to demonstrate the improvements we've made. Please feel free to contact me directly at **system-fallback@guest-glow.com** for your next visit, and I will personally ensure your experience exceeds expectations.

**Warm regards,**
The Eusbett Hotel Guest Relations Team

---
*Ready for platform posting* • **1,247 characters**`;

      // Insert the response
      const { error: responseError } = await supabase
        .from('review_responses')
        .insert({
          external_review_id: newReview.id,
          response_text: responseText,
          status: 'draft',
          ai_model_used: 'auto-generated-improved',
          response_version: 1,
          tenant_id: tenant.id,
          priority: 'high'
        });

      if (responseError) {
        console.error('Response creation error:', responseError);
        throw responseError;
      }

      toast({
        title: "Auto-Response Generated",
        description: "Response automatically created with improved formatting! Check the Pending tab.",
      });

      // Reload to show the new response
      setTimeout(() => {
        loadResponses();
      }, 1000);

    } catch (error) {
      console.error('Error simulating new review:', error);
      toast({
        title: "Error",
        description: `Failed to simulate new review: ${error.message}`,
        variant: "destructive",
      });
    }
  };

  const handleApprove = async (responseId: string) => {
    try {
      // First approve the response
      const { error } = await supabase
        .from('review_responses')
        .update({
          status: 'approved',
          approved_at: new Date().toISOString(),
          approved_by: 'Manager', // In real app, get from auth context
          manager_notes: managerNotes
        })
        .eq('id', responseId);

      if (error) throw error;

      toast({
        title: "Response Approved",
        description: "Response approved! You can now copy it and manually post to the platform. Mark as 'Posted' when done.",
      });

      loadResponses();
      setManagerNotes('');
    } catch (error) {
      console.error('Error approving response:', error);
      toast({
        title: "Error",
        description: "Failed to approve response",
        variant: "destructive",
      });
    }
  };

  const handleMarkAsPosted = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from('review_responses')
        .update({
          status: 'posted',
          posted_at: new Date().toISOString()
        })
        .eq('id', responseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Response marked as posted!",
      });

      loadResponses();
    } catch (error) {
      console.error('Error marking as posted:', error);
      toast({
        title: "Error",
        description: "Failed to mark response as posted",
        variant: "destructive",
      });
    }
  };

  const handleReject = async (responseId: string) => {
    try {
      // First, get the response details to find the external review
      const { data: responseData, error: fetchError } = await supabase
        .from('review_responses')
        .select(`
          external_review_id,
          external_reviews!inner(
            id,
            platform,
            guest_name,
            rating,
            review_text,
            review_date,
            sentiment,
            tenant_id
          )
        `)
        .eq('id', responseId)
        .single();

      if (fetchError) throw fetchError;

      // Mark current response as rejected
      const { error: rejectError } = await supabase
        .from('review_responses')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: managerNotes || 'Rejected by manager',
          manager_notes: managerNotes
        })
        .eq('id', responseId);

      if (rejectError) throw rejectError;

      // Generate new improved response using the AI function
      const review = responseData.external_reviews;

      const { data: result, error: functionError } = await supabase.functions.invoke('generate-external-review-response-improved', {
        body: {
          external_review_id: review.id,
          platform: review.platform,
          guest_name: review.guest_name,
          rating: review.rating,
          review_text: review.review_text,
          review_date: review.review_date,
          sentiment: review.sentiment || 'neutral',
          tenant_id: review.tenant_id,
          regenerate: true // This is a regeneration
        }
      });

      if (functionError) {
        console.error('Function error:', functionError);
        toast({
          title: "Response Rejected",
          description: "Response rejected. Auto-regeneration failed - please generate manually.",
          variant: "destructive",
        });
        loadResponses();
        return;
      }

      if (!result.success) {
        console.error('Response generation failed:', result.error);
        toast({
          title: "Response Rejected",
          description: "Response rejected. Auto-regeneration failed - please generate manually.",
          variant: "destructive",
        });
        loadResponses();
        return;
      }

      toast({
        title: "✨ Improved Response Generated",
        description: "Response rejected and new human-like draft created!",
      });

      loadResponses();
      setManagerNotes('');
    } catch (error) {
      console.error('Error rejecting response:', error);
      toast({
        title: "Error",
        description: "Failed to reject response",
        variant: "destructive",
      });
    }
  };

  const handleEdit = (responseId: string, currentText: string) => {
    setEditingResponse(responseId);
    setEditedText(currentText);
  };

  const handleSaveEdit = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from('review_responses')
        .update({
          response_text: editedText,
          response_version: 2 // Increment version for edited responses
        })
        .eq('id', responseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Response updated successfully",
      });

      setEditingResponse(null);
      setEditedText('');
      loadResponses();
    } catch (error) {
      console.error('Error updating response:', error);
      toast({
        title: "Error",
        description: "Failed to update response",
        variant: "destructive",
      });
    }
  };

  const getPlatformIcon = (platform: string) => {
    const icons = {
      google: '🔍',
      tripadvisor: '🏨',
      'booking.com': '🏨',
      expedia: '✈️'
    };
    return icons[platform.toLowerCase()] || '🌐';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      draft: 'bg-yellow-100 text-yellow-800',
      approved: 'bg-green-100 text-green-800',
      rejected: 'bg-red-100 text-red-800',
      posted: 'bg-blue-100 text-blue-800',
      failed: 'bg-gray-100 text-gray-800'
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getPriorityColor = (priority: string) => {
    const colors = {
      high: 'bg-red-100 text-red-800',
      normal: 'bg-blue-100 text-blue-800',
      low: 'bg-gray-100 text-gray-800'
    };
    return colors[priority] || 'bg-gray-100 text-gray-800';
  };

  const renderStars = (rating: number) => {
    return Array.from({ length: 5 }, (_, i) => (
      <Star
        key={i}
        className={`w-4 h-4 ${i < rating ? 'fill-yellow-400 text-yellow-400' : 'text-gray-300'}`}
      />
    ));
  };

  const filterResponsesByStatus = (status: string) => {
    return responses.filter(response => response.status === status);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <Clock className="w-8 h-8 animate-spin mx-auto mb-4" />
          <p>Loading review responses...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold">External Review Response Manager</h1>
        <div className="flex gap-2">
          {/* REMOVED SIMULATE BUTTONS FOR GO-LIVE PRODUCTION MODE */}
          {/* Production mode: Only show essential management buttons */}
          <Button onClick={loadResponses} variant="outline">
            <RefreshCw className="h-4 w-4 mr-1" />
            Refresh
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Clock className="w-5 h-5 text-yellow-500" />
              <div>
                <p className="text-2xl font-bold">{filterResponsesByStatus('draft').length}</p>
                <p className="text-sm text-gray-600">Pending Approval</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <CheckCircle className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-2xl font-bold">{filterResponsesByStatus('approved').length}</p>
                <p className="text-sm text-gray-600">Approved</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <Send className="w-5 h-5 text-blue-500" />
              <div>
                <p className="text-2xl font-bold">{filterResponsesByStatus('posted').length}</p>
                <p className="text-sm text-gray-600">Posted</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center space-x-2">
              <AlertTriangle className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-2xl font-bold">
                  {filterResponsesByStatus('draft').filter(r => r.priority === 'high').length}
                </p>
                <p className="text-sm text-gray-600">High Priority</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="pending" className="space-y-4">
        <TabsList>
          <TabsTrigger value="pending">Pending ({filterResponsesByStatus('draft').length})</TabsTrigger>
          <TabsTrigger value="approved">Approved ({filterResponsesByStatus('approved').length})</TabsTrigger>
          <TabsTrigger value="posted">Posted ({filterResponsesByStatus('posted').length})</TabsTrigger>
          <TabsTrigger value="all">All ({responses.length})</TabsTrigger>
        </TabsList>

        <TabsContent value="pending" className="space-y-4">
          {filterResponsesByStatus('draft').map((response) => (
            <ResponseCard
              key={response.id}
              response={response}
              editingResponse={editingResponse}
              editedText={editedText}
              managerNotes={managerNotes}
              onEdit={handleEdit}
              onSaveEdit={handleSaveEdit}
              onApprove={handleApprove}
              onReject={handleReject}
              onMarkAsPosted={handleMarkAsPosted}
              setEditedText={setEditedText}
              setManagerNotes={setManagerNotes}
              setEditingResponse={setEditingResponse}
              getPlatformIcon={getPlatformIcon}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              renderStars={renderStars}
            />
          ))}
          {filterResponsesByStatus('draft').length === 0 && (
            <Card>
              <CardContent className="p-8 text-center">
                <CheckCircle className="w-12 h-12 text-green-500 mx-auto mb-4" />
                <h3 className="text-lg font-semibold mb-2">All caught up!</h3>
                <p className="text-gray-600">No pending responses require your attention.</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>

        <TabsContent value="approved" className="space-y-4">
          {filterResponsesByStatus('approved').map((response) => (
            <ResponseCard
              key={response.id}
              response={response}
              editingResponse={null}
              editedText=""
              managerNotes=""
              onEdit={() => {}}
              onSaveEdit={() => {}}
              onApprove={() => {}}
              onReject={() => {}}
              onMarkAsPosted={handleMarkAsPosted}
              setEditedText={() => {}}
              setManagerNotes={() => {}}
              setEditingResponse={() => {}}
              getPlatformIcon={getPlatformIcon}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              renderStars={renderStars}
              readOnly={true}
            />
          ))}
        </TabsContent>

        <TabsContent value="posted" className="space-y-4">
          {filterResponsesByStatus('posted').map((response) => (
            <ResponseCard
              key={response.id}
              response={response}
              editingResponse={null}
              editedText=""
              managerNotes=""
              onEdit={() => {}}
              onSaveEdit={() => {}}
              onApprove={() => {}}
              onReject={() => {}}
              setEditedText={() => {}}
              setManagerNotes={() => {}}
              setEditingResponse={() => {}}
              getPlatformIcon={getPlatformIcon}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              renderStars={renderStars}
              readOnly={true}
            />
          ))}
        </TabsContent>

        <TabsContent value="all" className="space-y-4">
          {responses.map((response) => (
            <ResponseCard
              key={response.id}
              response={response}
              editingResponse={editingResponse}
              editedText={editedText}
              managerNotes={managerNotes}
              onEdit={handleEdit}
              onSaveEdit={handleSaveEdit}
              onApprove={handleApprove}
              onReject={handleReject}
              onMarkAsPosted={handleMarkAsPosted}
              setEditedText={setEditedText}
              setManagerNotes={setManagerNotes}
              setEditingResponse={setEditingResponse}
              getPlatformIcon={getPlatformIcon}
              getStatusColor={getStatusColor}
              getPriorityColor={getPriorityColor}
              renderStars={renderStars}
              readOnly={response.status !== 'draft'}
            />
          ))}
        </TabsContent>
      </Tabs>
    </div>
  );
}

interface ResponseCardProps {
  response: ReviewResponse;
  editingResponse: string | null;
  editedText: string;
  managerNotes: string;
  onEdit: (id: string, text: string) => void;
  onSaveEdit: (id: string) => void;
  onApprove: (id: string) => void;
  onReject: (id: string) => void;
  onMarkAsPosted?: (id: string) => void;
  setEditedText: (text: string) => void;
  setManagerNotes: (notes: string) => void;
  setEditingResponse: (id: string | null) => void;
  getPlatformIcon: (platform: string) => string;
  getStatusColor: (status: string) => string;
  getPriorityColor: (priority: string) => string;
  renderStars: (rating: number) => JSX.Element[];
  readOnly?: boolean;
}

function ResponseCard({
  response,
  editingResponse,
  editedText,
  managerNotes,
  onEdit,
  onSaveEdit,
  onApprove,
  onReject,
  onMarkAsPosted,
  setEditedText,
  setManagerNotes,
  setEditingResponse,
  getPlatformIcon,
  getStatusColor,
  getPriorityColor,
  renderStars,
  readOnly = false
}: ResponseCardProps) {
  const review = response.external_reviews;
  const isEditing = editingResponse === response.id;

  return (
    <Card className={`${response.priority === 'high' ? 'border-red-200 bg-red-50' : ''}`}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <span className="text-2xl">{getPlatformIcon(review.platform)}</span>
            <div>
              <CardTitle className="text-lg">
                {review.guest_name} - {review.platform}
              </CardTitle>
              <div className="flex items-center space-x-2 mt-1">
                <div className="flex">{renderStars(review.rating)}</div>
                <Badge className={getPriorityColor(response.priority)}>
                  {response.priority.toUpperCase()}
                </Badge>
                <Badge className={getStatusColor(response.status)}>
                  {response.status.toUpperCase()}
                </Badge>
              </div>
            </div>
          </div>
          <div className="text-right text-sm text-gray-500">
            <div className="flex items-center space-x-1">
              <Calendar className="w-4 h-4" />
              <span>{new Date(review.review_date).toLocaleDateString()}</span>
            </div>
            <div className="flex items-center space-x-1 mt-1">
              <Clock className="w-4 h-4" />
              <span>{new Date(response.created_at).toLocaleDateString()}</span>
            </div>
          </div>
        </div>
      </CardHeader>

      <CardContent className="space-y-4">
        <div>
          <h4 className="font-semibold mb-2 flex items-center">
            <User className="w-4 h-4 mr-2" />
            Original Review
          </h4>
          <div className="bg-gray-50 p-3 rounded-lg">
            <p className="text-gray-700">{review.review_text}</p>
          </div>
        </div>

        <div>
          <h4 className="font-semibold mb-2 flex items-center">
            <MessageSquare className="w-4 h-4 mr-2" />
            AI Generated Response
          </h4>
          {isEditing ? (
            <div className="space-y-3">
              <Textarea
                value={editedText}
                onChange={(e) => setEditedText(e.target.value)}
                rows={4}
                className="w-full"
                placeholder="Edit the response..."
              />
              <div className="flex space-x-2">
                <Button onClick={() => onSaveEdit(response.id)} size="sm">
                  Save Changes
                </Button>
                <Button
                  onClick={() => setEditingResponse(null)}
                  variant="outline"
                  size="sm"
                >
                  Cancel
                </Button>
              </div>
            </div>
          ) : (
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="text-gray-700 whitespace-pre-line">
                {response.response_text.split('**').map((part, index) =>
                  index % 2 === 0 ? (
                    <span key={index}>{part}</span>
                  ) : (
                    <strong key={index}>{part}</strong>
                  )
                )}
              </div>
              <div className="flex justify-between items-center mt-3 pt-3 border-t border-blue-200">
                <div className="flex space-x-2">
                  {!readOnly && response.status === 'draft' && (
                    <Button
                      onClick={() => onEdit(response.id, response.response_text)}
                      variant="ghost"
                      size="sm"
                    >
                      <Edit3 className="w-4 h-4 mr-2" />
                      Edit Response
                    </Button>
                  )}
                  {response.status === 'approved' && (
                    <>
                      <Button
                        onClick={async () => {
                          try {
                            // Extract clean response text without footer
                            const cleanText = response.response_text.split('---')[0].trim();
                            await navigator.clipboard.writeText(cleanText);
                            // Show success feedback
                            const button = document.activeElement as HTMLButtonElement;
                            const originalText = button.textContent;
                            button.textContent = '✅ Copied!';
                            setTimeout(() => {
                              button.textContent = originalText;
                            }, 2000);
                          } catch (error) {
                            console.error('Failed to copy:', error);
                            alert('Failed to copy to clipboard. Please select and copy manually.');
                          }
                        }}
                        variant="outline"
                        size="sm"
                      >
                        📋 Copy Response
                      </Button>
                      {onMarkAsPosted && (
                        <Button
                          onClick={() => onMarkAsPosted(response.id)}
                          className="bg-blue-600 hover:bg-blue-700"
                          size="sm"
                        >
                          <Send className="w-4 h-4 mr-2" />
                          Mark as Posted
                        </Button>
                      )}
                    </>
                  )}
                </div>
                <span className="text-xs text-gray-500">
                  {response.response_text.length} characters
                </span>
              </div>
            </div>
          )}
        </div>

        {response.manager_notes && (
          <div>
            <h4 className="font-semibold mb-2">Manager Notes</h4>
            <div className="bg-yellow-50 p-3 rounded-lg">
              <p className="text-gray-700">{response.manager_notes}</p>
            </div>
          </div>
        )}

        {!readOnly && response.status === 'draft' && !isEditing && (
          <div className="space-y-3 pt-4 border-t">
            <Textarea
              value={managerNotes}
              onChange={(e) => setManagerNotes(e.target.value)}
              placeholder="Add notes (optional)..."
              rows={2}
            />
            <div className="flex space-x-2">
              <Button
                onClick={() => onApprove(response.id)}
                className="bg-green-600 hover:bg-green-700"
              >
                <CheckCircle className="w-4 h-4 mr-2" />
                Approve
              </Button>
              <Button
                onClick={() => onReject(response.id)}
                variant="destructive"
              >
                <XCircle className="w-4 h-4 mr-2" />
                Reject & Regenerate
              </Button>
            </div>
          </div>
        )}

        {response.status === 'approved' && (
          <div className="bg-green-50 p-3 rounded-lg">
            <p className="text-green-800 font-medium">
              ✅ Approved by {response.approved_by} on {new Date(response.approved_at!).toLocaleDateString()}
            </p>
          </div>
        )}

        {response.status === 'posted' && (
          <div className="bg-blue-50 p-3 rounded-lg">
            <p className="text-blue-800 font-medium">
              🚀 Posted to {review.platform} on {new Date(response.posted_at!).toLocaleDateString()}
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
