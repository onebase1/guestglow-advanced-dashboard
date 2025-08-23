# GuestGlow Production SOP / README

This guide explains the production-ready external review response system with human-like AI responses and critical issue detection.

## 🚀 NEW PRODUCTION FEATURES
- **Human-like AI responses** (no more robotic templates)
- **Critical issue detection** with automatic manager alerts
- **Reject & Regenerate** functionality for improved responses
- **Auto-response prevention** for reviews older than 30 days
- **Team voice** ("We" instead of "I") for professional consistency

## What you can demo quickly
- **External Review Response Manager** with human-like AI responses
- **Critical alert system** for serious issues (health, safety, staff misconduct)
- **5-star review handling** with positive acknowledgment
- **Reject & Regenerate** to show AI improvement
- Internal reviews table (Recent Internal Reviews) with Status traffic lights

## External Reviews data sources
1) Database (preferred): public.external_reviews
2) Fallback demo JSON: public/data/external_reviews_sample.json (UI only)

The dashboard loads from the DB; if there are no rows, it fetches the small sample JSON for demos. The sample JSON is not written to the DB and will NOT trigger workflows.

## 🤖 NEW AI Response System (Production Ready)

### **Human-Like Response Generation**
- **Function**: `generate-external-review-response-improved`
- **Features**:
  - Natural greetings (Hi, Hello, Dear) instead of robotic templates
  - Addresses specific issues (WiFi, breakfast, cleanliness, staff)
  - Team voice ("We" instead of "I") for professional consistency
  - Platform-optimized responses (Google, TripAdvisor, Booking.com)
  - Rating-appropriate tone (apologetic for 1⭐, appreciative for 5⭐)

### **Critical Issue Detection & Manager Alerts**
- **Function**: `external-review-critical-alert`
- **Triggers Manager Emails For**:
  - Health & safety issues (food poisoning, mold, injuries)
  - Severe cleanliness problems (filthy rooms, bed bugs)
  - Staff misconduct (rude, discriminatory behavior)
  - Major operational failures (no hot water, broken systems)
  - Security issues (theft, unsafe conditions)
  - Legal/compliance concerns
- **Email Recipients**: Manager + gizzy@guest-glow.com
- **Conservative Approach**: Only truly serious issues trigger alerts

### **Auto-Response Prevention Rule**
- **No auto-responses** for reviews older than 30 days from current date
- **Purpose**: Prevents expensive AI calls on old dataset reviews
- **Control**: Allows seeding historical data without triggering responses

Posting to platforms (after approval)
- post-platform-response publishes an approved response and updates status to posted

## 🧪 How to Test the New System

### **Option 1: Use UI Test Buttons**
1. **"Simulate New Review"** - Creates realistic external reviews
2. **"Create Test Draft"** - Creates old-style response for testing
3. **"Reject & Regenerate"** - Tests the new AI improvement system

### **Option 2: Seed Dataset Samples**
```bash
node seed-dataset-samples.js
```
- Seeds diverse sample reviews from the dataset
- Applies 30-day auto-response rule
- Tests critical alert system
- Shows human-like response generation

### **Option 3: Manual Testing**
1. Navigate to **External Review Response Manager**
2. Create test reviews with different ratings (1-5 stars)
3. Test the workflow: Draft → Approve → Posted
4. Try "Reject & Regenerate" to see AI improvement

### **Testing Critical Alerts**
- Create 1-star review with serious issues (mold, food poisoning, staff misconduct)
- System should trigger manager email alert
- Check email for severity score and recommended actions

## Prompt quality for external responses
- generate-external-review-response builds a platform‑specific prompt:
  - Thanks the guest, addresses specifics, and uses tenant brand voice
  - For low ratings: apologizes and proposes improvement / invite to discuss
  - Keeps within platform tone/length
- Managers review draft, optionally edit, and approve to post externally

## Safety & production notes
- The webhook triggers AI generation only for response_required reviews (<= 3 stars) by default to control costs
- Generation is non‑blocking; webhook insert always succeeds unless DB insert fails
- Do not expose secrets in the frontend (webhook calls must be server‑side)

## 🌍 Production Deployment Ready

### **Email Configuration for Go-Live**
**Test Emails (Current)**:
- Manager: `g.basera@yahoo.com`
- CC: `gizzy@guest-glow.com`
- Sender: `g.basera@gmail.com`

**Production Replacement (Go-Live)**:
- Replace test emails with client's actual manager emails
- Update tenant settings in database
- Verify email delivery and formatting

### **Dataset Processing**
- **Historical Data**: Use 30-day rule to prevent auto-responses on old reviews
- **New Reviews**: Full AI processing with critical alerts
- **Cost Control**: Only recent reviews trigger expensive AI calls

## 🎯 **System Status: PRODUCTION READY**
✅ Human-like AI responses
✅ Critical issue detection
✅ Manager alert system
✅ Reject & regenerate functionality
✅ Auto-response prevention rule
✅ Team voice consistency
✅ Platform optimization
✅ Complete error handling

**Ready for global deployment and client demonstrations!** 🌍

## Where the code lives
- **Main UI**: guestglow-fresh/src/components/ExternalReviewResponseManager.tsx
- **AI Prompts**: guestglow-fresh/src/config/external-review-prompts.ts
- **Edge Functions**: generate-external-review-response-improved, external-review-critical-alert
- **Test Scripts**: seed-dataset-samples.js, debug-reject-regenerate.js
- **Legacy**: ExternalReviewsTab.tsx (old system)

## Rollback plan
- To disable auto-generation temporarily: comment out the invocation block in webhook-reviews after the insert (search for generate-external-review-response in that file).

