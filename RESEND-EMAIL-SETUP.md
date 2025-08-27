# 📧 Resend Email System Setup Guide

## 🚨 CRITICAL: Environment Variables Required

You MUST set these environment variables in your Supabase project for the email system to work:

### 📍 Where to Set Variables:
1. Go to Supabase Dashboard: https://supabase.com/dashboard
2. Select your project: `wzfpltamwhkncxjvulik`
3. Go to Settings → Edge Functions
4. Add these environment variables:

### 🔧 Required Environment Variables:

```bash
# Resend API Configuration
RESEND_API_KEY=re_your_resend_api_key_here

# Manager Email Configuration (for feedback routing)
FOOD_BEVERAGE_MANAGER_EMAIL=basera@btinternet.com
FOOD_BEVERAGE_MANAGER_NAME=Sarah Johnson

HOUSEKEEPING_MANAGER_EMAIL=zara80@gmail.com
HOUSEKEEPING_MANAGER_NAME=Michael Asante

SECURITY_MANAGER_EMAIL=g.basera80@gmail.com
SECURITY_MANAGER_NAME=Robert Kwame

FRONT_DESK_MANAGER_EMAIL=g.basera5@gmail.com
FRONT_DESK_MANAGER_NAME=David Mensah

MAINTENANCE_MANAGER_EMAIL=gizzy@dreampathdigitalsolutions.co.uk
MAINTENANCE_MANAGER_NAME=Jennifer Boateng

GENERAL_MANAGER_EMAIL=g.basera@yahoo.com
GENERAL_MANAGER_NAME=Hotel Manager
```

## 📧 Email Aliases Configuration

The system uses these email aliases (configured in your Resend dashboard):

### **Required Email Aliases to Set Up in Resend:**

1. **alerts@guest-glow.com** - Manager alerts and escalations
   - Purpose: Urgent notifications to managers
   - Used for: Feedback alerts, SLA escalations
   - Forward to: System monitoring email

2. **feedback@guest-glow.com** - Guest communications and feedback
   - Purpose: All guest-facing communications
   - Used for: Feedback confirmations, satisfaction surveys
   - Forward to: Guest relations team

3. **reports@guest-glow.com** - Analytics and reports (for Robert & Edward)
   - Purpose: Automated reports and analytics
   - Used for: Daily/weekly/monthly reports, GM communications
   - Forward to: Management team

4. **system@guest-glow.com** - System notifications
   - Purpose: Technical and system notifications
   - Used for: Error alerts, system status updates
   - Forward to: Technical team

5. **welcome@guest-glow.com** - Tenant onboarding
   - Purpose: New tenant welcome emails
   - Used for: Onboarding communications
   - Forward to: Support team

### **How to Set Up Email Aliases in Resend:**

1. Log into your Resend dashboard
2. Go to Domains → guest-glow.com
3. Click "Add Email Address" for each alias above
4. Configure forwarding rules if needed
5. Verify DKIM and SPF records are properly configured

## 🔐 DKIM/SPF Configuration

Ensure these DNS records are set for guest-glow.com:

### **SPF Record:**
```
TXT @ "v=spf1 include:_spf.resend.com ~all"
```

### **DKIM Record:**
```
TXT resend._domainkey "p=MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQC..."
```
(Get the actual DKIM key from your Resend dashboard)

### **DMARC Record (Optional but Recommended):**
```
TXT _dmarc "v=DMARC1; p=quarantine; rua=mailto:dmarc@guest-glow.com"
```

## 📧 Email Aliases Configuration

The system uses these email aliases (configured in your Resend dashboard):

- `alerts@guest-glow.com` - Manager alerts and escalations
- `feedback@guest-glow.com` - Guest communications and feedback
- `reports@guest-glow.com` - Analytics and reports (for Robert & Edward)
- `system@guest-glow.com` - System notifications
- `welcome@guest-glow.com` - Tenant onboarding

## 🧪 Testing the System

1. Open `test-email-system.html` in your browser
2. Run each test to verify functionality:
   - Core Email Service Test
   - Feedback Email Test
   - QR Code Email Test
   - Thank You Generator Test
   - GM Introduction Email Test

## 📋 Functions Created

✅ **send-tenant-emails** - Core email service with Resend integration
✅ **generate-feedback-emails** - Handles feedback form submissions
✅ **send-feedback-link** - Sends QR code feedback links
✅ **thank-you-generator** - Generates personalized thank you responses

## 🔄 Migration from N8N

The new system replaces all N8N dependencies:
- ❌ N8N webhooks → ✅ Supabase Edge Functions
- ❌ noreply@guest-glow.com → ✅ Proper email aliases
- ❌ Manual email sending → ✅ Automated email flows
- ❌ External dependencies → ✅ Self-contained system

## 🚀 Next Steps

1. **Set Environment Variables** (above)
2. **Test Email System** (use test-email-system.html)
3. **Verify Email Delivery** (check g.basera5@gmail.com)
4. **Deploy to Production** (send GM introduction to Robert & Edward)

## 📊 Email Types Supported

| Email Type | Sender | Purpose |
|------------|--------|---------|
| manager_alert | alerts@guest-glow.com | Feedback notifications to managers |
| guest_confirmation | feedback@guest-glow.com | Guest feedback confirmations |
| satisfaction_followup | feedback@guest-glow.com | Post-resolution surveys |
| gm_introduction | reports@guest-glow.com | GM system introduction |
| daily_report | reports@guest-glow.com | Automated daily reports |
| system_notification | system@guest-glow.com | System alerts |

## 🔧 Troubleshooting

**Email not sending?**
1. Check RESEND_API_KEY is set correctly
2. Verify email aliases are configured in Resend
3. Check Supabase function logs
4. Test with test-email-system.html

**Manager emails not routing correctly?**
1. Verify manager environment variables are set
2. Check manager_configurations table in database
3. Test specific categories with test-email-routing.html

**Guest emails not working?**
1. Ensure guest email is provided in feedback form
2. Check communication_logs table for delivery status
3. Verify email templates are rendering correctly

## 📈 Monitoring

All emails are logged in the `communication_logs` table with:
- Email type and recipient
- Delivery status
- External ID from Resend
- Metadata and timestamps

## 🎯 Production Readiness

✅ Resend integration complete
✅ Email aliases configured
✅ Template system implemented
✅ Error handling and logging
✅ Test suite available
✅ Environment variable configuration
✅ Database logging
✅ Backward compatibility maintained

The system is ready for production use once environment variables are set!
