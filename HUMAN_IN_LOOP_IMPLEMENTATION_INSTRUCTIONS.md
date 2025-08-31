# 🚨 HUMAN-IN-LOOP SECURITY SYSTEM - IMPLEMENTATION INSTRUCTIONS

## **CRITICAL REQUIREMENTS**

### **1. SECURITY TRIGGER WORDS**
When feedback contains ANY of these words, the delayed AI email must be **BLOCKED** and require human approval:

**High-Risk Keywords:**
- Food poisoning, poisoning, poison, food poinsing
- Stolen, theft, robbed, burglar, missing jewelry, jewels
- Assault, attack, violence, abuse, harassment
- Lawsuit, legal action, sue, lawyer, attorney
- Discrimination, racist, sexist, homophobic
- Injury, hurt, hospital, ambulance, medical emergency
- Fire, smoke, gas leak, carbon monoxide
- Bed bugs, cockroach, rat, mouse, infestation

### **2. EMAIL ROUTING RULES**

**IMMEDIATE ACKNOWLEDGMENT EMAIL:**
- Always sent immediately (no blocking)
- Generic confirmation: "Thank you for your feedback, we've passed this to our team"
- No mention of specific issues

**DELAYED AI EMAIL:**
- **BLOCKED** if dangerous keywords detected
- **BLOCKED** if rating ≤ 2 stars
- Only sent if passes security check

**ALERT EMAIL ROUTING:**
- **Medium/High Risk**: Send to `basera@btinternet.com` ONLY
- **Escalations**: Send to `guestrelations@eusbetthotel.com` + `basera@btinternet.com`
- **Never send routine alerts to basera@btinternet.com**

### **3. HUMAN APPROVAL PROCESS**

**When Dangerous Content Detected:**
1. Block the delayed AI email
2. Store in `response_approvals` table with status 'pending'
3. Send alert to `basera@btinternet.com` with approve/reject links
4. Wait for human decision before sending any AI response

**Approval Actions:**
- **APPROVE**: Send the AI-generated email
- **REJECT**: Block permanently, no AI email sent
- **TIMEOUT**: After 24 hours, escalate to management

## **TECHNICAL IMPLEMENTATION POINTS**

### **4. INTEGRATION POINTS**

**Primary Integration:** `send-delayed-ai-email` function
- This is where the security check must happen
- Must check keywords BEFORE generating AI content
- Must block email sending if dangerous content detected

**Secondary Integration:** `ai-response-generator` function  
- Add security check as backup
- Return blocked status if dangerous content

### **5. DATABASE REQUIREMENTS**

**Tables Needed:**
- `response_approvals` (already exists)
- `approval_tokens` (for secure approve/reject links)

**Required Functions:**
- `assess-response-risk` (keyword + AI analysis)
- `send-approval-notification` (alert emails)
- `process-approval-action` (handle approve/reject)

### **6. TESTING REQUIREMENTS**

**Test Cases:**
1. "Food gave me food poisoning" → Should block delayed email
2. "My jewelry was stolen" → Should block delayed email  
3. "Room was noisy" → Should allow delayed email
4. 1-star rating → Should block delayed email
5. 5-star rating → Should allow delayed email

**Verification:**
- Check `response_approvals` table for blocked emails
- Verify alert emails go to correct recipients
- Confirm delayed emails are actually blocked

## **FAILURE POINTS TO AVOID**

❌ **Don't integrate only in ai-response-generator** - delayed emails bypass this
❌ **Don't send all alerts to basera@btinternet.com** - only medium/high risk
❌ **Don't continue sending emails when security fails** - fail closed, not open
❌ **Don't assume functions are deployed** - verify in production first
❌ **Don't skip testing with real dangerous keywords** - test actual scenarios

## **SUCCESS CRITERIA**

✅ Dangerous keywords block delayed AI emails
✅ Immediate acknowledgment emails always sent
✅ Alert emails go to correct recipients only
✅ Human approval system works end-to-end
✅ System fails safely (blocks when unsure)
✅ All security functions deployed and working

## **IMPLEMENTATION ORDER**

1. **Deploy security functions** (assess-response-risk, etc.)
2. **Test functions work** with dangerous keywords
3. **Integrate security check** in send-delayed-ai-email
4. **Test email blocking** with real feedback
5. **Verify alert routing** to correct emails
6. **Test approval workflow** end-to-end
7. **Deploy to production** only after full testing

---

**REMEMBER: The delayed email system is the critical integration point. Security must be checked BEFORE the AI email is generated and sent, not after.**
