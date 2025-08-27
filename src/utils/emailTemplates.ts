/**
 * 📧 Email Templates System
 * 
 * Centralized email template management for all GuestGlow communications
 */

export interface EmailTemplateData {
  // Common fields
  tenant_name?: string
  tenant_slug?: string
  guest_name?: string
  guest_email?: string
  
  // Feedback specific
  feedback_id?: string
  room_number?: string
  rating?: number
  feedback_text?: string
  issue_category?: string
  manager_name?: string
  manager_department?: string
  
  // Report specific
  report_date?: string
  total_feedback?: number
  average_rating?: number
  five_star_count?: number
  improvement_areas?: string[]
  
  // System specific
  action_required?: string
  urgency_level?: 'low' | 'normal' | 'high' | 'urgent'
  custom_message?: string
}

export interface EmailTemplate {
  subject: string
  html: string
  text?: string
}

/**
 * Generate email template based on type and data
 */
export function generateEmailTemplate(
  templateType: string, 
  data: EmailTemplateData
): EmailTemplate {
  const templates = {
    // Manager notifications
    manager_alert: generateManagerAlertTemplate,
    escalation_alert: generateEscalationTemplate,
    
    // Guest communications
    guest_confirmation: generateGuestConfirmationTemplate,
    satisfaction_followup: generateSatisfactionFollowupTemplate,
    feedback_link: generateFeedbackLinkTemplate,
    
    // Reports and analytics
    gm_introduction: generateGMIntroductionTemplate,
    daily_report: generateDailyReportTemplate,
    weekly_report: generateWeeklyReportTemplate,
    
    // System notifications
    system_notification: generateSystemNotificationTemplate,
    tenant_welcome: generateTenantWelcomeTemplate
  }

  const templateGenerator = templates[templateType]
  if (!templateGenerator) {
    throw new Error(`Unknown email template type: ${templateType}`)
  }

  return templateGenerator(data)
}

/**
 * Manager Alert Template
 */
function generateManagerAlertTemplate(data: EmailTemplateData): EmailTemplate {
  const urgencyColor = data.rating <= 2 ? '#dc2626' : data.rating <= 3 ? '#f59e0b' : '#059669'
  const urgencyText = data.rating <= 2 ? 'URGENT' : data.rating <= 3 ? 'ATTENTION NEEDED' : 'FEEDBACK RECEIVED'

  return {
    subject: `🔔 ${urgencyText}: ${data.rating}⭐ Feedback - ${data.issue_category} - Room ${data.room_number || 'N/A'}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">${urgencyText}</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">New ${data.rating}⭐ Guest Feedback</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${data.manager_name || 'Manager'},</h2>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">Feedback Details</h3>
            <p><strong>Guest:</strong> ${data.guest_name}</p>
            <p><strong>Room:</strong> ${data.room_number || 'Not provided'}</p>
            <p><strong>Rating:</strong> ${data.rating}/5 ⭐</p>
            <p><strong>Category:</strong> ${data.issue_category}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">Guest Comments</h3>
            <p style="font-style: italic; background: #f1f5f9; padding: 10px; border-radius: 4px;">
              "${data.feedback_text}"
            </p>
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #0277bd; margin-top: 0;">Action Required</h3>
            <p>${data.action_required || `Please review this feedback and take appropriate action. ${data.rating <= 2 ? 'This is a low rating that requires immediate attention.' : 'Please follow up with the guest if needed.'}`}</p>
          </div>
          
          ${getEmailFooter('GuestGlow Feedback System', data.feedback_id)}
        </div>
      </div>
    `
  }
}

/**
 * Guest Confirmation Template
 */
function generateGuestConfirmationTemplate(data: EmailTemplateData): EmailTemplate {
  const hotelName = (data.tenant_name || data.tenant_slug?.charAt(0).toUpperCase() + data.tenant_slug?.slice(1)) + ' Hotel'
  
  return {
    subject: `Thank you for your feedback - ${hotelName}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Thank You for Your Feedback</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">${hotelName}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${data.guest_name},</h2>
          
          <p>Thank you for taking the time to share your feedback with us. We have received your ${data.rating}-star review and truly appreciate your input.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">Your Feedback Summary</h3>
            <p><strong>Rating:</strong> ${data.rating}/5 ⭐</p>
            <p><strong>Category:</strong> ${data.issue_category}</p>
            <p><strong>Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <p>Your feedback has been forwarded to our ${data.issue_category} team, and we will review it carefully to improve our services.</p>
          
          ${data.rating <= 3 ? `
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #f59e0b;">
            <p style="margin: 0;"><strong>We want to make this right.</strong> A member of our team will be in touch with you soon to address your concerns and ensure your satisfaction.</p>
          </div>
          ` : ''}
          
          ${getEmailFooter(`The ${hotelName} Guest Relations Team`)}
        </div>
      </div>
    `
  }
}

/**
 * GM Introduction Template
 */
function generateGMIntroductionTemplate(data: EmailTemplateData): EmailTemplate {
  const isPreview = data.custom_message?.includes('PREVIEW')
  
  return {
    subject: isPreview 
      ? `🧪 [PREVIEW TEST] GuestGlow Advanced Analytics - System Introduction`
      : `🎉 GuestGlow Advanced Analytics - Your New Guest Experience Intelligence System`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🎉 GuestGlow Advanced Analytics</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Your New Guest Experience Intelligence System</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Dear Robert & Edward,</h2>
          
          ${isPreview ? '<p>🚀 <strong>PREVIEW EMAIL - SYSTEM TEST</strong></p>' : ''}
          
          <p>We're excited to introduce you to GuestGlow Advanced Analytics - your comprehensive guest experience management system that's now live and ready to help you achieve your 4.5-star rating goal!</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">🎯 System Capabilities</h3>
            <ul>
              <li>✅ Automated feedback collection and routing</li>
              <li>✅ Real-time manager notifications</li>
              <li>✅ Guest satisfaction tracking</li>
              <li>✅ Performance analytics and reporting</li>
              <li>✅ SLA monitoring and escalation</li>
            </ul>
          </div>
          
          <div style="background: #e0f2fe; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #0277bd; margin-top: 0;">📊 What You'll Receive</h3>
            <p>Starting immediately, you'll receive automated reports including:</p>
            <ul>
              <li>Daily feedback summaries</li>
              <li>Weekly performance analytics</li>
              <li>Monthly trend analysis</li>
              <li>Real-time alerts for urgent issues</li>
            </ul>
          </div>
          
          ${isPreview ? `
          <div style="text-align: center; margin: 30px 0;">
            <p style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
              <strong>🧪 This is a test email to verify the system is working correctly.</strong><br>
              If you receive this, the email system is ready for production!
            </p>
          </div>
          ` : ''}
          
          ${getEmailFooter('The GuestGlow Team', `System ${isPreview ? 'Test' : 'Launch'} - ${new Date().toLocaleString()}`)}
        </div>
      </div>
    `
  }
}

/**
 * Daily Report Template
 */
function generateDailyReportTemplate(data: EmailTemplateData): EmailTemplate {
  return {
    subject: `📊 Daily Guest Experience Report - ${data.report_date}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">📊 Daily Report</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">${data.report_date}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Daily Performance Summary</h2>
          
          <div style="display: flex; gap: 15px; margin: 20px 0;">
            <div style="background: white; padding: 15px; border-radius: 6px; flex: 1; text-align: center;">
              <h3 style="color: #2563eb; margin: 0; font-size: 24px;">${data.total_feedback || 0}</h3>
              <p style="margin: 5px 0 0 0; color: #666;">Total Feedback</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; flex: 1; text-align: center;">
              <h3 style="color: #059669; margin: 0; font-size: 24px;">${data.average_rating || 0}</h3>
              <p style="margin: 5px 0 0 0; color: #666;">Average Rating</p>
            </div>
            <div style="background: white; padding: 15px; border-radius: 6px; flex: 1; text-align: center;">
              <h3 style="color: #f59e0b; margin: 0; font-size: 24px;">${data.five_star_count || 0}</h3>
              <p style="margin: 5px 0 0 0; color: #666;">5-Star Reviews</p>
            </div>
          </div>
          
          ${data.improvement_areas && data.improvement_areas.length > 0 ? `
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">🎯 Areas for Improvement</h3>
            <ul>
              ${data.improvement_areas.map(area => `<li>${area}</li>`).join('')}
            </ul>
          </div>
          ` : ''}
          
          ${getEmailFooter('GuestGlow Analytics')}
        </div>
      </div>
    `
  }
}

/**
 * System Notification Template
 */
function generateSystemNotificationTemplate(data: EmailTemplateData): EmailTemplate {
  const urgencyColors = {
    low: '#059669',
    normal: '#2563eb', 
    high: '#f59e0b',
    urgent: '#dc2626'
  }
  
  const urgencyColor = urgencyColors[data.urgency_level || 'normal']
  
  return {
    subject: `🔔 System Notification - ${data.urgency_level?.toUpperCase() || 'INFO'}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: ${urgencyColor}; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🔔 System Notification</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">${data.urgency_level?.toUpperCase() || 'INFORMATION'}</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <p>${data.custom_message || 'System notification message'}</p>
          </div>
          
          ${getEmailFooter('GuestGlow System')}
        </div>
      </div>
    `
  }
}

/**
 * Satisfaction Followup Template
 */
function generateSatisfactionFollowupTemplate(data: EmailTemplateData): EmailTemplate {
  return {
    subject: `How did we do? - Follow-up on your recent feedback`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">How did we do?</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Follow-up Survey</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${data.guest_name},</h2>
          
          <p>We hope we were able to address your recent feedback satisfactorily. Your satisfaction is our top priority, and we'd love to hear how we did.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <p style="margin-bottom: 20px;">Please rate your satisfaction with our response:</p>
            <div style="display: flex; justify-content: center; gap: 10px;">
              <span style="font-size: 24px; cursor: pointer;">😞</span>
              <span style="font-size: 24px; cursor: pointer;">😐</span>
              <span style="font-size: 24px; cursor: pointer;">😊</span>
              <span style="font-size: 24px; cursor: pointer;">😍</span>
            </div>
          </div>
          
          ${getEmailFooter(`The ${(data.tenant_name || data.tenant_slug)} Hotel Guest Relations Team`)}
        </div>
      </div>
    `
  }
}

/**
 * Feedback Link Template
 */
function generateFeedbackLinkTemplate(data: EmailTemplateData): EmailTemplate {
  return {
    subject: `Share Your Experience - Quick Feedback Link`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: #2563eb; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">Share Your Experience</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">We'd love to hear from you!</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Dear Guest,</h2>
          
          <p>Thank you for staying with us! We hope you had a wonderful experience.</p>
          
          <p>We would greatly appreciate if you could take a moment to share your feedback about your stay${data.room_number ? ` in Room ${data.room_number}` : ''}.</p>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${data.custom_message || '#'}" 
               style="background: #2563eb; color: white; padding: 15px 30px; text-decoration: none; border-radius: 6px; font-weight: bold; display: inline-block;">
              Share Your Feedback
            </a>
          </div>
          
          ${getEmailFooter('The Guest Relations Team')}
        </div>
      </div>
    `
  }
}

/**
 * Escalation Alert Template
 */
function generateEscalationTemplate(data: EmailTemplateData): EmailTemplate {
  return {
    subject: `🚨 ESCALATION: Unresolved Feedback - Room ${data.room_number} - ${data.issue_category}`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: #dc2626; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🚨 ESCALATION ALERT</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">Unresolved Guest Feedback</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Dear ${data.manager_name || 'Manager'},</h2>
          
          <div style="background: #fee2e2; padding: 15px; border-radius: 6px; margin: 15px 0; border-left: 4px solid #dc2626;">
            <p style="margin: 0;"><strong>This feedback requires immediate attention.</strong> It has been escalated due to lack of response or resolution.</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">Escalated Feedback Details</h3>
            <p><strong>Guest:</strong> ${data.guest_name}</p>
            <p><strong>Room:</strong> ${data.room_number}</p>
            <p><strong>Rating:</strong> ${data.rating}/5 ⭐</p>
            <p><strong>Category:</strong> ${data.issue_category}</p>
            <p><strong>Original Date:</strong> ${new Date().toLocaleDateString()}</p>
          </div>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">Guest Comments</h3>
            <p style="font-style: italic; background: #f1f5f9; padding: 10px; border-radius: 4px;">
              "${data.feedback_text}"
            </p>
          </div>
          
          ${getEmailFooter('GuestGlow Escalation System', data.feedback_id)}
        </div>
      </div>
    `
  }
}

/**
 * Tenant Welcome Template
 */
function generateTenantWelcomeTemplate(data: EmailTemplateData): EmailTemplate {
  return {
    subject: `Welcome to GuestGlow - ${data.tenant_name} Setup Complete!`,
    html: `
      <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
        <div style="background: #059669; color: white; padding: 20px; text-align: center; border-radius: 8px 8px 0 0;">
          <h1 style="margin: 0; font-size: 24px;">🎉 Welcome to GuestGlow!</h1>
          <p style="margin: 10px 0 0 0; font-size: 16px;">${data.tenant_name} Setup Complete</p>
        </div>
        
        <div style="background: #f8f9fa; padding: 20px; border-radius: 0 0 8px 8px;">
          <h2 style="color: #333; margin-top: 0;">Congratulations!</h2>
          
          <p>Your GuestGlow system has been successfully set up and is ready to help you deliver exceptional guest experiences.</p>
          
          <div style="background: white; padding: 15px; border-radius: 6px; margin: 15px 0;">
            <h3 style="color: #333; margin-top: 0;">🚀 What's Next?</h3>
            <ul>
              <li>Start collecting guest feedback immediately</li>
              <li>Monitor your dashboard for real-time insights</li>
              <li>Receive automated reports and alerts</li>
              <li>Track your progress toward your rating goals</li>
            </ul>
          </div>
          
          ${getEmailFooter('The GuestGlow Team')}
        </div>
      </div>
    `
  }
}

/**
 * Common email footer
 */
function getEmailFooter(senderName: string, additionalInfo?: string): string {
  return `
    <div style="text-align: center; margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee;">
      <p style="color: #666; font-size: 14px;">
        Best regards,<br>
        <strong>${senderName}</strong>
      </p>
      ${additionalInfo ? `<p style="color: #999; font-size: 12px;">${additionalInfo}</p>` : ''}
    </div>
  `
}
