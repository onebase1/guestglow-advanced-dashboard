# Human-in-Loop Approval System Implementation Guide

## Overview
This system implements an intelligent approval workflow for guest response emails, routing only genuinely high-risk responses to human review while maintaining automated processing for routine complaints.

## Core Principle
**Route to human approval ONLY when there's genuine risk of legal, reputational, safety, or ethical issues.** Routine service complaints (cold food, slow service, room cleanliness) should auto-respond normally.

---

## Database Schema Requirements

### 1. Response Approvals Table
```sql
CREATE TABLE response_approvals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    feedback_id UUID REFERENCES guest_feedback(feedback_id),
    tenant_id UUID NOT NULL,
    generated_response TEXT NOT NULL,
    response_type TEXT NOT NULL, -- 'guest_response' or 'manager_alert'
    severity_level TEXT NOT NULL, -- 'HIGH', 'MEDIUM', 'LOW'
    risk_factors TEXT[] DEFAULT '{}',
    ai_confidence_score DECIMAL(3,2), -- 0.00 to 1.00
    risk_explanation TEXT NOT NULL, -- Why human approval is needed
    requires_approval BOOLEAN DEFAULT true,
    status TEXT DEFAULT 'pending',
    approved_by TEXT,
    approved_at TIMESTAMP WITH TIME ZONE,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '24 hours'),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);
```

### 2. Approval Tokens Table
```sql
CREATE TABLE approval_tokens (
    token UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    approval_id UUID REFERENCES response_approvals(id),
    action TEXT NOT NULL, -- 'approve', 'reject'
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '48 hours'),
    used_at TIMESTAMP WITH TIME ZONE
);
```

---

## Risk Detection Categories

### GENUINE HIGH RISK (Require Human Approval)

#### 1. Legal/Compliance Threats
- Discrimination based on race, gender, religion, disability
- Harassment allegations (sexual, verbal, physical)
- Explicit legal threats ("I'm suing you", "calling my lawyer")
- Regulatory violations (health department, fire safety)
- Privacy breaches (sharing guest info)

#### 2. Health & Safety Critical
- Food poisoning with medical treatment mentioned
- Serious injuries requiring medical attention
- Fire/gas/electrical hazards
- Structural safety issues (balcony collapse, ceiling falling)
- Infestations affecting health (severe bed bugs, rodents)

#### 3. Staff Misconduct - Serious
- Theft by staff members
- Staff under influence of alcohol/drugs
- Physical altercations involving staff
- Staff sharing guest personal information
- Corruption/bribery allegations

#### 4. Security Incidents
- Assault on property
- Theft of guest belongings
- Unauthorized room access
- Violence or threats of violence
- Weapons on property

#### 5. Reputational/Media Risks
- Viral social media posts with specific threats
- Media involvement mentioned
- Boycott campaigns threatened
- Celebrity/influencer complaints with large following

#### 6. System Bypass Attempts
- Prompt injection attempts
- Admin/system commands in feedback
- Attempts to manipulate AI responses
- Suspicious technical formatting

### LOW RISK (Auto-Respond Normally)
- Cold food complaints
- Slow service
- Room cleanliness issues
- Noise complaints
- Minor maintenance issues
- Staff being "unfriendly" without misconduct
- Standard service delays
- Pricing complaints

---

## Risk Assessment Algorithm

### Confidence Scoring
```javascript
calculateRiskScore(feedback) {
    let riskScore = 0;
    
    // Legal keywords
    if (hasLegalThreat(feedback.text)) riskScore += 30;
    
    // Health/Safety critical
    if (hasHealthSafetyCritical(feedback.text)) riskScore += 25;
    
    // Staff misconduct (serious)
    if (hasSeriousStaffMisconduct(feedback.text)) riskScore += 20;
    
    // Media/reputation threat
    if (hasMediaThreat(feedback.text)) riskScore += 15;
    
    // Bypass attempt detected
    if (hasBypassAttempt(feedback.text)) riskScore += 50;
    
    return Math.min(100, riskScore);
}
```

### Approval Decision Logic
- **Risk Score ≥ 30**: Require approval
- **Risk Score < 30**: Auto-respond
- **AI Confidence < 0.7**: Require approval regardless of risk score
- **Multiple risk categories detected**: Always require approval

---

## Approval Notification Email

### Recipients
- **Primary**: guestrelations@eusbetthotel.com
- **CC**: gizzy@guest-glow.com, g.basera@yahoo.com, gm@eusbetthotels.com, erbennett@gmail.com

### Email Content Structure

```html
Subject: 🚨 HIGH RISK Response Requires Approval - [Risk Categories]

<div style="max-width: 600px; font-family: Arial, sans-serif;">
    
    <!-- Alert Header -->
    <div style="background: #dc2626; color: white; padding: 15px; border-radius: 8px 8px 0 0;">
        <h2 style="margin: 0;">⚠️ HUMAN APPROVAL REQUIRED</h2>
        <p style="margin: 5px 0 0 0;">High-risk response detected - manual review needed</p>
    </div>
    
    <!-- Why Approval is Needed -->
    <div style="background: #fef2f2; border-left: 4px solid #dc2626; padding: 15px; margin: 0;">
        <h3 style="color: #dc2626; margin-top: 0;">🎯 WHY APPROVAL IS REQUIRED:</h3>
        <p style="margin: 0; font-weight: bold; color: #991b1b;">
            [DETAILED_RISK_EXPLANATION]
        </p>
        <ul style="color: #7f1d1d;">
            [SPECIFIC_RISK_FACTORS_LIST]
        </ul>
    </div>
    
    <!-- Risk Assessment -->
    <div style="background: #f9f9f9; padding: 15px;">
        <p><strong>Risk Score:</strong> [RISK_SCORE]/100</p>
        <p><strong>AI Confidence:</strong> [AI_CONFIDENCE]%</p>
        <p><strong>Categories:</strong> [RISK_CATEGORIES]</p>
    </div>
    
    <!-- Original Feedback -->
    <div style="margin: 20px 0;">
        <h3>📝 Original Guest Feedback:</h3>
        <div style="background: #f3f4f6; padding: 15px; border-radius: 6px; border-left: 4px solid #6b7280;">
            <p><strong>Guest:</strong> [GUEST_NAME] | <strong>Room:</strong> [ROOM] | <strong>Rating:</strong> [RATING]/5</p>
            <p>[FEEDBACK_TEXT]</p>
        </div>
    </div>
    
    <!-- AI Generated Response -->
    <div style="margin: 20px 0;">
        <h3>🤖 Proposed AI Response:</h3>
        <div style="background: #eff6ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            [PROPOSED_RESPONSE]
        </div>
    </div>
    
    <!-- Action Buttons -->
    <div style="text-align: center; margin: 30px 0; padding: 20px; background: #f9fafb; border-radius: 8px;">
        <p style="margin-bottom: 20px; font-weight: bold;">Please review and take action:</p>
        
        <a href="[APPROVE_LINK]" 
           style="background: #16a34a; color: white; padding: 15px 30px; text-decoration: none; 
                  border-radius: 8px; margin: 0 10px; font-weight: bold; display: inline-block;">
           ✅ APPROVE & SEND
        </a>
        
        <a href="[REJECT_LINK]" 
           style="background: #dc2626; color: white; padding: 15px 30px; text-decoration: none; 
                  border-radius: 8px; margin: 0 10px; font-weight: bold; display: inline-block;">
           ❌ REJECT (No Response)
        </a>
    </div>
    
    <!-- Footer -->
    <div style="background: #f3f4f6; padding: 15px; border-radius: 0 0 8px 8px; color: #6b7280; font-size: 12px;">
        <p><strong>⏰ Expires:</strong> 24 hours from now</p>
        <p><strong>📧 Feedback ID:</strong> [FEEDBACK_ID]</p>
        <p>If no action is taken within 24 hours, no response will be sent to the guest.</p>
    </div>
    
</div>
```

---

## Implementation Requirements

### 1. Edge Functions to Modify/Create

#### A. Enhance `generate-ai-responses`
- Add risk assessment after response generation
- Route high-risk responses to approval queue
- Continue normal flow for low-risk responses

#### B. Create `send-approval-notification`
- Generate secure approval tokens
- Send formatted email to approval team
- Log notification in database

#### C. Create `process-approval-action`
- Validate approval tokens
- Process approve/reject decisions
- Update response status
- Trigger email sending if approved

#### D. Modify `send-delayed-responses`
- Check approval status before sending
- Skip pending/rejected responses
- Log skipped responses

### 2. Security Considerations

#### Token Security
- Generate cryptographically secure tokens
- Set 48-hour expiration on tokens
- One-time use tokens (mark as used)
- Validate token ownership and expiration

#### Input Validation
- Sanitize all feedback inputs
- Detect prompt injection attempts
- Log suspicious activities
- Rate limit approval requests

### 3. Monitoring & Logging

#### Required Logs
- All risk assessments performed
- Approval notifications sent
- Approval decisions made
- Expired approvals (responses not sent)
- System bypass attempts

#### Metrics to Track
- Approval queue volume
- Average approval time
- Approval vs rejection rates
- Risk category frequency

---

## Example Risk Explanations

### Legal Threat Example
```
WHY APPROVAL IS REQUIRED:
Guest has made explicit legal threats and mentioned contacting attorneys. This requires careful legal review before responding to avoid admitting liability or escalating the situation.

Risk Factors:
• Explicit mention of lawsuit/legal action
• Threat to involve attorneys
• Potential discrimination claims
• High liability exposure
```

### Health Safety Example
```
WHY APPROVAL IS REQUIRED:
Guest reports food poisoning requiring medical treatment. Health department regulations and potential liability require expert review of our response.

Risk Factors:
• Medical treatment mentioned
• Food safety violation alleged
• Potential regulatory reporting required
• High liability and reputation risk
```

---

## Quality Assurance

### Testing Scenarios
1. **True Positives**: Legal threats, serious injuries, staff misconduct
2. **True Negatives**: Cold food, slow service, minor cleanliness
3. **False Positives**: Aggressive language without real threats
4. **False Negatives**: Subtle legal language, implied threats

### Success Metrics
- **Zero inappropriate responses sent** (primary goal)
- **Minimal false positives** (< 5% of total approvals)
- **Fast approval times** (< 2 hours average)
- **High approval team satisfaction** with explanations provided

---

## Rollout Strategy

### Phase 1: Testing
- Deploy to staging environment
- Test with sample high-risk scenarios
- Validate approval flow end-to-end

### Phase 2: Production Soft Launch
- Deploy with conservative risk thresholds
- Monitor approval queue volume
- Gather feedback from approval team

### Phase 3: Optimization
- Adjust risk thresholds based on data
- Refine risk explanations
- Optimize approval notification format

This system ensures that genuinely risky responses get human oversight while maintaining automation for routine complaints, protecting both guests and the business from potential issues.