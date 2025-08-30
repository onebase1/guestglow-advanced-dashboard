# 🛡️ SECURITY TESTING - EMAIL REVERT INSTRUCTIONS

## ⚠️ TEMPORARY CHANGES MADE FOR SECURITY TESTING

**Date**: 2025-08-30  
**Purpose**: Prevent hotel team panic during security detection system testing  
**Duration**: Temporary - MUST BE REVERTED after testing complete

---

## 📧 CHANGES MADE

### Replaced Email Addresses:
- **FROM**: `guestrelations@eusbetthotel.com`
- **TO**: `basera@btinternet.com` (TEMPORARY)

### Files Modified:
1. `supabase/functions/send-approval-notification/index.ts` - Line 88
2. `supabase/functions/generate-feedback-emails/index.ts` - Line 150
3. `supabase/functions/send-satisfaction-followup/index.ts` - Lines 139-163
4. `GM-Introduction-Email-Enhanced.html` - Line 177

### Functions Deployed:
- ✅ `send-approval-notification`
- ✅ `generate-feedback-emails`
- ✅ `send-satisfaction-followup`

---

## 🔄 HOW TO REVERT AFTER TESTING

### Step 1: Revert Code Changes

**File 1: `supabase/functions/send-approval-notification/index.ts`**
```typescript
// CHANGE THIS BACK:
to: [
  'basera@btinternet.com', // TEMPORARY: Replaced guestrelations@eusbetthotel.com for security testing
  'gizzy@guest-glow.com',
  'g.basera@yahoo.com',
  'gm@eusbetthotels.com',
  'erbennett@gmail.com'
],

// TO THIS:
to: [
  'guestrelations@eusbetthotel.com',
  'gizzy@guest-glow.com',
  'g.basera@yahoo.com',
  'gm@eusbetthotels.com',
  'erbennett@gmail.com'
],
```

**File 2: `supabase/functions/generate-feedback-emails/index.ts`**
```typescript
// CHANGE THIS BACK:
const ccEmails = ['g.basera@yahoo.com', 'basera@btinternet.com'] // TEMPORARY: Replaced guestrelations@eusbetthotel.com for security testing

// TO THIS:
const ccEmails = ['g.basera@yahoo.com', 'guestrelations@eusbetthotel.com']
```

**File 3: `supabase/functions/send-satisfaction-followup/index.ts`**
```typescript
// CHANGE ALL INSTANCES OF:
basera@btinternet.com

// BACK TO:
guestrelations@eusbetthotel.com
```

**File 4: `GM-Introduction-Email-Enhanced.html`**
```html
<!-- CHANGE THIS BACK: -->
<span class="highlight">basera@btinternet.com</span>

<!-- TO THIS: -->
<span class="highlight">guestrelations@eusbetthotel.com</span>
```

### Step 2: Redeploy Functions

Run these commands in the project directory:

```bash
npx supabase functions deploy send-approval-notification
npx supabase functions deploy generate-feedback-emails  
npx supabase functions deploy send-satisfaction-followup
```

### Step 3: Verify Revert

Test with a non-security feedback to ensure emails go to correct addresses:
- ✅ `guestrelations@eusbetthotel.com` should receive notifications
- ✅ `basera@btinternet.com` should NOT receive notifications

---

## 🧪 SECURITY TESTING SCENARIOS

### Test Cases to Run:
1. **Staff Misconduct**: "Staff stole my money"
2. **Assault**: "Staff member hit me"
3. **Health Hazard**: "Found mold in bathroom, got sick"
4. **Legal Threat**: "I'm calling my lawyer about this"
5. **Discrimination**: "Staff treated me differently because of my race"
6. **Security Incident**: "Someone broke into my room"

### Expected Behavior During Testing:
- ✅ High-risk responses should be held for approval
- ✅ Approval emails should go to `basera@btinternet.com` (NOT hotel team)
- ✅ System should detect security issues correctly
- ✅ Human-in-the-loop protection should activate

---

## ⚠️ IMPORTANT REMINDERS

### DO NOT FORGET TO REVERT:
- [ ] Hotel team will NOT receive security alerts during testing
- [ ] All security notifications go to `basera@btinternet.com` temporarily
- [ ] System is fully functional but emails redirected
- [ ] MUST revert after testing to restore normal operations

### Testing Complete Checklist:
- [ ] All security scenarios tested
- [ ] Human-in-the-loop system validated
- [ ] Code reverted to original email addresses
- [ ] Functions redeployed with correct emails
- [ ] Test email sent to verify hotel team receives notifications
- [ ] Delete this instruction file

---

## 🎯 TESTING OBJECTIVES

### Validate These Features:
1. **Risk Detection**: AI correctly identifies security threats
2. **Approval Workflow**: High-risk responses held for approval
3. **Email Routing**: Notifications sent to approval team
4. **Human Override**: Approve/reject functionality works
5. **Response Blocking**: Automated responses prevented for high-risk

### Success Criteria:
- ✅ Security keywords trigger approval workflow
- ✅ Approval emails received at test address
- ✅ Approve/reject links function correctly
- ✅ System prevents automated responses for high-risk feedback
- ✅ Hotel team protected from panic during testing

---

**🚨 CRITICAL: This is a temporary configuration for security testing only. MUST be reverted to restore normal hotel operations!**
