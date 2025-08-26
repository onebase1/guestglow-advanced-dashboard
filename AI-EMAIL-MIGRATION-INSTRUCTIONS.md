# 🤖 AI EMAIL MIGRATION INSTRUCTIONS

## OBJECTIVE
Convert hardcoded email recipients to form-configurable system that's safe by default and scalable for new tenants.

## PHASE 1: SAFE FALLBACKS (Priority 1 - Do Now)

### Replace ALL hardcoded emails with safe fallback:
- **Find**: `g.basera@yahoo.com`, `guestrelations@eusbetthotel.com`, `gm@eusbetthotel.com`, `erbennett@gmail.com`  
- **Replace with**: `system-fallback@guest-glow.com`

### Files to update:
- `src/utils/tenant.ts` (contact_email)
- `supabase/functions/sla-monitor/index.ts` (managerEmail, recipientEmail)  
- `supabase/functions/escalation-manager/index.ts` (fallback hierarchy emails)
- Any other hardcoded email addresses you find

## PHASE 2: DATABASE CONFIG TABLE (Priority 2)

### Create table: `tenant_email_config`
- `tenant_id` (FK to tenants)
- `guest_relations_email` (default: system-fallback@guest-glow.com)
- `general_manager_email` (default: system-fallback@guest-glow.com) 
- `operations_director_email` (default: system-fallback@guest-glow.com)
- `emails_enabled` (boolean, default: false) - Master switch
- `manager_emails_enabled` (boolean, default: false)
- `escalation_emails_enabled` (boolean, default: false)

### Populate with safe defaults for all existing tenants

## PHASE 3: UI FORM (Priority 3)

### Create email config form component:
- Email address inputs (3 addresses)  
- Master enable toggle (CRITICAL - controls real email sending)
- Individual email type toggles
- Save/load from database

### Add to dashboard/settings page

## PHASE 4: DYNAMIC EMAIL ROUTING (Priority 4)

### Update email functions to:
1. Query `tenant_email_config` table
2. If `emails_enabled = false` → send to `system-fallback@guest-glow.com`
3. If `emails_enabled = true` → use configured real addresses
4. Respect individual email type toggles

## SUCCESS CRITERIA

- **Safe by default**: System never sends real emails until explicitly enabled via form
- **Form-driven**: Change emails via UI, zero code changes
- **Scalable**: New tenants get safe config, enable when ready
- **Guest emails**: Always work (sent to guest's own email)
- **System CC**: Always to `gizzy@guest-glow.com`

## KEY PRINCIPLE
**NO REAL CLIENT EMAILS SENT UNTIL FORM SUBMITTED AND MASTER TOGGLE ENABLED**