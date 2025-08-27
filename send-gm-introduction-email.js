/**
 * 📧 GM INTRODUCTION EMAIL SENDER
 * 
 * Sends the GuestGlow Advanced Analytics introduction email
 * First to g.basera5@gmail.com for review, then to GM and Edward
 */

// Email configuration
const EMAIL_CONFIG = {
  preview: {
    to: 'g.basera5@gmail.com',
    subject: '[PREVIEW] GuestGlow Advanced Analytics - System Introduction for Eusbett Hotel',
    note: 'This is a preview for your review before sending to Robert and Edward'
  },
  production: {
    to: ['gm@eusbetthotel.com', 'erbennet@gmail.com'],
    subject: 'GuestGlow Advanced Analytics - Your New Guest Experience Intelligence System',
    bcc: ['gizzy@guest-glow.com']
  }
};

// Function to send preview email
async function sendPreviewEmail() {
  console.log('📧 Sending preview email to g.basera5@gmail.com...');
  
  try {
    // Read the HTML email template
    const emailHTML = await fetch('./GM-Introduction-Email.html').then(r => r.text());
    
    // Add preview banner to the email
    const previewBanner = `
      <div style="background: #fbbf24; color: white; padding: 15px; text-align: center; font-weight: bold; margin-bottom: 20px; border-radius: 8px;">
        🔍 PREVIEW EMAIL - FOR REVIEW ONLY
        <br><small>This will be sent to: gm@eusbetthotel.com, erbennet@gmail.com</small>
      </div>
    `;
    
    const previewHTML = emailHTML.replace(
      '<div class="email-container">',
      `<div class="email-container">${previewBanner}`
    );
    
    // Send via Supabase function
    const { data, error } = await supabase.functions.invoke('send-tenant-emails', {
      body: {
        email_type: 'gm_introduction_preview',
        recipient_email: EMAIL_CONFIG.preview.to,
        bcc_emails: ['gizzy@guest-glow.com'],
        subject: EMAIL_CONFIG.preview.subject,
        html_content: previewHTML,
        tenant_id: 'eusbett-tenant-id',
        tenant_slug: 'eusbett',
        priority: 'normal',
        custom_note: EMAIL_CONFIG.preview.note
      }
    });
    
    if (error) throw error;
    
    console.log('✅ Preview email sent successfully!');
    console.log('📧 Check g.basera5@gmail.com for the preview');
    console.log('💡 Reply with approval to send to Robert and Edward');
    
    return data;
    
  } catch (error) {
    console.error('❌ Failed to send preview email:', error);
    throw error;
  }
}

// Function to send production email (after approval)
async function sendProductionEmail() {
  console.log('📧 Sending production email to GM and Edward...');
  
  try {
    // Read the HTML email template
    const emailHTML = await fetch('./GM-Introduction-Email.html').then(r => r.text());
    
    // Send to both recipients
    const results = [];
    
    for (const recipient of EMAIL_CONFIG.production.to) {
      const { data, error } = await supabase.functions.invoke('send-tenant-emails', {
        body: {
          email_type: 'gm_introduction_production',
          recipient_email: recipient,
          bcc_emails: EMAIL_CONFIG.production.bcc,
          subject: EMAIL_CONFIG.production.subject,
          html_content: emailHTML,
          tenant_id: 'eusbett-tenant-id',
          tenant_slug: 'eusbett',
          priority: 'high'
        }
      });
      
      if (error) {
        console.error(`❌ Failed to send to ${recipient}:`, error);
        results.push({ recipient, success: false, error });
      } else {
        console.log(`✅ Email sent successfully to ${recipient}`);
        results.push({ recipient, success: true, data });
      }
    }
    
    // Log summary
    const successful = results.filter(r => r.success).length;
    const failed = results.filter(r => !r.success).length;
    
    console.log(`📊 Email Summary: ${successful} successful, ${failed} failed`);
    
    if (successful > 0) {
      console.log('🎉 GuestGlow Advanced Analytics introduction sent!');
      console.log('📧 Recipients will receive:');
      console.log('  - Daily 5-star progress reports');
      console.log('  - Weekly recurring issues analysis');
      console.log('  - Urgent rating drop alerts');
      console.log('  - Comprehensive analytics dashboard access');
    }
    
    return results;
    
  } catch (error) {
    console.error('❌ Failed to send production email:', error);
    throw error;
  }
}

// Function to track email engagement
async function trackEmailEngagement(emailType, recipient, action) {
  try {
    await supabase
      .from('communication_logs')
      .insert({
        tenant_id: 'eusbett-tenant-id',
        email_type: emailType,
        recipient_email: recipient,
        status: 'sent',
        engagement_data: {
          action: action,
          timestamp: new Date().toISOString(),
          email_category: 'gm_introduction'
        }
      });
    
    console.log(`📊 Tracked ${action} for ${recipient}`);
    
  } catch (error) {
    console.error('Failed to track email engagement:', error);
  }
}

// Enhanced email with diplomatic and factual improvements
function enhanceEmailWithInnovations() {
  return {
    industryFacts: {
      title: "🎯 Industry-Backed Benefits",
      content: `
        Documented benefits of higher ratings:
        • Google prioritizes 4.5+ star hotels in search results
        • Booking platforms show higher-rated properties first
        • Guests are 3x more likely to book 4.5+ vs 4.0 star hotels
        • Higher ratings reduce need for discounting strategies
      `
    },

    competitiveAnalysis: {
      title: "📊 Market Positioning Insights",
      content: `
        Understanding your competitive landscape:
        • Track your rating progress vs local competitors
        • Identify what guests praise about competitors
        • Spot opportunities where you can excel
        • Monitor market trends and seasonal patterns
      `
    },

    smartAlerts: {
      title: "🤖 Predictive Analytics",
      content: `
        The system can identify patterns to:
        • Predict which feedback categories need attention
        • Identify optimal timing for review requests
        • Spot potential issues before they impact ratings
        • Understand seasonal satisfaction trends
      `
    },

    optionalFeatures: {
      title: "🏆 Optional Enhancement Ideas",
      content: `
        Features you could choose to implement:
        • Staff mention tracking (if you want team recognition)
        • Mobile notifications (if you prefer instant alerts)
        • Department performance summaries (for management insights)
        • Guest recovery automation (for proactive service)

        Note: All optional features respect your management style
      `
    }
  };
}

// Make functions available globally
window.gmIntroEmail = {
  sendPreview: sendPreviewEmail,
  sendProduction: sendProductionEmail,
  trackEngagement: trackEmailEngagement,
  enhance: enhanceEmailWithInnovations
};

console.log('📧 GM Introduction Email System Loaded!');
console.log('🔍 Run gmIntroEmail.sendPreview() to send preview to g.basera5@gmail.com');
console.log('🚀 Run gmIntroEmail.sendProduction() to send to Robert and Edward (after approval)');
console.log('💡 Run gmIntroEmail.enhance() to see additional innovative features');

// Auto-send preview (uncomment when ready)
// gmIntroEmail.sendPreview();
