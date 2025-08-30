// HTML Templates for GM Reports

// Generate Weekly Pulse HTML
export function generateWeeklyPulseHTML(tenantName: string, data: any) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Weekly Performance Pulse - ${tenantName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
        .section { padding: 20px; border-bottom: 1px solid #e2e8f0; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 18px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center; }
        .section-title .emoji { margin-right: 8px; }
        .department-item { display: flex; align-items: center; justify-content: space-between; padding: 12px; margin: 8px 0; background: #f8fafc; border-radius: 8px; }
        .department-info { display: flex; align-items: center; }
        .department-icon { font-size: 20px; margin-right: 12px; }
        .department-details { }
        .department-name { font-weight: 600; margin: 0; }
        .department-manager { font-size: 12px; color: #64748b; margin: 2px 0 0 0; }
        .department-score { text-align: right; }
        .score-value { font-size: 18px; font-weight: 700; }
        .score-trend { font-size: 16px; margin-left: 4px; }
        .attention-item { background: #fef3c7; border-left: 4px solid #f59e0b; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
        .attention-high { border-left-color: #ef4444; background: #fef2f2; }
        .win-item { background: #ecfdf5; border-left: 4px solid #10b981; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
        .progress-container { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 12px 0; }
        .progress-bar { font-family: monospace; font-size: 14px; background: #1e293b; color: white; padding: 8px 12px; border-radius: 4px; }
        @media (max-width: 600px) {
          .container { margin: 0; border-radius: 0; }
          .department-item { flex-direction: column; align-items: flex-start; }
          .department-score { margin-top: 8px; }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>📈 Weekly Performance Pulse</h1>
          <p>${tenantName} • Week ${data.weekNumber || 'Current'}</p>
        </div>

        <div class="section">
          <h2 class="section-title">
            <span class="emoji">🎯</span>
            Rating Goal Progress
          </h2>
          <div class="progress-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span><strong>Current:</strong> ${data.rating.current}⭐</span>
              <span><strong>Goal:</strong> ${data.rating.target}⭐</span>
            </div>
            <div class="progress-bar">${generateProgressBar(data.rating.progress, 100, 15)}</div>
            <div style="margin-top: 12px; font-size: 14px; color: #64748b;">
              <strong>${data.rating.reviewsNeeded} more 5⭐ reviews</strong> needed to reach goal
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">
            <span class="emoji">📊</span>
            Department Scorecard
          </h2>
          ${data.departments.map(dept => `
            <div class="department-item">
              <div class="department-info">
                <div class="department-icon">${dept.icon}</div>
                <div class="department-details">
                  <div class="department-name">${dept.name}</div>
                  <div class="department-manager">${dept.manager}</div>
                </div>
              </div>
              <div class="department-score">
                <span class="score-value">${dept.score}⭐</span>
                <span class="score-trend">${dept.trend}</span>
                <span style="margin-left: 8px;">${dept.status}</span>
              </div>
            </div>
          `).join('')}
        </div>

        ${data.attention.length > 0 ? `
        <div class="section">
          <h2 class="section-title">
            <span class="emoji">🔥</span>
            What Needs Your Attention
          </h2>
          ${data.attention.map(item => `
            <div class="attention-item attention-${item.priority}">
              <strong>${item.title}</strong><br>
              <span style="color: #64748b; font-size: 14px;">${item.description}</span><br>
              <span style="color: #374151; font-size: 14px; font-weight: 500;">Action: ${item.action}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        ${data.wins.length > 0 ? `
        <div class="section">
          <h2 class="section-title">
            <span class="emoji">💡</span>
            Wins to Celebrate
          </h2>
          ${data.wins.map(win => `
            <div class="win-item">
              <strong>${win.title}</strong><br>
              <span style="color: #64748b; font-size: 14px;">${win.description}</span><br>
              <span style="color: #065f46; font-size: 14px; font-weight: 500;">Impact: ${win.impact}</span>
            </div>
          `).join('')}
        </div>
        ` : ''}

        <div class="section" style="text-align: center; background: #f8fafc;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            📱 <strong>GuestGlow GM Dashboard</strong><br>
            Strategic insights for your success! 📈
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Generate Critical Alert HTML
export function generateCriticalAlertHTML(tenantName: string, issues: any[]) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>URGENT ALERT - ${tenantName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #fef2f2; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #ef4444; }
        .header { background: linear-gradient(135deg, #ef4444 0%, #dc2626 100%); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
        .section { padding: 20px; border-bottom: 1px solid #e2e8f0; }
        .section:last-child { border-bottom: none; }
        .critical-issue { background: #fef2f2; border: 1px solid #fecaca; border-radius: 8px; padding: 16px; margin: 12px 0; }
        .issue-title { font-weight: 600; color: #dc2626; margin: 0 0 8px 0; }
        .issue-description { color: #374151; margin: 8px 0; }
        .action-required { background: #fffbeb; border: 1px solid #fed7aa; border-radius: 6px; padding: 12px; margin: 8px 0; }
        .contact-info { background: #f0f9ff; border-radius: 6px; padding: 12px; margin: 12px 0; }
        .phone-link { color: #0ea5e9; text-decoration: none; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🚨 URGENT ALERT</h1>
          <p>${tenantName} • Immediate Action Required</p>
        </div>

        ${issues.map(issue => `
          <div class="section">
            <div class="critical-issue">
              <h3 class="issue-title">⚠️ ${issue.title}</h3>
              <div class="issue-description">${issue.description}</div>
              
              <div class="action-required">
                <strong>⏰ Immediate Actions Needed:</strong>
                <ul style="margin: 8px 0;">
                  ${issue.actions.map(action => `<li>${action}</li>`).join('')}
                </ul>
              </div>

              ${issue.contacts ? `
                <div class="contact-info">
                  <strong>📱 Key Contacts:</strong><br>
                  ${issue.contacts.map(contact => `
                    ${contact.name}: <a href="tel:${contact.phone}" class="phone-link">${contact.phone}</a><br>
                  `).join('')}
                </div>
              ` : ''}
            </div>
          </div>
        `).join('')}

        <div class="section" style="text-align: center; background: #fef2f2;">
          <p style="margin: 0; color: #dc2626; font-size: 14px; font-weight: 600;">
            🚨 This alert requires immediate GM attention<br>
            <span style="font-weight: normal;">GuestGlow Critical Alert System</span>
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Generate All Clear HTML
export function generateAllClearHTML(tenantName: string) {
  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>All Clear - ${tenantName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f0fdf4; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); border: 2px solid #10b981; }
        .header { background: linear-gradient(135deg, #10b981 0%, #059669 100%); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
        .section { padding: 20px; text-align: center; }
        .all-clear-message { font-size: 18px; color: #065f46; margin: 20px 0; }
        .status-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(150px, 1fr)); gap: 16px; margin: 20px 0; }
        .status-item { background: #ecfdf5; border-radius: 8px; padding: 16px; text-align: center; }
        .status-icon { font-size: 24px; margin-bottom: 8px; }
        .status-label { font-size: 14px; color: #065f46; font-weight: 600; }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>✅ All Clear</h1>
          <p>${tenantName} • ${new Date().toLocaleDateString('en-GB')}</p>
        </div>

        <div class="section">
          <div class="all-clear-message">
            <strong>Good news! No critical issues detected.</strong><br>
            All systems running smoothly.
          </div>

          <div class="status-grid">
            <div class="status-item">
              <div class="status-icon">🛏️</div>
              <div class="status-label">Housekeeping<br>Normal</div>
            </div>
            <div class="status-item">
              <div class="status-icon">🛎️</div>
              <div class="status-label">Front Desk<br>Normal</div>
            </div>
            <div class="status-item">
              <div class="status-icon">🍽️</div>
              <div class="status-label">F&B<br>Normal</div>
            </div>
            <div class="status-item">
              <div class="status-icon">🔧</div>
              <div class="status-label">Maintenance<br>Normal</div>
            </div>
          </div>

          <p style="color: #64748b; font-size: 14px; margin-top: 20px;">
            Continue monitoring through your regular Morning Briefing and Weekly Pulse reports.
          </p>
        </div>

        <div class="section" style="background: #f0fdf4;">
          <p style="margin: 0; color: #065f46; font-size: 14px;">
            ✅ <strong>GuestGlow Alert System</strong><br>
            Keeping you informed when it matters most
          </p>
        </div>
      </div>
    </body>
    </html>
  `
}

// Helper function for progress bar (duplicated here for template use)
function generateProgressBar(current: number, target: number, width: number = 20): string {
  const percentage = Math.min((current / target) * 100, 100)
  const filled = Math.round((percentage / 100) * width)
  const empty = width - filled
  
  const bar = '█'.repeat(filled) + '░'.repeat(empty)
  return `${bar} ${percentage.toFixed(1)}%`
}
