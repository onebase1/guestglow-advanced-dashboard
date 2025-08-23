# Supabase Environment Variables Setup

## 🚨 CRITICAL: Set These Environment Variables in Supabase Dashboard

To fix the email routing issues, you MUST set these environment variables in your Supabase project:

### 📍 Where to Set Variables:
1. Go to Supabase Dashboard
2. Select your project
3. Go to Settings → Edge Functions
4. Add these environment variables:

### 🔧 Required Environment Variables:

```bash
# Food & Beverage Manager
FOOD_BEVERAGE_MANAGER_EMAIL=basera@btinternet.com
FOOD_BEVERAGE_MANAGER_NAME=Sarah Johnson

# Housekeeping Manager  
HOUSEKEEPING_MANAGER_EMAIL=zara80@gmail.com
HOUSEKEEPING_MANAGER_NAME=Michael Asante

# Security Manager
SECURITY_MANAGER_EMAIL=g.basera80@gmail.com
SECURITY_MANAGER_NAME=Robert Kwame

# Front Desk Manager
FRONT_DESK_MANAGER_EMAIL=g.basera5@gmail.com
FRONT_DESK_MANAGER_NAME=David Mensah

# Maintenance Manager
MAINTENANCE_MANAGER_EMAIL=gizzy@dreampathdigitalsolutions.co.uk
MAINTENANCE_MANAGER_NAME=Jennifer Boateng

# General Manager (Fallback)
GENERAL_MANAGER_EMAIL=g.basera@yahoo.com
GENERAL_MANAGER_NAME=Hotel Manager

# 🚨 CRITICAL: Email Test Mode Control
EMAIL_TEST_MODE=true
# Set to 'false' for production to use real email addresses
```

### 🎯 Go-Live Process:

**Before Go-Live:**
1. Get real manager details from client
2. Update these environment variables in Supabase Dashboard
3. **Set EMAIL_TEST_MODE=false** for production
4. Test feedback submission
5. Verify emails go to correct managers

**Example for Production:**
```bash
FOOD_BEVERAGE_MANAGER_EMAIL=sarah.johnson@eusbetthotel.com
FOOD_BEVERAGE_MANAGER_NAME=Sarah Johnson
HOUSEKEEPING_MANAGER_EMAIL=michael.asante@eusbetthotel.com
HOUSEKEEPING_MANAGER_NAME=Michael Asante
# ... etc

# 🚨 CRITICAL FOR PRODUCTION:
EMAIL_TEST_MODE=false
```

### ✅ Testing:
1. Submit "Food & Beverage" feedback
2. Should route to: `basera@btinternet.com` (Sarah Johnson)
3. Email should say "Dear Sarah Johnson" not "Dear Manager"
4. Guest should receive confirmation email

### 🚨 IMPORTANT:
- These variables are for Supabase Edge Functions (not frontend .env)
- Changes take effect immediately after setting
- No code deployment needed - just update variables
- Test after each change

### 📧 Email Flow After Fix:
1. **Guest submits feedback** with email `guest@example.com`
2. **Guest gets confirmation** at `guest@example.com`
3. **Manager gets alert** at category-specific email (e.g., `basera@btinternet.com`)
4. **Email says** "Dear Sarah Johnson" (personalized)
5. **Total emails**: 2 (guest + manager)

### 🔍 Debugging:
If emails still go to wrong addresses:
1. Check Supabase Edge Function logs
2. Verify environment variables are set correctly
3. Test with different feedback categories
4. Check email logs in communication_logs table
