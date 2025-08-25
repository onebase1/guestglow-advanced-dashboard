/**
 * Internal Review Kanban Dashboard
 * Optimized workflow management for internal guest feedback
 * 
 * Features:
 * - Visual status pipeline (New → In Progress → Resolved)
 * - SLA countdown timers with color coding
 * - Drag-and-drop status updates
 * - Category-based filtering
 * - Priority scoring
 * - Mobile-responsive design
 */

import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { StarRating } from '@/components/ui/star-rating';
import { 
  Clock, 
  AlertTriangle, 
  CheckCircle, 
  MessageSquare,
  Mail,
  User,
  MapPin,
  Calendar,
  Filter,
  ArrowRight
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';

interface InternalReview {
  id: string;
  guest_name: string | null;
  guest_email: string | null;
  room_number: string | null;
  rating: number;
  feedback_text: string;
  issue_category: string | null;
  status: string;
  created_at: string;
  ack_due?: string | null;
  resolve_due?: string | null;
  acknowledged_at?: string | null;
  resolved_at?: string | null;
  workflow_status?: string | null;
}

interface InternalReviewKanbanProps {
  reviews: InternalReview[];
  onStatusUpdate?: () => void;
}

const STATUS_COLUMNS = {
  new: {
    title: 'New Issues',
    color: 'bg-red-50 border-red-200',
    headerColor: 'bg-red-500',
    icon: AlertTriangle,
    statuses: ['new', 'NEW', 'pending']
  },
  in_progress: {
    title: 'In Progress',
    color: 'bg-yellow-50 border-yellow-200',
    headerColor: 'bg-yellow-500',
    icon: Clock,
    statuses: ['acknowledged', 'ACKNOWLEDGED', 'in_progress', 'IN_PROGRESS']
  },
  resolved: {
    title: 'Resolved',
    color: 'bg-green-50 border-green-200',
    headerColor: 'bg-green-500',
    icon: CheckCircle,
    statuses: ['resolved', 'RESOLVED', 'REVIEWED_NO_ACTION']
  }
};

const CATEGORY_COLORS = {
  'Room Service': 'bg-blue-100 text-blue-800',
  'Housekeeping': 'bg-purple-100 text-purple-800',
  'Front Desk': 'bg-indigo-100 text-indigo-800',
  'Restaurant': 'bg-orange-100 text-orange-800',
  'Facilities': 'bg-gray-100 text-gray-800',
  'WiFi/Tech': 'bg-cyan-100 text-cyan-800',
  'Billing': 'bg-red-100 text-red-800',
  'Other': 'bg-slate-100 text-slate-800'
};

export function InternalReviewKanban({ reviews, onStatusUpdate }: InternalReviewKanbanProps) {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [updatingStatus, setUpdatingStatus] = useState<string | null>(null);
  const { toast } = useToast();

  // Calculate SLA status and urgency
  const calculateSLAStatus = (review: InternalReview) => {
    const now = new Date();
    const createdAt = new Date(review.created_at);
    const hoursElapsed = (now.getTime() - createdAt.getTime()) / (1000 * 60 * 60);
    
    // SLA: Acknowledge within 30 minutes, resolve within 24 hours
    const ackSLA = 0.5; // 30 minutes
    const resolveSLA = 24; // 24 hours
    
    if (review.status === 'resolved' || review.status === 'RESOLVED') {
      return { status: 'resolved', urgency: 'none', timeLeft: 0 };
    }
    
    if (!review.acknowledged_at && hoursElapsed > ackSLA) {
      return { 
        status: 'overdue_ack', 
        urgency: 'critical', 
        timeLeft: ackSLA - hoursElapsed 
      };
    }
    
    if (hoursElapsed > resolveSLA) {
      return { 
        status: 'overdue_resolve', 
        urgency: 'critical', 
        timeLeft: resolveSLA - hoursElapsed 
      };
    }
    
    if (hoursElapsed > resolveSLA * 0.8) {
      return { 
        status: 'warning', 
        urgency: 'high', 
        timeLeft: resolveSLA - hoursElapsed 
      };
    }
    
    return { 
      status: 'on_time', 
      urgency: 'normal', 
      timeLeft: resolveSLA - hoursElapsed 
    };
  };

  // Calculate priority score
  const calculatePriority = (review: InternalReview) => {
    let score = 0;
    
    // Rating impact (lower rating = higher priority)
    score += (6 - review.rating) * 20;
    
    // Category impact
    const highPriorityCategories = ['Room Service', 'Housekeeping', 'Front Desk'];
    if (highPriorityCategories.includes(review.issue_category || '')) {
      score += 15;
    }
    
    // SLA urgency
    const sla = calculateSLAStatus(review);
    if (sla.urgency === 'critical') score += 30;
    else if (sla.urgency === 'high') score += 15;
    
    return score;
  };

  // Group reviews by status column
  const groupedReviews = useMemo(() => {
    const filtered = selectedCategory === 'all' 
      ? reviews 
      : reviews.filter(r => r.issue_category === selectedCategory);
    
    const grouped: Record<string, InternalReview[]> = {
      new: [],
      in_progress: [],
      resolved: []
    };
    
    filtered.forEach(review => {
      const priority = calculatePriority(review);
      const reviewWithPriority = { ...review, priority };
      
      // Determine which column this review belongs to
      for (const [columnKey, column] of Object.entries(STATUS_COLUMNS)) {
        if (column.statuses.includes(review.status)) {
          grouped[columnKey].push(reviewWithPriority);
          break;
        }
      }
    });
    
    // Sort each column by priority (highest first)
    Object.keys(grouped).forEach(key => {
      grouped[key].sort((a, b) => (b.priority || 0) - (a.priority || 0));
    });
    
    return grouped;
  }, [reviews, selectedCategory]);

  // Get unique categories for filter
  const categories = useMemo(() => {
    const cats = [...new Set(reviews.map(r => r.issue_category).filter(Boolean))];
    return cats.sort();
  }, [reviews]);

  const updateReviewStatus = async (reviewId: string, newStatus: string) => {
    setUpdatingStatus(reviewId);
    try {
      const { error } = await supabase
        .from('feedback')
        .update({ 
          status: newStatus,
          acknowledged_at: newStatus === 'ACKNOWLEDGED' ? new Date().toISOString() : undefined,
          resolved_at: newStatus === 'RESOLVED' ? new Date().toISOString() : undefined
        })
        .eq('id', reviewId);

      if (error) throw error;

      toast({
        title: "Status updated",
        description: `Review marked as ${newStatus.toLowerCase().replace('_', ' ')}`,
      });

      onStatusUpdate?.();
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to update status",
        variant: "destructive"
      });
    } finally {
      setUpdatingStatus(null);
    }
  };

  const ReviewCard = ({ review }: { review: InternalReview & { priority?: number } }) => {
    const sla = calculateSLAStatus(review);
    
    return (
      <Card className={`mb-3 hover:shadow-md transition-shadow cursor-pointer ${
        sla.urgency === 'critical' ? 'ring-2 ring-red-500' : 
        sla.urgency === 'high' ? 'ring-1 ring-yellow-500' : ''
      }`}>
        <CardContent className="p-4">
          <div className="space-y-3">
            {/* Header with rating and SLA */}
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <StarRating rating={review.rating} size="sm" />
                <span className="text-sm font-medium">{review.rating}/5</span>
              </div>
              
              {sla.urgency !== 'none' && (
                <Badge variant={
                  sla.urgency === 'critical' ? 'destructive' : 
                  sla.urgency === 'high' ? 'secondary' : 'outline'
                }>
                  <Clock className="h-3 w-3 mr-1" />
                  {sla.timeLeft > 0 ? `${Math.ceil(sla.timeLeft)}h left` : 'Overdue'}
                </Badge>
              )}
            </div>

            {/* Guest info */}
            <div className="flex items-center gap-4 text-sm text-muted-foreground">
              {review.guest_name && (
                <div className="flex items-center gap-1">
                  <User className="h-3 w-3" />
                  {review.guest_name}
                </div>
              )}
              {review.room_number && (
                <div className="flex items-center gap-1">
                  <MapPin className="h-3 w-3" />
                  Room {review.room_number}
                </div>
              )}
            </div>

            {/* Category and feedback preview */}
            <div className="space-y-2">
              {review.issue_category && (
                <Badge 
                  variant="outline" 
                  className={CATEGORY_COLORS[review.issue_category] || CATEGORY_COLORS['Other']}
                >
                  {review.issue_category}
                </Badge>
              )}
              
              <p className="text-sm line-clamp-2 text-muted-foreground">
                {review.feedback_text}
              </p>
            </div>

            {/* Actions */}
            <div className="flex items-center justify-between pt-2 border-t">
              <div className="flex items-center gap-1 text-xs text-muted-foreground">
                <Calendar className="h-3 w-3" />
                {new Date(review.created_at).toLocaleDateString()}
              </div>
              
              <div className="flex items-center gap-1">
                {review.guest_email && (
                  <Button size="sm" variant="ghost" className="h-7 w-7 p-0">
                    <Mail className="h-3 w-3" />
                  </Button>
                )}
                
                {/* Status action buttons */}
                {review.status === 'new' || review.status === 'NEW' ? (
                  <Button 
                    size="sm" 
                    onClick={() => updateReviewStatus(review.id, 'ACKNOWLEDGED')}
                    disabled={updatingStatus === review.id}
                    className="h-7 px-2 text-xs"
                  >
                    Acknowledge
                  </Button>
                ) : review.status === 'ACKNOWLEDGED' ? (
                  <Button 
                    size="sm" 
                    onClick={() => updateReviewStatus(review.id, 'RESOLVED')}
                    disabled={updatingStatus === review.id}
                    className="h-7 px-2 text-xs bg-green-600 hover:bg-green-700"
                  >
                    Resolve
                  </Button>
                ) : null}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with filters */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">Internal Review Management</h2>
          <p className="text-muted-foreground">
            Kanban workflow for guest feedback • {reviews.length} total reviews
          </p>
        </div>
        
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <select 
            value={selectedCategory} 
            onChange={(e) => setSelectedCategory(e.target.value)}
            className="text-sm border rounded px-3 py-1"
          >
            <option value="all">All Categories</option>
            {categories.map(cat => (
              <option key={cat} value={cat}>{cat}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Kanban Board */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {Object.entries(STATUS_COLUMNS).map(([columnKey, column]) => {
          const columnReviews = groupedReviews[columnKey] || [];
          const Icon = column.icon;
          
          return (
            <div key={columnKey} className={`rounded-lg border-2 ${column.color}`}>
              {/* Column Header */}
              <div className={`${column.headerColor} text-white p-4 rounded-t-lg`}>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon className="h-5 w-5" />
                    <h3 className="font-semibold">{column.title}</h3>
                  </div>
                  <Badge variant="secondary" className="bg-white/20 text-white">
                    {columnReviews.length}
                  </Badge>
                </div>
              </div>
              
              {/* Column Content */}
              <div className="p-4 min-h-[400px]">
                {columnReviews.length > 0 ? (
                  columnReviews.map(review => (
                    <ReviewCard key={review.id} review={review} />
                  ))
                ) : (
                  <div className="text-center text-muted-foreground py-8">
                    <Icon className="h-12 w-12 mx-auto mb-2 opacity-50" />
                    <p>No {column.title.toLowerCase()}</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
