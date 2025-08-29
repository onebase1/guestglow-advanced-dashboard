# External Rating System Implementation Guide

## CRITICAL: Missing Features Required for GM Email Promises

The GM introduction email makes several promises about external rating tracking and 4.5-star goals that currently **CANNOT BE FULFILLED** with the existing system. This document provides implementation instructions to make these promises achievable.

---

## Database Schema Implementation

### 1. External Reviews Table
```sql
CREATE TABLE IF NOT EXISTS external_reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    platform VARCHAR(50) NOT NULL, -- 'google', 'booking.com', 'tripadvisor', 'expedia'
    review_id VARCHAR(255) NOT NULL, -- Platform-specific review ID
    guest_name VARCHAR(255),
    review_rating DECIMAL(2,1) NOT NULL, -- 1.0 to 5.0
    review_text TEXT,
    review_date TIMESTAMP WITH TIME ZONE NOT NULL,
    platform_url TEXT, -- Direct link to review
    verified_stay BOOLEAN DEFAULT false,
    response_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'responded', 'no_response_needed'
    our_response TEXT,
    responded_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, platform, review_id)
);

CREATE INDEX idx_external_reviews_tenant_platform ON external_reviews(tenant_id, platform);
CREATE INDEX idx_external_reviews_rating_date ON external_reviews(review_rating, review_date);
```

### 2. Rating Goals Tracking Table  
```sql
CREATE TABLE IF NOT EXISTS rating_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    goal_type VARCHAR(20) NOT NULL, -- 'overall', 'platform_specific'
    platform VARCHAR(50), -- NULL for overall goals
    current_rating DECIMAL(2,1) NOT NULL,
    target_rating DECIMAL(2,1) NOT NULL,
    target_date DATE NOT NULL,
    reviews_needed INTEGER NOT NULL,
    five_star_reviews_needed INTEGER NOT NULL,
    daily_target DECIMAL(3,2), -- Reviews per day needed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 3. Near Miss Tracking Table
```sql
CREATE TABLE IF NOT EXISTS near_miss_tracking (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    guest_feedback_id UUID REFERENCES guest_feedback(feedback_id),
    internal_rating INTEGER NOT NULL, -- Rating from internal feedback
    guest_email VARCHAR(255),
    guest_name VARCHAR(255),
    stay_date DATE,
    followed_up_at TIMESTAMP WITH TIME ZONE,
    external_review_found BOOLEAN DEFAULT false,
    external_review_id UUID REFERENCES external_reviews(id),
    conversion_status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'converted', 'declined', 'no_response'
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 4. Daily Rating Progress Table
```sql
CREATE TABLE IF NOT EXISTS daily_rating_progress (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    tenant_id UUID NOT NULL REFERENCES tenants(id),
    progress_date DATE NOT NULL,
    overall_rating DECIMAL(2,1) NOT NULL,
    google_rating DECIMAL(2,1),
    booking_rating DECIMAL(2,1),
    tripadvisor_rating DECIMAL(2,1),
    total_reviews INTEGER NOT NULL,
    five_star_count INTEGER NOT NULL,
    four_star_count INTEGER NOT NULL,
    three_star_count INTEGER NOT NULL,
    two_star_count INTEGER NOT NULL,
    one_star_count INTEGER NOT NULL,
    reviews_added_today INTEGER DEFAULT 0,
    rating_change DECIMAL(2,1) DEFAULT 0.0, -- Change from previous day
    goal_progress_percentage DECIMAL(5,2) DEFAULT 0.0,
    on_track BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(tenant_id, progress_date)
);
```

---

## Edge Functions Implementation

### 1. External Review Sync Function
Create `supabase/functions/sync-external-reviews/index.ts`:

```typescript
// Function to sync reviews from external platforms
export default async function handler(req: Request) {
    const { tenant_id, platforms } = await req.json();
    
    // For each platform, fetch recent reviews
    const syncResults = [];
    
    for (const platform of platforms) {
        try {
            const reviews = await fetchPlatformReviews(platform, tenant_id);
            const syncResult = await syncReviewsToDatabase(reviews, tenant_id, platform);
            syncResults.push({ platform, ...syncResult });
            
            // Check for rating drops
            await checkRatingDropAlerts(tenant_id, platform);
            
        } catch (error) {
            console.error(`Failed to sync ${platform} reviews:`, error);
            syncResults.push({ platform, success: false, error: error.message });
        }
    }
    
    // Update daily progress
    await updateDailyProgress(tenant_id);
    
    return new Response(JSON.stringify({ success: true, syncResults }));
}
```

### 2. Rating Goal Calculator Function
Create `supabase/functions/calculate-rating-goals/index.ts`:

```typescript
export default async function handler(req: Request) {
    const { tenant_id, current_rating, target_rating, target_date } = await req.json();
    
    // Calculate how many 5-star reviews are needed
    const calculation = calculateReviewsNeeded(current_rating, target_rating, target_date);
    
    // Update goals table
    await upsertRatingGoal(tenant_id, calculation);
    
    // Generate goal tracking report
    const report = generateGoalReport(calculation);
    
    return new Response(JSON.stringify({ success: true, calculation, report }));
}
```

### 3. Near Miss Detection Function  
Create `supabase/functions/detect-near-misses/index.ts`:

```typescript
export default async function handler(req: Request) {
    const { tenant_id } = await req.json();
    
    // Find 5-star internal feedback from last 30 days
    const fiveStarFeedback = await getFiveStarFeedback(tenant_id);
    
    // Check which guests haven't left external reviews
    const nearMisses = [];
    
    for (const feedback of fiveStarFeedback) {
        const hasExternalReview = await checkExternalReview(
            feedback.guest_email, 
            feedback.stay_date,
            tenant_id
        );
        
        if (!hasExternalReview) {
            nearMisses.push({
                feedback_id: feedback.feedback_id,
                guest_name: feedback.guest_name,
                guest_email: feedback.guest_email,
                internal_rating: feedback.rating,
                stay_date: feedback.created_at
            });
        }
    }
    
    // Store near misses
    await storeNearMisses(nearMisses, tenant_id);
    
    // Send follow-up emails to near-miss guests
    await sendNearMissFollowups(nearMisses, tenant_id);
    
    return new Response(JSON.stringify({ 
        success: true, 
        near_misses_found: nearMisses.length,
        follow_ups_sent: nearMisses.length 
    }));
}
```

### 4. Daily Progress Report Function
Create `supabase/functions/daily-rating-progress/index.ts`:

```typescript
export default async function handler(req: Request) {
    const { tenant_id } = await req.json();
    
    // Calculate today's rating metrics
    const todayMetrics = await calculateDailyMetrics(tenant_id);
    
    // Store in daily progress table
    await storeDailyProgress(tenant_id, todayMetrics);
    
    // Generate morning briefing email
    const briefingContent = generateMorningBriefing(todayMetrics);
    
    // Send to GM and stakeholders
    const recipients = [
        'gm@eusbetthotel.com',
        'erbennett@gmail.com',
        'g.basera@yahoo.com',
        'gizzy@guest-glow.com'
    ];
    
    for (const recipient of recipients) {
        await sendBriefingEmail(recipient, briefingContent, todayMetrics);
    }
    
    // Check if urgent alerts needed
    if (todayMetrics.rating_drop > 0.1) {
        await sendUrgentRatingAlert(tenant_id, todayMetrics);
    }
    
    return new Response(JSON.stringify({ 
        success: true, 
        metrics: todayMetrics,
        briefings_sent: recipients.length
    }));
}
```

---

## Scheduled Jobs Implementation

### 1. External Review Sync (Every 4 hours)
```sql
-- Add to pg_cron or equivalent
SELECT cron.schedule(
    'sync-external-reviews',
    '0 */4 * * *', -- Every 4 hours
    $$SELECT net.http_post(
        url := 'https://[your-project].supabase.co/functions/v1/sync-external-reviews',
        headers := '{"Authorization": "Bearer [service-role-key]"}',
        body := '{"tenant_id": "27843a9a-b53f-482a-87ba-1a3e52f55dc1", "platforms": ["google", "booking.com", "tripadvisor"]}'
    );$$
);
```

### 2. Daily Progress Report (8:00 AM)
```sql
SELECT cron.schedule(
    'daily-rating-progress',
    '0 8 * * *', -- 8:00 AM daily
    $$SELECT net.http_post(
        url := 'https://[your-project].supabase.co/functions/v1/daily-rating-progress',
        headers := '{"Authorization": "Bearer [service-role-key]"}',
        body := '{"tenant_id": "27843a9a-b53f-482a-87ba-1a3e52f55dc1"}'
    );$$
);
```

### 3. Near Miss Detection (Daily at 9:00 PM)
```sql
SELECT cron.schedule(
    'detect-near-misses',
    '0 21 * * *', -- 9:00 PM daily
    $$SELECT net.http_post(
        url := 'https://[your-project].supabase.co/functions/v1/detect-near-misses',
        headers := '{"Authorization": "Bearer [service-role-key]"}',
        body := '{"tenant_id": "27843a9a-b53f-482a-87ba-1a3e52f55dc1"}'
    );$$
);
```

---

## Platform Integration Requirements

### 1. Google Reviews API
- **Required**: Google My Business API access
- **Setup**: Service account with My Business API permissions
- **Rate Limits**: 1000 requests/day (sufficient for most hotels)
- **Data**: Review text, rating, date, reviewer name

### 2. Booking.com Partner API
- **Required**: Booking.com extranet partner access
- **Setup**: Partner API credentials
- **Rate Limits**: 5000 requests/day
- **Data**: Guest reviews, ratings, response capabilities

### 3. TripAdvisor Content API
- **Required**: TripAdvisor Content API key
- **Setup**: Business account verification
- **Rate Limits**: 1000 requests/day
- **Data**: Review content, ratings, traveler info

---

## Implementation Priority

### Phase 1 (URGENT - Needed before GM email)
1. Create external_reviews table
2. Build basic review sync function
3. Implement daily progress tracking
4. Set up morning briefing emails

### Phase 2 (Within 1 week)
1. Platform API integrations
2. Near miss detection system
3. Rating drop alerts
4. Goal calculation system

### Phase 3 (Within 2 weeks)
1. Advanced analytics dashboard
2. Competitor tracking
3. A/B testing framework
4. Mobile notifications (optional)

---

## Email Template Updates Required

### Morning Briefing Template
The current `scheduled-email-reports` function needs enhancement to include:
- External review progress
- 4.5-star goal tracking
- Near-miss identification
- Rating trend analysis

### Alert Templates
New urgent alert templates for:
- Rating drops detected
- Goal progress falling behind
- Competitor analysis updates
- Near-miss follow-up results

---

## Critical Actions Required

1. **Database Schema**: Run all table creation scripts immediately
2. **API Setup**: Obtain platform API credentials 
3. **Edge Functions**: Deploy all 4 new functions
4. **Scheduled Jobs**: Configure cron jobs for automation
5. **Email Updates**: Enhance existing report templates

**Without these implementations, the GM email promises cannot be fulfilled and may damage credibility.**

---

## Testing Checklist

- [ ] External reviews can be synced from at least one platform
- [ ] Daily progress calculations are accurate
- [ ] Morning briefing emails include external rating data
- [ ] Near-miss detection identifies 5-star internal feedback
- [ ] Rating drop alerts trigger when thresholds exceeded
- [ ] Goal progress calculations match manual calculations
- [ ] All scheduled jobs execute without errors

This system will transform the current internal-only feedback system into a comprehensive external rating management platform that can fulfill all GM email promises.