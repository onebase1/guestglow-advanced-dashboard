/**
 * 📧 N8N EMAIL SENDER
 * 
 * Uses the n8n workflow to send emails reliably
 * Workflow ID: 1yHUS4HZQoqKiEoC
 */

// N8N Configuration
const N8N_CONFIG = {
  workflowId: '1yHUS4HZQoqKiEoC',
  webhookPath: 'send-email',
  // You'll need to replace this with your actual n8n instance URL
  baseUrl: 'https://your-n8n-instance.com/webhook'
};

// Email data for the preview
const PREVIEW_EMAIL_DATA = {
  recipient_email: 'g.basera5@gmail.com',
  subject: '[PREVIEW - QUALITY CHECK] GuestGlow Advanced Analytics - System Introduction for Eusbett Hotel',
  html_content: `<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>GuestGlow Advanced Analytics - System Introduction</title>
    <style>
        body { font-family: "Segoe UI", Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f8f9fa; }
        .email-container { background: white; border-radius: 8px; padding: 30px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
        .preview-banner { background: #fbbf24; color: white; padding: 15px; text-align: center; font-weight: bold; margin-bottom: 20px; border-radius: 8px; }
        .header { text-align: center; border-bottom: 3px solid #2563eb; padding-bottom: 20px; margin-bottom: 30px; }
        .logo { font-size: 24px; font-weight: bold; color: #2563eb; margin-bottom: 10px; }
        .subtitle { color: #6b7280; font-size: 16px; }
        .goal-banner { background: linear-gradient(135deg, #fbbf24, #f59e0b); color: white; padding: 20px; border-radius: 8px; text-align: center; margin: 20px 0; font-weight: bold; font-size: 18px; }
        .feature-card { border: 1px solid #e5e7eb; border-radius: 6px; padding: 15px; background: #f9fafb; margin: 15px 0; }
        .footer { border-top: 1px solid #e5e7eb; padding-top: 20px; margin-top: 30px; font-size: 12px; color: #6b7280; text-align: center; }
    </style>
</head>
<body>
    <div class="email-container">
        <div class="preview-banner">
            🔍 PREVIEW EMAIL - FOR QUALITY CHECK ONLY<br>
            <small>This will be sent to: gm@eusbetthotel.com, erbennet@gmail.com after your approval</small><br>
            <small>Please review content, tone, and formatting before sending to Robert and Edward</small>
        </div>
        
        <div class="header">
            <div class="logo">🌟 GuestGlow Advanced Analytics</div>
            <div class="subtitle">Intelligent Guest Experience Management System</div>
        </div>

        <p><strong>Dear Robert and Edward,</strong></p>

        <p>I am excited to introduce you to the <strong>GuestGlow Advanced Analytics System</strong> - a comprehensive platform designed specifically to help Eusbett Hotel achieve measurable rating improvements through data-driven insights.</p>

        <div class="goal-banner">
            🎯 PRIMARY GOAL: 4.0 → 4.5 Stars (0.5 Uplift) in 6 Months<br>
            <small>Target: 278 five-star external reviews • 1.55 per day</small>
        </div>

        <h3>🚀 What This System Will Track & Report</h3>

        <div class="feature-card">
            <strong>⭐ Daily 5-Star Progress</strong><br>
            Real-time tracking toward your 4.5-star goal with daily progress reports
        </div>

        <div class="feature-card">
            <strong>🚨 Recurring Issue Detection</strong><br>
            Automatic identification of problems hurting your rating with impact analysis
        </div>

        <div class="feature-card">
            <strong>📊 Near-Miss Tracking</strong><br>
            Monitor 5-star guests who do not review externally - lost opportunities
        </div>

        <div class="feature-card">
            <strong>⚡ Instant Rating Alerts</strong><br>
            Immediate notifications when rating drops are detected
        </div>

        <h3>🎯 Key Benefits for Eusbett Hotel</h3>

        <ul>
            <li><strong>Proactive Problem Solving:</strong> Identify issues before they become rating killers</li>
            <li><strong>Data-Driven Decisions:</strong> Know exactly what is working and what is not</li>
            <li><strong>Goal Tracking:</strong> Clear visibility on progress toward 4.5-star rating</li>
            <li><strong>Search Visibility:</strong> Higher ratings improve Google search ranking and booking platform placement</li>
            <li><strong>Guest Trust:</strong> 4.5+ star ratings significantly increase booking conversion rates</li>
            <li><strong>Competitive Positioning:</strong> Advanced analytics to stay ahead of local competition</li>
        </ul>

        <h3>🎯 Optional Enhancement Ideas</h3>
        <p><em>These are suggestions that could be implemented if they align with your operational preferences:</em></p>
        
        <div class="feature-card" style="border: 1px dashed #ccc;">
            <strong>🏆 Team Recognition Features (Optional)</strong><br>
            <strong>What it could include:</strong> Highlight staff members mentioned positively in reviews<br>
            <strong>Implementation:</strong> Only if it fits your management style and team culture<br>
            <strong>Benefit:</strong> Some hotels find this motivates staff, but we understand every team is different
        </div>

        <div class="feature-card" style="border: 1px dashed #ccc;">
            <strong>📱 Mobile Notifications (Optional)</strong><br>
            <strong>What it could include:</strong> Push notifications for urgent guest issues<br>
            <strong>Implementation:</strong> Completely optional - some managers prefer email-only<br>
            <strong>Benefit:</strong> Faster response times, but only if it suits your workflow
        </div>

        <p><em>All optional features can be discussed and implemented only if they add value to your specific operation.</em></p>

        <h3>💡 Why This Matters</h3>

        <p>Most hotels rely on reactive approaches - waiting for problems to appear in reviews. This system gives you <strong>predictive insights</strong> to prevent issues and <strong>optimization tools</strong> to maximize your rating improvement.</p>

        <p><strong>Industry Facts:</strong></p>
        <ul>
            <li>Hotels with 4.5+ star ratings appear higher in Google search results</li>
            <li>Booking platforms (Booking.com, Expedia) prioritize higher-rated properties</li>
            <li>Guests are 3x more likely to book hotels with 4.5+ stars vs 4.0 stars</li>
            <li>Higher ratings reduce dependency on discounting to attract bookings</li>
        </ul>

        <p>With 278 five-star external reviews needed over 6 months, every optimization matters. This system ensures you do not miss opportunities and can course-correct quickly when needed.</p>

        <p>I am confident this will provide the competitive edge Eusbett Hotel needs to achieve and maintain a 4.5-star rating.</p>

        <p><strong>Looking forward to your feedback and questions!</strong></p>

        <p>Best regards,<br>
        <strong>Gizzy Basera</strong><br>
        GuestGlow Advanced Analytics<br>
        <a href="mailto:g.basera5@gmail.com">g.basera5@gmail.com</a></p>

        <div class="footer">
            <p>Production email will be sent to: gm@eusbetthotel.com, erbennet@gmail.com</p>
            <p>System monitoring: gizzy@guest-glow.com (BCC)</p>
            <p>GuestGlow Advanced Analytics • Intelligent Guest Experience Management</p>
        </div>
    </div>
</body>
</html>`,
  bcc_emails: ['gizzy@guest-glow.com']
};

// Function to send email via n8n webhook
async function sendEmailViaN8N(emailData) {
  console.log('📧 Sending email via n8n workflow...');
  
  try {
    const webhookUrl = `${N8N_CONFIG.baseUrl}/${N8N_CONFIG.webhookPath}`;
    
    const response = await fetch(webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(emailData)
    });
    
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
    
    const result = await response.json();
    
    console.log('✅ Email sent successfully via n8n!');
    console.log('📧 Response:', result);
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send email via n8n:', error);
    throw error;
  }
}

// Function to send the preview email
async function sendPreviewEmail() {
  console.log('🔍 Sending preview email to g.basera5@gmail.com...');
  
  try {
    const result = await sendEmailViaN8N(PREVIEW_EMAIL_DATA);
    
    console.log('✅ Preview email sent successfully!');
    console.log('📧 Check g.basera5@gmail.com for the preview');
    console.log('💡 Reply with approval to send to Robert and Edward');
    
    return result;
    
  } catch (error) {
    console.error('❌ Failed to send preview email:', error);
    
    // Fallback: Show manual instructions
    console.log('📋 Manual Email Instructions:');
    console.log('Since n8n webhook failed, you can:');
    console.log('1. Copy the HTML content above');
    console.log('2. Send manually via Gmail');
    console.log('3. Or set up a different email service');
    
    return null;
  }
}

// Function to send production email (after approval)
async function sendProductionEmail() {
  console.log('🚀 Sending production email to Robert and Edward...');
  
  const productionEmails = [
    {
      ...PREVIEW_EMAIL_DATA,
      recipient_email: 'gm@eusbetthotel.com',
      subject: 'GuestGlow Advanced Analytics - Your New Guest Experience Intelligence System',
      html_content: PREVIEW_EMAIL_DATA.html_content.replace(
        'PREVIEW EMAIL - FOR QUALITY CHECK ONLY',
        'PRODUCTION EMAIL - GUESTGLOW ADVANCED ANALYTICS'
      ).replace(
        'This will be sent to: gm@eusbetthotel.com, erbennet@gmail.com after your approval',
        'Welcome to your new Guest Experience Intelligence System'
      ).replace(
        'Please review content, tone, and formatting before sending to Robert and Edward',
        'Ready to help you achieve your 4.5-star rating goal'
      )
    },
    {
      ...PREVIEW_EMAIL_DATA,
      recipient_email: 'erbennet@gmail.com',
      subject: 'GuestGlow Advanced Analytics - Your New Guest Experience Intelligence System',
      html_content: PREVIEW_EMAIL_DATA.html_content.replace(
        'PREVIEW EMAIL - FOR QUALITY CHECK ONLY',
        'PRODUCTION EMAIL - GUESTGLOW ADVANCED ANALYTICS'
      ).replace(
        'This will be sent to: gm@eusbetthotel.com, erbennet@gmail.com after your approval',
        'Welcome to your new Guest Experience Intelligence System'
      ).replace(
        'Please review content, tone, and formatting before sending to Robert and Edward',
        'Ready to help you achieve your 4.5-star rating goal'
      )
    }
  ];
  
  try {
    const results = [];
    
    for (const emailData of productionEmails) {
      const result = await sendEmailViaN8N(emailData);
      results.push({ recipient: emailData.recipient_email, success: true, result });
      
      // Wait 1 second between emails to avoid rate limiting
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
    
    console.log('🎉 All production emails sent successfully!');
    console.log('📧 Recipients: gm@eusbetthotel.com, erbennet@gmail.com');
    console.log('📊 BCC: gizzy@guest-glow.com (monitoring)');
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to send production emails:', error);
    return null;
  }
}

// Make functions available globally
window.n8nEmailSender = {
  sendPreview: sendPreviewEmail,
  sendProduction: sendProductionEmail,
  sendCustom: sendEmailViaN8N,
  config: N8N_CONFIG
};

console.log('📧 N8N Email Sender Loaded!');
console.log('🔍 Run n8nEmailSender.sendPreview() to send preview email');
console.log('🚀 Run n8nEmailSender.sendProduction() to send to Robert and Edward');
console.log('⚙️ Workflow ID:', N8N_CONFIG.workflowId);

// Note: You'll need to update the N8N_CONFIG.baseUrl with your actual n8n instance URL
console.log('⚠️ Remember to update N8N_CONFIG.baseUrl with your n8n instance URL');
