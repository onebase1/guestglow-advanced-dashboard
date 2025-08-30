// Test script to send GM reports using Resend API directly
const RESEND_API_KEY = 'your-resend-api-key'; // This will be set via environment variable
const SUPABASE_URL = 'https://wzfpltamwhkncxjvulik.supabase.co';
const SUPABASE_ANON_KEY = 'your-anon-key'; // This will be set via environment variable

// Email templates based on our mock data
const generateDailyBriefingEmail = () => {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return {
    subject: `📊 Eusbett Hotel - Daily Rating Briefing • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .email-container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .metrics-section { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .metric-row { display: flex; justify-content: space-between; margin: 8px 0; font-size: 14px; }
        .metric-label { color: #374151; }
        .metric-value { font-weight: bold; color: #0ea5e9; }
        .status-good { color: #059669; font-weight: bold; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">📊 EUSBETT HOTEL - DAILY RATING BRIEFING</div>
            <div style="color: #6b7280; font-size: 16px;">Date: ${today} • 8:00 AM Report</div>
        </div>

        <h3>⭐ GOAL PROGRESS UPDATE</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Current Rating:</span>
                <span class="metric-value">4.12⭐ (+0.02 from yesterday)</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Five-Star Progress:</span>
                <span class="metric-value">57/278 reviews (20.5% complete)</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Status:</span>
                <span class="status-good">Ahead of Schedule ✅</span>
            </div>
        </div>

        <h3>📈 YESTERDAY'S PERFORMANCE</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">New Five-Star Reviews:</span>
                <span class="metric-value">3 reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Rating Impact:</span>
                <span class="metric-value">+0.02⭐</span>
            </div>
        </div>

        <h3>🎯 NEAR-MISS OPPORTUNITIES</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">High-Value Guests (didn't review externally):</span>
                <span class="metric-value">15 guests</span>
            </div>
            <p style="margin: 10px 0; font-size: 14px;">
                • Sarah Mitchell (Business, loved WiFi/location)<br>
                • Emma & James Thompson (Anniversary couple)<br>
                • Hans Mueller (International business traveler)<br>
                <strong>Follow-up Status:</strong> Automated emails sent ✅
            </p>
        </div>

        <h3>🚨 ATTENTION NEEDED</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Recurring Issue:</span>
                <span class="metric-value">Room Cleanliness (3 complaints this week)</span>
            </div>
            <p style="margin: 10px 0; font-size: 14px;">
                <strong>Recommended Action:</strong> Extra housekeeping quality checks before 3 PM
            </p>
        </div>

        <h3>📊 WEEKLY OUTLOOK</h3>
        <div class="metrics-section">
            <div class="metric-row">
                <span class="metric-label">Reviews Needed This Week:</span>
                <span class="metric-value">11 five-star reviews</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Current Pace:</span>
                <span class="metric-value">13 five-star reviews (ahead of target)</span>
            </div>
            <div class="metric-row">
                <span class="metric-label">Forecast:</span>
                <span class="status-good">On track to exceed weekly goal 📈</span>
            </div>
        </div>

        <p style="margin-top: 30px;"><strong>Questions? Reply to this email or call ext. 2847</strong></p>

        <div class="footer">
            <p>GuestGlow Advanced Analytics • Intelligent Guest Experience Management</p>
            <p>This automated report was generated at ${new Date().toLocaleString('en-GB')}</p>
        </div>
    </div>
</body>
</html>`
  };
};

const generateWeeklyReportEmail = () => {
  const today = new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' });

  return {
    subject: `🔍 Eusbett Hotel - Weekly Issues Analysis • ${new Date().toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })}`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .email-container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .header { text-align: center; border-bottom: 3px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #dc2626; margin-bottom: 10px; }
        .issue-section { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .positive-section { background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .conversion-section { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .issue-item { margin: 10px 0; padding: 8px; background: white; border-radius: 4px; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🔍 WEEKLY ISSUES ANALYSIS - EUSBETT HOTEL</div>
            <div style="color: #6b7280; font-size: 16px;">Week Ending: ${today} • Comprehensive Pattern Report</div>
        </div>

        <h3>🚨 RECURRING PROBLEMS DETECTED</h3>
        <div class="issue-section">
            <div class="issue-item">
                <strong>Room Cleanliness:</strong> 8 complaints (-0.3⭐ impact)
                <br><small><strong>Action:</strong> Increase inspection frequency, focus on rooms 204 & 207</small>
            </div>
            <div class="issue-item">
                <strong>WiFi Connectivity:</strong> 6 complaints (-0.2⭐ impact)
                <br><small><strong>Action:</strong> Router upgrade scheduled for Tuesday</small>
            </div>
            <div class="issue-item">
                <strong>Noise Issues:</strong> 5 complaints (-0.15⭐ impact)
                <br><small><strong>Action:</strong> Sound insulation review for street-facing rooms</small>
            </div>
            <div class="issue-item">
                <strong>Check-in Delays:</strong> 4 complaints
                <br><small><strong>Action:</strong> Weekend staffing adjustment implemented</small>
            </div>
        </div>

        <h3>🏆 POSITIVE TRENDS</h3>
        <div class="positive-section">
            <p><strong>Staff Friendliness:</strong> +23 mentions this week</p>
            <p><strong>Location Convenience:</strong> +19 mentions this week</p>
            <p><strong>Room Comfort:</strong> +16 mentions this week</p>
        </div>

        <h3>📊 CONVERSION OPPORTUNITIES</h3>
        <div class="conversion-section">
            <p><strong>Internal 5⭐ Guests:</strong> 25 total tracked</p>
            <p><strong>External Conversion Rate:</strong> 40% (10 converted)</p>
            <p><strong>Potential Gain:</strong> +15 additional five-star reviews</p>
            <p><strong>High-Priority Targets:</strong> Sarah Mitchell, David Chen, Hans Mueller</p>
        </div>

        <h3>💡 RECOMMENDED ACTIONS</h3>
        <ol>
            <li><strong>Immediate:</strong> Housekeeping spot-checks before 3 PM daily</li>
            <li><strong>This Week:</strong> WiFi upgrade completion by Wednesday</li>
            <li><strong>Weekend:</strong> Additional front desk staff during peak check-in</li>
            <li><strong>Ongoing:</strong> Follow-up with recent 5⭐ guests for external reviews</li>
        </ol>

        <p style="margin-top: 30px;"><strong>Next Report: Monday, ${new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toLocaleDateString('en-GB', { day: '2-digit', month: 'long', year: 'numeric' })} • 9:00 AM</strong></p>

        <div class="footer">
            <p>GuestGlow Advanced Analytics • Intelligent Guest Experience Management</p>
            <p>This automated report was generated at ${new Date().toLocaleString('en-GB')}</p>
        </div>
    </div>
</body>
</html>`
  };
};

const generateUrgentAlertEmail = () => {
  return {
    subject: `🚨 URGENT: Eusbett Hotel Rating Drop Detected - Immediate Action Required`,
    html: `
<!DOCTYPE html>
<html>
<head>
    <meta charset="UTF-8">
    <style>
        body { font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #fef2f2; }
        .email-container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); border: 2px solid #dc2626; }
        .header { text-align: center; background: #dc2626; color: white; padding: 20px; margin: -30px -30px 30px -30px; border-radius: 6px 6px 0 0; }
        .logo { font-size: 24px; font-weight: bold; margin-bottom: 10px; }
        .alert-section { background: #fef2f2; border: 1px solid #fecaca; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .recovery-section { background: #f0f9ff; border: 1px solid #0ea5e9; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .action-section { background: #fffbeb; border: 1px solid #fbbf24; border-radius: 6px; padding: 15px; margin: 20px 0; }
        .critical { color: #dc2626; font-weight: bold; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="header">
            <div class="logo">🚨 URGENT: RATING DROP DETECTED</div>
            <div>IMMEDIATE ACTION REQUIRED</div>
        </div>

        <div class="alert-section">
            <h3>⚠️ TRIGGER EVENT</h3>
            <p><strong>Current Rating:</strong> 3.94⭐ (↓0.14 from yesterday)</p>
            <p><strong>Previous Rating:</strong> 4.08⭐</p>
            <p><strong>Cause:</strong> Two 1⭐ reviews posted within 6 hours</p>
            <p><strong>Issues Cited:</strong> Housekeeping problems in rooms 204 & 207</p>
            <p><strong>Impact:</strong> Visible rating drop on Google and Booking.com</p>
        </div>

        <div class="recovery-section">
            <h3>📊 RECOVERY ANALYSIS</h3>
            <p><strong>Reviews needed for recovery:</strong> 12 five-star reviews</p>
            <p><strong>Current daily average:</strong> 1.9 five-star reviews</p>
            <p><strong>Recovery timeline:</strong> 6-7 days at current pace</p>
        </div>

        <div class="action-section">
            <h3>🎯 IMMEDIATE ACTION PLAN</h3>
            <ol>
                <li>Contact both guests directly for service recovery</li>
                <li>Inspect rooms 204 & 207 and entire floor</li>
                <li>Review housekeeping procedures with staff</li>
                <li>Activate recent positive guest outreach campaign</li>
                <li>Monitor social media for any viral complaints</li>
            </ol>
        </div>

        <h3>📞 CONTACT PRIORITIES</h3>
        <p><strong>High-priority recent guests for follow-up:</strong></p>
        <div class="recovery-section">
            <p>• Sarah Mitchell (Business, Room 312) - 5⭐ internal</p>
            <p>• Emma Thompson (Anniversary, Room 418) - 5⭐ internal</p>
            <p>• Hans Mueller (International, Room 301) - 5⭐ internal</p>
        </div>

        <div class="alert-section">
            <p><strong>Status:</strong> <span class="critical">Response plan activated</span></p>
            <p><strong>Next update:</strong> 2 hours</p>
            <p><strong>Alert Level:</strong> <span class="critical">CRITICAL - Severity 10/10</span></p>
            <p><strong>Generated at:</strong> ${new Date().toLocaleString('en-GB')}</p>
            <p><strong class="critical">Immediate response required within 2 hours</strong></p>
        </div>

        <div class="footer">
            <p>GuestGlow Advanced Analytics • Intelligent Guest Experience Management</p>
            <p>This critical alert was generated automatically based on rating threshold breach</p>
        </div>
    </div>
</body>
</html>`
  };
};

// Function to send emails using Resend API
async function sendEmail(emailData, recipients, ccRecipients = []) {
  const RESEND_API_KEY = 're_123456789'; // This should be set from environment

  try {
    const response = await fetch('https://api.resend.com/emails', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${RESEND_API_KEY}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        from: 'GuestGlow Analytics <reports@guest-glow.com>',
        to: recipients,
        cc: ccRecipients,
        subject: emailData.subject,
        html: emailData.html,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log('Email sent successfully:', result);
    return result;
  } catch (error) {
    console.error('Error sending email:', error);
    throw error;
  }
}

// Main function to send all reports
async function sendGMReports() {
  const recipients = ['g.basera@yahoo.com'];
  const ccRecipients = ['gizzy@guest-glow.com'];

  try {
    console.log('Sending Daily Briefing...');
    const dailyEmail = generateDailyBriefingEmail();
    await sendEmail(dailyEmail, recipients, ccRecipients);

    console.log('Sending Weekly Report...');
    const weeklyEmail = generateWeeklyReportEmail();
    await sendEmail(weeklyEmail, recipients, ccRecipients);

    console.log('Sending Urgent Alert...');
    const urgentEmail = generateUrgentAlertEmail();
    await sendEmail(urgentEmail, recipients, ccRecipients);

    console.log('All reports sent successfully!');
  } catch (error) {
    console.error('Error sending reports:', error);
  }
}

// Export for use
if (typeof module !== 'undefined' && module.exports) {
  module.exports = {
    generateDailyBriefingEmail,
    generateWeeklyReportEmail,
    generateUrgentAlertEmail,
    sendEmail,
    sendGMReports
  };
}