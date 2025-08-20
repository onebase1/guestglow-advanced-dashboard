import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
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
  Globe
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

      setResponses((data as ReviewResponse[]) || []);
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

      // Then attempt to post to platform
      try {
        const { data: postResult, error: postError } = await supabase.functions.invoke('post-platform-response', {
          body: {
            response_id: responseId,
            force_post: true // For demo purposes
          }
        });

        if (postError) {
          console.error('Platform posting error:', postError);
          toast({
            title: "Approved with Warning",
            description: "Response approved but failed to post to platform. You can retry posting later.",
            variant: "destructive",
          });
        } else {
          toast({
            title: "Success",
            description: `Response approved and posted to ${postResult.platform}!`,
          });
        }
      } catch (postError) {
        console.error('Platform posting error:', postError);
        toast({
          title: "Approved with Warning",
          description: "Response approved but failed to post to platform.",
          variant: "destructive",
        });
      }

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

  const handleReject = async (responseId: string) => {
    try {
      const { error } = await supabase
        .from('review_responses')
        .update({
          status: 'rejected',
          rejected_at: new Date().toISOString(),
          rejection_reason: managerNotes || 'Rejected by manager',
          manager_notes: managerNotes
        })
        .eq('id', responseId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Response rejected. A new response will be generated.",
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
        <Button onClick={loadResponses} variant="outline">
          Refresh
        </Button>
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
            <div className="bg-blue-50 p-3 rounded-lg">
              <p className="text-gray-700">{response.response_text}</p>
              {!readOnly && response.status === 'draft' && (
                <Button
                  onClick={() => onEdit(response.id, response.response_text)}
                  variant="ghost"
                  size="sm"
                  className="mt-2"
                >
                  <Edit3 className="w-4 h-4 mr-2" />
                  Edit Response
                </Button>
              )}
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
                Approve & Post
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
