/**
 * Unified Multi-Platform Review Management Dashboard
 * Best Practice Implementation for $50K Hospitality System
 * 
 * Features:
 * - Platform-centric card layout
 * - Quick platform switching
 * - Unified response management
 * - Performance metrics per platform
 * - Priority queue management
 */

import { useState, useMemo, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { StarRating } from '@/components/ui/star-rating';
import { 
  Globe, 
  TrendingUp, 
  Clock, 
  AlertTriangle, 
  CheckCircle,
  MessageSquare,
  ExternalLink,
  Filter,
  BarChart3
} from 'lucide-react';

interface Review {
  id: string;
  platform: string;
  rating: number;
  author_name: string;
  review_text: string;
  review_date: string;
  sentiment: string;
  response_required: boolean;
  response_status?: 'none' | 'draft' | 'approved' | 'posted';
  review_url?: string;
  priority?: 'low' | 'normal' | 'high' | 'critical';
}

interface PlatformMetrics {
  platform: string;
  totalReviews: number;
  averageRating: number;
  needsResponse: number;
  responseRate: number;
  avgResponseTime: number; // hours
  lastReview: string;
}

interface UnifiedReviewDashboardProps {
  reviews: Review[];
  onResponseAction: (reviewId: string, action: string) => void;
}

const PLATFORM_CONFIG = {
  google: {
    name: 'Google',
    color: 'bg-blue-500',
    icon: '🔍',
    maxChars: 4096,
    importance: 'high'
  },
  tripadvisor: {
    name: 'TripAdvisor',
    color: 'bg-green-500',
    icon: '✈️',
    maxChars: 5000,
    importance: 'high'
  },
  booking: {
    name: 'Booking.com',
    color: 'bg-indigo-500',
    icon: '🏨',
    maxChars: 2000,
    importance: 'medium'
  },
  facebook: {
    name: 'Facebook',
    color: 'bg-blue-600',
    icon: '📘',
    maxChars: 8000,
    importance: 'medium'
  },
  trustpilot: {
    name: 'Trustpilot',
    color: 'bg-emerald-500',
    icon: '⭐',
    maxChars: 2500,
    importance: 'medium'
  },
  yelp: {
    name: 'Yelp',
    color: 'bg-red-500',
    icon: '🍽️',
    maxChars: 5000,
    importance: 'low'
  },
  expedia: {
    name: 'Expedia',
    color: 'bg-yellow-500',
    icon: '🧳',
    maxChars: 3000,
    importance: 'medium'
  }
};

export function UnifiedReviewDashboard({ reviews, onResponseAction }: UnifiedReviewDashboardProps) {
  const [selectedPlatform, setSelectedPlatform] = useState<string>('all');
  const [viewMode, setViewMode] = useState<'cards' | 'list'>('cards');
  const [priorityFilter, setPriorityFilter] = useState<string>('all');

  // Calculate platform metrics
  const platformMetrics = useMemo(() => {
    const metrics: Record<string, PlatformMetrics> = {};
    
    Object.keys(PLATFORM_CONFIG).forEach(platform => {
      const platformReviews = reviews.filter(r => r.platform === platform);
      const needsResponse = platformReviews.filter(r => r.response_required && !r.response_status).length;
      const withResponses = platformReviews.filter(r => r.response_status === 'posted').length;
      
      metrics[platform] = {
        platform,
        totalReviews: platformReviews.length,
        averageRating: platformReviews.length > 0 
          ? platformReviews.reduce((sum, r) => sum + r.rating, 0) / platformReviews.length 
          : 0,
        needsResponse,
        responseRate: platformReviews.length > 0 ? (withResponses / platformReviews.length) * 100 : 0,
        avgResponseTime: 24, // Mock data - would calculate from actual response times
        lastReview: platformReviews.length > 0 
          ? platformReviews.sort((a, b) => new Date(b.review_date).getTime() - new Date(a.review_date).getTime())[0].review_date
          : ''
      };
    });
    
    return metrics;
  }, [reviews]);

  // Filter reviews based on selected platform and priority
  const filteredReviews = useMemo(() => {
    let filtered = reviews;
    
    if (selectedPlatform !== 'all') {
      filtered = filtered.filter(r => r.platform === selectedPlatform);
    }
    
    if (priorityFilter !== 'all') {
      filtered = filtered.filter(r => r.priority === priorityFilter);
    }
    
    // Sort by priority and date
    return filtered.sort((a, b) => {
      const priorityOrder = { critical: 4, high: 3, normal: 2, low: 1 };
      const aPriority = priorityOrder[a.priority || 'normal'];
      const bPriority = priorityOrder[b.priority || 'normal'];
      
      if (aPriority !== bPriority) {
        return bPriority - aPriority;
      }
      
      return new Date(b.review_date).getTime() - new Date(a.review_date).getTime();
    });
  }, [reviews, selectedPlatform, priorityFilter]);

  const PlatformCard = ({ platform, metrics }: { platform: string; metrics: PlatformMetrics }) => {
    const config = PLATFORM_CONFIG[platform];
    const isSelected = selectedPlatform === platform;
    
    return (
      <Card 
        className={`cursor-pointer transition-all hover:shadow-md ${
          isSelected ? 'ring-2 ring-primary shadow-md' : ''
        }`}
        onClick={() => setSelectedPlatform(platform)}
      >
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-2xl">{config.icon}</span>
              <div>
                <CardTitle className="text-sm">{config.name}</CardTitle>
                <p className="text-xs text-muted-foreground">
                  {metrics.totalReviews} reviews
                </p>
              </div>
            </div>
            <Badge variant={metrics.needsResponse > 0 ? 'destructive' : 'secondary'}>
              {metrics.needsResponse} pending
            </Badge>
          </div>
        </CardHeader>
        <CardContent className="pt-0">
          <div className="space-y-2">
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Avg Rating</span>
              <div className="flex items-center gap-1">
                <StarRating rating={metrics.averageRating} size="sm" />
                <span className="font-medium">{metrics.averageRating.toFixed(1)}</span>
              </div>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-muted-foreground">Response Rate</span>
              <span className="font-medium">{metrics.responseRate.toFixed(0)}%</span>
            </div>
            {metrics.needsResponse > 0 && (
              <Button 
                size="sm" 
                className="w-full mt-2"
                onClick={(e) => {
                  e.stopPropagation();
                  setSelectedPlatform(platform);
                }}
              >
                <MessageSquare className="h-3 w-3 mr-1" />
                Manage Responses
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header with Quick Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold flex items-center gap-2">
            <Globe className="h-6 w-6" />
            Multi-Platform Review Management
          </h2>
          <p className="text-muted-foreground">
            Unified dashboard for all review platforms • {reviews.length} total reviews
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Button
            variant={viewMode === 'cards' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('cards')}
          >
            Platform Cards
          </Button>
          <Button
            variant={viewMode === 'list' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setViewMode('list')}
          >
            Unified List
          </Button>
        </div>
      </div>

      {/* Platform Overview Cards */}
      {viewMode === 'cards' && (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
          <Card 
            className={`cursor-pointer transition-all hover:shadow-md ${
              selectedPlatform === 'all' ? 'ring-2 ring-primary shadow-md' : ''
            }`}
            onClick={() => setSelectedPlatform('all')}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-sm flex items-center gap-2">
                <BarChart3 className="h-4 w-4" />
                All Platforms
              </CardTitle>
            </CardHeader>
            <CardContent className="pt-0">
              <div className="text-2xl font-bold">{reviews.length}</div>
              <p className="text-xs text-muted-foreground">Total Reviews</p>
              <div className="mt-2 text-sm">
                <span className="text-destructive font-medium">
                  {reviews.filter(r => r.response_required && !r.response_status).length}
                </span>
                <span className="text-muted-foreground"> need responses</span>
              </div>
            </CardContent>
          </Card>
          
          {Object.entries(platformMetrics).map(([platform, metrics]) => (
            <PlatformCard key={platform} platform={platform} metrics={metrics} />
          ))}
        </div>
      )}

      {/* Filters and Actions */}
      <div className="flex items-center gap-4 p-4 bg-muted/30 rounded-lg">
        <div className="flex items-center gap-2">
          <Filter className="h-4 w-4" />
          <span className="text-sm font-medium">Filters:</span>
        </div>
        
        {selectedPlatform !== 'all' && (
          <Badge variant="secondary" className="flex items-center gap-1">
            {PLATFORM_CONFIG[selectedPlatform]?.icon} {PLATFORM_CONFIG[selectedPlatform]?.name}
            <button 
              onClick={() => setSelectedPlatform('all')}
              className="ml-1 hover:bg-background rounded-full p-0.5"
            >
              ×
            </button>
          </Badge>
        )}
        
        <select 
          value={priorityFilter} 
          onChange={(e) => setPriorityFilter(e.target.value)}
          className="text-sm border rounded px-2 py-1"
        >
          <option value="all">All Priorities</option>
          <option value="critical">Critical</option>
          <option value="high">High</option>
          <option value="normal">Normal</option>
          <option value="low">Low</option>
        </select>
        
        <div className="ml-auto text-sm text-muted-foreground">
          Showing {filteredReviews.length} of {reviews.length} reviews
        </div>
      </div>

      {/* Reviews List */}
      <div className="space-y-4">
        {filteredReviews.map((review) => {
          const config = PLATFORM_CONFIG[review.platform];
          return (
            <Card key={review.id} className="hover:shadow-sm transition-shadow">
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="text-lg">{config?.icon}</span>
                      <Badge variant="outline">{config?.name}</Badge>
                      <StarRating rating={review.rating} size="sm" />
                      <span className="text-sm text-muted-foreground">
                        by {review.author_name} • {new Date(review.review_date).toLocaleDateString()}
                      </span>
                      {review.priority && review.priority !== 'normal' && (
                        <Badge variant={review.priority === 'critical' ? 'destructive' : 'secondary'}>
                          {review.priority}
                        </Badge>
                      )}
                    </div>
                    
                    <p className="text-sm line-clamp-2">{review.review_text}</p>
                    
                    <div className="flex items-center gap-2">
                      {review.review_url && (
                        <Button variant="ghost" size="sm" asChild>
                          <a href={review.review_url} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="h-3 w-3 mr-1" />
                            View Original
                          </a>
                        </Button>
                      )}
                      
                      {review.response_required && (
                        <Button 
                          size="sm"
                          onClick={() => onResponseAction(review.id, 'generate')}
                        >
                          <MessageSquare className="h-3 w-3 mr-1" />
                          Generate Response
                        </Button>
                      )}
                    </div>
                  </div>
                  
                  <div className="text-right">
                    {review.response_status && (
                      <Badge 
                        variant={
                          review.response_status === 'posted' ? 'default' :
                          review.response_status === 'approved' ? 'secondary' : 'outline'
                        }
                      >
                        {review.response_status}
                      </Badge>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })}
        
        {filteredReviews.length === 0 && (
          <Card>
            <CardContent className="p-8 text-center">
              <Globe className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
              <h3 className="text-lg font-medium mb-2">No reviews found</h3>
              <p className="text-muted-foreground">
                {selectedPlatform === 'all' 
                  ? 'No reviews match your current filters.'
                  : `No reviews found for ${PLATFORM_CONFIG[selectedPlatform]?.name}.`
                }
              </p>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
