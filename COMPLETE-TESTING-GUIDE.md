# 🧪 **COMPLETE TESTING GUIDE - 2-Stage Escalation System**

## 🎯 **WHAT YOU NOW HAVE:**

### **✅ Simplified 2-Stage Escalation:**
1. **Guest Relations** (`g.basera@yahoo.com`) → Gets initial alerts & reminders
2. **General Manager** (`basera@btinternet.com`) → Gets escalated alerts
3. **Auto-Close** → System automatically closes unresolved feedback with stats logging

### **⏰ Testing Timeline (3-minute intervals):**
- **1.5 minutes**: Reminder to Guest Relations
- **3 minutes**: Escalate to GM  
- **6 minutes**: Final reminder to GM
- **12 minutes**: Auto-close with weekly stats logging

---

## 🚀 **STEP-BY-STEP TESTING PROCESS**

### **Step 1: Set Up the System**
```sql
-- Run these SQL files in order:
1. SIMPLIFIED-2STAGE-ESCALATION.sql     -- Sets up 2-stage manager system
2. WEEKLY-STATS-FUNCTIONS.sql           -- Creates reporting functions
3. TESTING-VS-PRODUCTION-TIMING.sql     -- Enables 3-minute testing mode
```

### **Step 2: Verify Configuration**
```sql
-- Check manager setup
SELECT 
    manager_name,
    email_address,
    department,
    escalation_level
FROM public.manager_configurations mc
JOIN public.tenants t ON t.id = mc.tenant_id
WHERE t.slug = 'eusbett'
ORDER BY escalation_level;

-- Expected results:
-- Guest Relations Manager | g.basera@yahoo.com     | Guest Relations | 1
-- General Manager         | basera@btinternet.com  | Management      | 2
```

### **Step 3: Submit Test Feedback**
1. **Go to your feedback form**
2. **Submit feedback with these details:**
   - **Name**: Test User SLA
   - **Email**: `test.sla@example.com`
   - **Room**: 999
   - **Rating**: 1 or 2 stars (triggers alerts)
   - **Category**: Service Quality
   - **Comments**: "Testing SLA escalation system - please ignore"

### **Step 4: Watch the Email Flow**

#### **⏰ Immediate (0 minutes):**
- ✅ **Guest gets confirmation** → `test.sla@example.com`
- ✅ **Guest Relations gets alert** → `g.basera@yahoo.com`
- ✅ **System monitoring** → `gizzy@guest-glow.com` (BCC)

#### **⏰ 1.5 Minutes Later:**
- ✅ **Reminder to Guest Relations** → `g.basera@yahoo.com`
- Subject: "⏰ REMINDER: Unacknowledged Feedback - Room 999"

#### **⏰ 3 Minutes Later:**
- ✅ **Escalation to GM** → `basera@btinternet.com`
- Subject: "🚨 ESCALATED TO GM: Unresolved Feedback - Room 999"

#### **⏰ 6 Minutes Later:**
- ✅ **Final reminder to GM** → `basera@btinternet.com`
- Subject: "⏰ REMINDER: Unacknowledged Feedback - Room 999"

#### **⏰ 12 Minutes Later:**
- ✅ **Auto-close notification** → `gizzy@guest-glow.com`
- Subject: "🔒 AUTO-CLOSED: Feedback 999 - No Manager Response"
- ✅ **Feedback status** → Changed to "auto_closed"
- ✅ **Weekly stats** → Logged for reporting

---

## 📧 **EMAIL VERIFICATION CHECKLIST**

### **✅ Check g.basera@yahoo.com:**
- [ ] Initial alert email received immediately
- [ ] Reminder email received at 1.5 minutes
- [ ] No more emails after GM escalation

### **✅ Check basera@btinternet.com:**
- [ ] Escalation email received at 3 minutes
- [ ] Final reminder received at 6 minutes
- [ ] No more emails after auto-close

### **✅ Check gizzy@guest-glow.com:**
- [ ] BCC on all manager emails (not CC)
- [ ] Auto-close notification at 12 minutes

---

## 🔧 **TROUBLESHOOTING**

### **❌ No Emails Received:**
```sql
-- Check if SLA monitor is running
SELECT * FROM public.system_logs 
WHERE event_category = 'sla_monitor' 
ORDER BY created_at DESC LIMIT 5;

-- Manually trigger SLA monitor
SELECT * FROM supabase.functions.invoke('sla-monitor', '{}');
```

### **❌ Wrong Email Addresses:**
```sql
-- Update manager emails
UPDATE public.manager_configurations 
SET email_address = 'correct@email.com'
WHERE department = 'Guest Relations';
```

### **❌ Timing Too Fast/Slow:**
```sql
-- Adjust timing (0.05 = 3 minutes, 0.5 = 30 minutes)
UPDATE public.category_routing_configurations 
SET auto_escalation_hours = 0.05
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
```

---

## 📊 **WEEKLY STATS TESTING**

### **View Current Stats:**
```sql
-- Get this week's escalation stats
SELECT * FROM public.get_weekly_escalation_stats(
    DATE_TRUNC('week', CURRENT_DATE)::DATE, 
    1
);

-- Get manager performance
SELECT * FROM public.get_manager_performance_stats(
    DATE_TRUNC('week', CURRENT_DATE)::DATE
);
```

### **Expected Stats After Test:**
- **Total Escalations**: 1
- **Guest Relations Escalations**: 1
- **GM Escalations**: 1
- **Auto-Closures**: 1
- **Acknowledgment Rate**: 0% (no one acknowledged)
- **Response Time**: NULL (no response)

---

## 🏨 **GOING TO PRODUCTION**

### **When Testing is Complete:**

1. **Update to Production Timing:**
```sql
-- Switch to 30-minute intervals
UPDATE public.category_routing_configurations 
SET auto_escalation_hours = 0.5  -- 30 minutes
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
```

2. **Update to Real Manager Emails:**
```sql
-- Replace with real hotel emails
UPDATE public.manager_configurations 
SET email_address = CASE 
    WHEN escalation_level = 1 THEN 'guestrelations@eusbetthotel.com'
    WHEN escalation_level = 2 THEN 'gm@eusbetthotel.com'
    ELSE email_address
END
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
```

3. **Enable Live Emails:**
```sql
-- Turn on real email sending
UPDATE public.tenant_email_config 
SET 
    emails_enabled = TRUE,
    manager_emails_enabled = TRUE,
    escalation_emails_enabled = TRUE
WHERE tenant_id = (SELECT id FROM public.tenants WHERE slug = 'eusbett');
```

---

## 🎯 **SUCCESS CRITERIA**

### **✅ System is Working When:**
- [ ] Guest gets immediate confirmation email
- [ ] Guest Relations gets alert within 30 seconds
- [ ] Reminder sent at correct interval (1.5 min testing / 15 min production)
- [ ] GM escalation at correct interval (3 min testing / 30 min production)
- [ ] Auto-close happens at final interval (12 min testing / 2 hours production)
- [ ] All emails use BCC for system monitoring (not CC)
- [ ] Weekly stats are logged correctly
- [ ] No duplicate or missing emails

### **🚨 Red Flags:**
- [ ] Emails going to system-fallback@guest-glow.com (means config issue)
- [ ] Multiple escalations for same feedback
- [ ] Emails not arriving at expected times
- [ ] CC instead of BCC for monitoring
- [ ] Stats not being logged

---

## 📞 **SUPPORT**

If you encounter issues:
1. **Check the system logs** for error messages
2. **Verify email addresses** in manager_configurations table
3. **Confirm timing settings** in category_routing_configurations
4. **Test with different feedback categories** to isolate issues
5. **Check Supabase function logs** for execution errors

**Ready to test!** 🚀
