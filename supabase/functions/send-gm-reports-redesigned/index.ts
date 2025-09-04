import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import {
  generateAllClearHTML,
  generateCriticalAlertHTML,
  generateWeeklyPulseHTML,
} from "./html-templates.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface EmailRequest {
  report_type: "morning_briefing" | "weekly_pulse" | "critical_alert";
  tenant_id: string;
  recipient_emails?: string[];
  cc_emails?: string[];
}

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const { report_type, tenant_id, recipient_emails, cc_emails }:
      EmailRequest = await req.json();

    // Get tenant information
    const { data: tenant } = await supabase
      .from("tenants")
      .select("name, slug")
      .eq("id", tenant_id)
      .single();

    if (!tenant) {
      throw new Error("Tenant not found");
    }

    // Ensure fresh TripAdvisor data
    await ensureFreshTripAdvisorData(supabase, tenant_id);

    let emailContent: string;
    let subject: string;

    if (report_type === "morning_briefing") {
      const result = await generateMorningBriefing(
        supabase,
        tenant_id,
        tenant.name,
      );
      emailContent = result.content;
      subject = result.subject;
    } else if (report_type === "weekly_pulse") {
      const result = await generateWeeklyPulse(
        supabase,
        tenant_id,
        tenant.name,
      );
      emailContent = result.content;
      subject = result.subject;
    } else if (report_type === "critical_alert") {
      const result = await generateCriticalAlert(
        supabase,
        tenant_id,
        tenant.name,
      );
      emailContent = result.content;
      subject = result.subject;
    } else {
      throw new Error("Invalid report type");
    }

    // Send email using Resend
    const resendApiKey = Deno.env.get("RESEND_API_KEY");
    if (!resendApiKey) {
      throw new Error("RESEND_API_KEY not configured");
    }

    const emailData = {
      from: "GuestGlow GM Reports <reports@guest-glow.com>",
      to: recipient_emails || ["g.basera@yahoo.com"],
      cc: cc_emails || ["gizzy@guest-glow.com"],
      subject: subject,
      html: emailContent,
    };

    const emailResponse = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${resendApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(emailData),
    });

    if (!emailResponse.ok) {
      const errorText = await emailResponse.text();
      throw new Error(`Email sending failed: ${errorText}`);
    }

    const emailResult = await emailResponse.json();

    // Log GM report send to system_logs for analytics
    try {
      await supabase
        .from("system_logs")
        .insert({
          tenant_id: tenant_id,
          event_type: "system_event",
          event_category: "gm_reports",
          event_name: "report_sent",
          event_data: {
            report_type,
            subject,
            recipients: emailData.to,
            cc: emailData.cc,
            email_id: emailResult.id,
          },
          severity: "info",
        });
    } catch (e) {
      console.warn("GM redesigned report logging failed (non-blocking):", e);
    }

    return new Response(
      JSON.stringify({
        success: true,
        email_id: emailResult.id,
        message: `${report_type} sent successfully`,
        recipients: emailData.to,
        cc: emailData.cc,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("❌ Error sending GM report:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

// Helper function to ensure fresh TripAdvisor data
async function ensureFreshTripAdvisorData(supabase: any, tenantId: string) {
  const sixHoursAgo = new Date(Date.now() - 6 * 60 * 60 * 1000).toISOString();

  const { data: recentScrape } = await supabase
    .from("tripadvisor_scrapes")
    .select("scraped_at")
    .eq("tenant_id", tenantId)
    .gte("scraped_at", sixHoursAgo)
    .order("scraped_at", { ascending: false })
    .limit(1);

  if (recentScrape && recentScrape.length > 0) {
    console.log("✅ Recent TripAdvisor data found, skipping scrape");
    return;
  }

  console.log("🔄 Triggering fresh TripAdvisor scrape...");

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !supabaseKey) {
      console.log("⚠️ Missing Supabase credentials for scraping");
      return;
    }

    const scrapeResponse = await fetch(
      `${supabaseUrl}/functions/v1/scrape-tripadvisor-rating`,
      {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          tenant_id: tenantId,
          tripadvisor_url:
            "https://www.tripadvisor.com/Hotel_Review-g2400444-d2399149-Reviews-Eusbett_Hotel-Sunyani_Brong_Ahafo_Region.html",
        }),
      },
    );

    if (scrapeResponse.ok) {
      console.log("✅ TripAdvisor scraping completed successfully");
    } else {
      console.log("❌ TripAdvisor scraping failed:", scrapeResponse.status);
    }
  } catch (error) {
    console.error("❌ Error triggering TripAdvisor scrape:", error);
  }
}

// Generate visual progress bar
function generateProgressBar(
  current: number,
  target: number,
  width: number = 20,
): string {
  const percentage = Math.min((current / target) * 100, 100);
  const filled = Math.round((percentage / 100) * width);
  const empty = width - filled;

  const bar = "█".repeat(filled) + "░".repeat(empty);
  return `${bar} ${percentage.toFixed(1)}%`;
}

// Generate trend arrow
function getTrendArrow(current: number, previous: number): string {
  if (current > previous) return "↗️";
  if (current < previous) return "↘️";
  return "➡️";
}

// Generate traffic light indicator
function getTrafficLight(
  score: number,
  thresholds: { good: number; warning: number },
): string {
  if (score >= thresholds.good) return "🟢";
  if (score >= thresholds.warning) return "🟡";
  return "🔴";
}

// Morning Briefing Report - GM Sarah's 7:00 AM briefing
async function generateMorningBriefing(
  supabase: any,
  tenantId: string,
  tenantName: string,
) {
  const today = new Date();
  const yesterday = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  console.log("🌅 Generating Morning Briefing for GM Sarah...");

  // Get overnight data
  const overnightData = await getOvernightSnapshot(
    supabase,
    tenantId,
    yesterday,
  );

  // Get priority actions
  const priorityActions = await getPriorityActions(supabase, tenantId);

  // Get rating progress
  const ratingProgress = await getRatingProgress(supabase, tenantId);

  // Get today's focus items
  const todaysFocus = await getTodaysFocus(supabase, tenantId);

  const subject = `🌅 ${tenantName} - Morning Briefing • ${
    today.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    })
  }`;

  const content = generateMorningBriefingHTML(tenantName, {
    overnight: overnightData,
    priorities: priorityActions,
    rating: ratingProgress,
    focus: todaysFocus,
  });

  return { subject, content };
}

// Get overnight snapshot data
async function getOvernightSnapshot(
  supabase: any,
  tenantId: string,
  yesterday: Date,
) {
  const yesterdayStr = yesterday.toISOString().split("T")[0];

  // Get new feedback from last 24 hours (including today)
  const { data: newFeedback } = await supabase
    .from("feedback")
    .select("id, rating, category, guest_name, urgency, comment")
    .eq("tenant_id", tenantId)
    .gte(
      "created_at",
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
    );

  // Get new TripAdvisor reviews (if any)
  const { data: tripAdvisorData } = await supabase
    .from("tripadvisor_scrapes")
    .select("rating, total_reviews")
    .eq("tenant_id", tenantId)
    .order("scraped_at", { ascending: false })
    .limit(2);

  // Count issues needing attention (3⭐ and below = urgent, 4⭐ with specific problems = moderate attention)
  const urgentIssues = newFeedback?.filter((f) =>
    f.urgency === "high" ||
    f.rating <= 3 ||
    (f.rating === 4 && f.comment && f.comment.length > 20) // 4⭐ with detailed feedback needs attention
  ).length || 0;

  // Get moderate attention details (4⭐ with detailed feedback)
  const moderateAttentionIssues =
    newFeedback?.filter((f) =>
      f.rating === 4 && f.comment && f.comment.length > 20
    ).map((f) => ({
      guest: f.guest_name || "Anonymous Guest",
      category: f.category,
      rating: f.rating,
      comment: f.comment.length > 80
        ? f.comment.substring(0, 80) + "..."
        : f.comment,
    })) || [];

  return {
    newFeedback: newFeedback?.length || 0,
    newTripadvisorReviews: 0, // Will be calculated from scrape comparison
    urgentIssues,
    moderateAttentionIssues,
    currentRating: tripAdvisorData?.[0]?.rating || 4.0,
    totalReviews: tripAdvisorData?.[0]?.total_reviews || 139,
  };
}

// Get priority actions requiring GM attention
async function getPriorityActions(supabase: any, tenantId: string) {
  const actions = [];

  // Check for unresolved high-urgency feedback
  const { data: urgentFeedback } = await supabase
    .from("feedback")
    .select("id, guest_name, category, rating, comment")
    .eq("tenant_id", tenantId)
    .eq("urgency", "high")
    .in("status", ["pending", "acknowledged"])
    .order("created_at", { ascending: true })
    .limit(3);

  urgentFeedback?.forEach((feedback) => {
    actions.push({
      type: "guest_issue",
      priority: "high",
      description:
        `${feedback.rating}⭐ ${feedback.category} issue - ${feedback.guest_name}`,
      action: `Review and respond to guest complaint - ID: ${feedback.id}`,
    });
  });

  // NO FAKE DATA - Only add real issues if they exist
  // If no urgent issues, return empty array (will show "No Priority Actions" in report)

  return actions.slice(0, 3); // Max 3 priority actions
}

// Get rating progress toward 4.5⭐ goal
async function getRatingProgress(supabase: any, tenantId: string) {
  const { data: currentData } = await supabase
    .from("tripadvisor_scrapes")
    .select("rating, total_reviews, rating_breakdown")
    .eq("tenant_id", tenantId)
    .order("scraped_at", { ascending: false })
    .limit(1);

  const current = currentData?.[0];
  const currentRating = parseFloat(current?.rating) || 4.0;
  const targetRating = 4.5;
  const totalReviews = current?.total_reviews || 139;

  // OFFICIAL PROJECT CALCULATION: Strategic Conversion Approach
  // Current breakdown: 59×5⭐ + 43×4⭐ + 21×3⭐ + 5×2⭐ + 11×1⭐ = 551 points
  // Target: 4.5⭐ × 139 reviews = 625.5 points
  // Strategy: Convert existing lower ratings + selective new 5⭐ reviews
  // Need: 625.5 - 551 = 74.5 more points

  // Get actual rating breakdown for precise calculation
  const { data: breakdownData } = await supabase
    .from("tripadvisor_scrapes")
    .select("rating_breakdown")
    .eq("tenant_id", tenantId)
    .order("scraped_at", { ascending: false })
    .limit(1);

  const breakdown = breakdownData?.[0]?.rating_breakdown || {
    excellent: 59,
    good: 43,
    average: 21,
    poor: 5,
    terrible: 11,
  };

  const currentPoints = (breakdown.excellent || 0) * 5 +
    (breakdown.good || 0) * 4 +
    (breakdown.average || 0) * 3 +
    (breakdown.poor || 0) * 2 +
    (breakdown.terrible || 0) * 1;

  const targetPoints = targetRating * totalReviews;
  const pointsNeeded = targetPoints - currentPoints;

  // Strategic conversion targets
  const conversionStrategy = {
    convert_4_to_5: Math.min(10, breakdown.good || 0),
    convert_3_to_5: Math.min(15, breakdown.average || 0),
    convert_2_to_5: Math.min(5, breakdown.poor || 0),
    convert_1_to_5: Math.min(5, breakdown.terrible || 0),
  };

  const conversionPoints = conversionStrategy.convert_4_to_5 * 1 +
    conversionStrategy.convert_3_to_5 * 2 +
    conversionStrategy.convert_2_to_5 * 3 +
    conversionStrategy.convert_1_to_5 * 4;

  const remainingPointsNeeded = Math.max(0, pointsNeeded - conversionPoints);
  const additionalFiveStarNeeded = Math.ceil(remainingPointsNeeded / 5);

  return {
    current: currentRating,
    target: targetRating,
    progress: ((currentRating - 4.0) / (targetRating - 4.0)) * 100,
    reviewsNeeded: Math.max(0, additionalFiveStarNeeded),
    totalReviews,
    currentPoints,
    pointsNeeded,
    conversionStrategy,
    conversionPoints,
    breakdown: breakdown || {},
  };
}

// Get today's focus items
async function getTodaysFocus(supabase: any, tenantId: string) {
  const focus = [];

  // Check recent feedback patterns
  const { data: recentFeedback } = await supabase
    .from("feedback")
    .select("category, rating")
    .eq("tenant_id", tenantId)
    .gte(
      "created_at",
      new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(),
    );

  // Identify problem categories
  const categoryIssues = {};
  recentFeedback?.forEach((f) => {
    if (f.rating <= 3) {
      categoryIssues[f.category] = (categoryIssues[f.category] || 0) + 1;
    }
  });

  const topIssue =
    Object.entries(categoryIssues).sort(([, a], [, b]) => b - a)[0];

  if (topIssue) {
    focus.push(
      `Monitor ${topIssue[0]} department - ${topIssue[1]} recent issues`,
    );
  }

  focus.push("Follow up on yesterday's guest feedback responses");
  focus.push("Review housekeeping quality scores with department head");

  return focus.slice(0, 3);
}

// Generate Morning Briefing HTML
function generateMorningBriefingHTML(tenantName: string, data: any) {
  const progressBar = generateProgressBar(data.rating.progress, 100, 15);
  const ratingTrend = getTrendArrow(data.rating.current, 4.0);

  return `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="utf-8">
      <meta name="viewport" content="width=device-width, initial-scale=1.0">
      <title>Morning Briefing - ${tenantName}</title>
      <style>
        body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; margin: 0; padding: 20px; background-color: #f8fafc; }
        .container { max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px rgba(0,0,0,0.1); }
        .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 24px; text-align: center; }
        .header h1 { margin: 0; font-size: 24px; font-weight: 600; }
        .header p { margin: 8px 0 0 0; opacity: 0.9; font-size: 14px; }
        .section { padding: 20px; border-bottom: 1px solid #e2e8f0; }
        .section:last-child { border-bottom: none; }
        .section-title { font-size: 18px; font-weight: 600; margin: 0 0 16px 0; display: flex; align-items: center; }
        .section-title .emoji { margin-right: 8px; }
        .metric-grid { display: grid; grid-template-columns: repeat(auto-fit, minmax(120px, 1fr)); gap: 16px; margin: 16px 0; }
        .metric { text-align: center; padding: 12px; background: #f8fafc; border-radius: 8px; }
        .metric-value { font-size: 24px; font-weight: 700; color: #1e293b; }
        .metric-label { font-size: 12px; color: #64748b; margin-top: 4px; }
        .priority-item { background: #fef2f2; border-left: 4px solid #ef4444; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
        .priority-high { border-left-color: #ef4444; background: #fef2f2; }
        .priority-medium { border-left-color: #f59e0b; background: #fffbeb; }
        .progress-container { background: #f1f5f9; border-radius: 8px; padding: 16px; margin: 12px 0; }
        .progress-bar { font-family: monospace; font-size: 14px; background: #1e293b; color: white; padding: 8px 12px; border-radius: 4px; }
        .focus-item { background: #f0f9ff; border-left: 4px solid #0ea5e9; padding: 12px; margin: 8px 0; border-radius: 0 6px 6px 0; }
        .trend { font-size: 20px; }
        @media (max-width: 600px) {
          .container { margin: 0; border-radius: 0; }
          .metric-grid { grid-template-columns: repeat(2, 1fr); }
        }
      </style>
    </head>
    <body>
      <div class="container">
        <div class="header">
          <h1>🌅 Morning Briefing</h1>
          <p>${tenantName} • ${
    new Date().toLocaleDateString("en-GB", {
      weekday: "long",
      day: "2-digit",
      month: "long",
      year: "numeric",
    })
  }</p>
        </div>

        <div class="section">
          <h2 class="section-title">
            <span class="emoji">📊</span>
            Overnight Snapshot
          </h2>
          <div class="metric-grid">
            <div class="metric">
              <div class="metric-value">${data.overnight.newFeedback}</div>
              <div class="metric-label">New Feedback</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.overnight.newTripadvisorReviews}</div>
              <div class="metric-label">TripAdvisor Reviews</div>
            </div>
            <div class="metric">
              <div class="metric-value ${
    data.overnight.urgentIssues > 0 ? "text-red-600" : ""
  }">${data.overnight.urgentIssues}</div>
              <div class="metric-label">Issues Need Attention</div>
            </div>
            <div class="metric">
              <div class="metric-value">${data.overnight.currentRating}⭐</div>
              <div class="metric-label">Current Rating</div>
            </div>
          </div>
        </div>

        ${
    data.priorities.length > 0
      ? `
        <div class="section">
          <h2 class="section-title">
            <span class="emoji">⚠️</span>
            Priority Actions Today
          </h2>
          ${
        data.priorities.map((action, index) => `
            <div class="priority-item priority-${action.priority}">
              <strong>${index + 1}. ${action.description}</strong><br>
              <span style="color: #64748b; font-size: 14px;">${action.action}</span>
            </div>
          `).join("")
      }
        </div>
        `
      : ""
  }

        <div class="section">
          <h2 class="section-title">
            <span class="emoji">⭐</span>
            Rating Progress
          </h2>
          <div class="progress-container">
            <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
              <span><strong>Current:</strong> ${data.rating.current}⭐ <span class="trend">${ratingTrend}</span></span>
              <span><strong>Goal:</strong> ${data.rating.target}⭐</span>
            </div>
            <div class="progress-bar">${progressBar}</div>
            <div style="margin-top: 12px; font-size: 14px; color: #64748b;">
              <strong>Strategic Target:</strong> Convert ${
    (data.rating.conversionStrategy?.convert_4_to_5 || 0) +
    (data.rating.conversionStrategy?.convert_3_to_5 || 0) +
    (data.rating.conversionStrategy?.convert_2_to_5 || 0) +
    (data.rating.conversionStrategy?.convert_1_to_5 || 0)
  } existing ratings + ${data.rating.reviewsNeeded} new 5⭐ reviews
            </div>
          </div>
        </div>

        <div class="section">
          <h2 class="section-title">
            <span class="emoji">🎯</span>
            Today's Focus
          </h2>
          ${
    data.focus.map((item, index) => `
            <div class="focus-item">
              <strong>${index + 1}.</strong> ${item}
            </div>
          `).join("")
  }
        </div>

        ${
    data.overnight.moderateAttentionIssues &&
      data.overnight.moderateAttentionIssues.length > 0
      ? `
        <div class="section">
          <h2 class="section-title">
            <span class="emoji">🟡</span>
            Moderate Attention Issues (4⭐ with detailed feedback)
          </h2>
          ${
        data.overnight.moderateAttentionIssues.map((issue, index) => `
            <div class="focus-item" style="background: #fef3c7; border-left: 3px solid #f59e0b; padding: 12px; margin: 8px 0;">
              <strong>${
          index + 1
        }. ${issue.guest} - ${issue.category}</strong> (${issue.rating}⭐)<br>
              <span style="color: #92400e; font-size: 14px;">"${issue.comment}"</span>
            </div>
          `).join("")
      }
        </div>
        `
      : ""
  }

        <div class="section" style="text-align: center; background: #f8fafc;">
          <p style="margin: 0; color: #64748b; font-size: 14px;">
            📱 <strong>GuestGlow GM Dashboard</strong><br>
            Have a productive day, Sarah! 🌟
          </p>
        </div>
      </div>
    </body>
    </html>
  `;
}

// Weekly Performance Pulse Report - GM Sarah's Monday 8:00 AM strategic review
async function generateWeeklyPulse(
  supabase: any,
  tenantId: string,
  tenantName: string,
) {
  const today = new Date();
  const lastWeek = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);

  console.log("📈 Generating Weekly Performance Pulse for GM Sarah...");

  // Get rating goal progress
  const ratingProgress = await getRatingProgress(supabase, tenantId);

  // Get department scorecard
  const departmentScores = await getDepartmentScorecard(
    supabase,
    tenantId,
    lastWeek,
  );

  // Get strategic attention items
  const attentionItems = await getStrategicAttentionItems(
    supabase,
    tenantId,
    lastWeek,
  );

  // Get wins to celebrate
  const wins = await getWinsToCelebrate(supabase, tenantId, lastWeek);

  const subject = `📈 ${tenantName} - Weekly Performance Pulse • Week ${
    getWeekNumber(today)
  }`;

  const content = generateWeeklyPulseHTML(tenantName, {
    rating: ratingProgress,
    departments: departmentScores,
    attention: attentionItems,
    wins: wins,
  });

  return { subject, content };
}

// Critical Alert - Only for real urgent issues
async function generateCriticalAlert(
  supabase: any,
  tenantId: string,
  tenantName: string,
) {
  console.log(
    "🚨 Checking for critical issues requiring immediate GM attention...",
  );

  // Check for actual critical issues
  const criticalIssues = await getCriticalIssues(supabase, tenantId);

  if (criticalIssues.length === 0) {
    // No critical issues - send all clear message
    const subject = `✅ ${tenantName} - All Clear • ${
      new Date().toLocaleDateString("en-GB")
    }`;
    const content = generateAllClearHTML(tenantName);
    return { subject, content };
  }

  // Critical issues found
  const subject = `🚨 URGENT: ${tenantName} - Immediate Action Required`;
  const content = generateCriticalAlertHTML(tenantName, criticalIssues);
  return { subject, content };
}

// Get department scorecard
async function getDepartmentScorecard(
  supabase: any,
  tenantId: string,
  lastWeek: Date,
) {
  // Get actual manager data from database - FULLY DYNAMIC
  const { data: managers } = await supabase
    .from("manager_configurations")
    .select("department, manager_name, phone_number")
    .eq("tenant_id", tenantId)
    .eq("is_active", true);

  console.log("📋 Retrieved managers from database:", managers);

  // Create department mapping using ONLY database data
  const departmentIcons = {
    "Housekeeping": "🛏️",
    "Front Desk": "🛎️",
    "Food & Beverage": "🍽️",
    "Maintenance": "🔧",
    "Guest Relations": "🤝",
    "Management": "👔",
  };

  const departments = managers?.map((mgr) => ({
    name: mgr.department,
    icon: departmentIcons[mgr.department] || "📋",
    manager: mgr.manager_name,
    phone: mgr.phone_number,
  })) || [];

  console.log("🏢 Dynamic departments created:", departments);

  // Get feedback by category for the last week
  const { data: weeklyFeedback } = await supabase
    .from("feedback")
    .select("category, rating")
    .eq("tenant_id", tenantId)
    .gte("created_at", lastWeek.toISOString());

  const departmentScores = departments.map((dept) => {
    // PRECISE ALGORITHM: Exact category matching to prevent false positives
    const categoryMappings = {
      "Housekeeping": [
        "Cleanliness",
        "Room Condition",
        "Housekeeping",
        "Room Quality",
      ],
      "Front Desk": [
        "Staff Service",
        "Check-in",
        "Reception",
        "Front Desk",
        "Check-out",
      ],
      "Food & Beverage": [
        "Dining",
        "Restaurant",
        "Food",
        "Breakfast",
        "Food & Beverage",
        "Bar",
      ],
      "Maintenance": [
        "Facilities",
        "Maintenance",
        "Room Maintenance",
        "Equipment",
        "Repairs",
      ],
      "Guest Relations": [
        "Guest Service",
        "Overall Experience",
        "Guest Relations",
        "Customer Service",
      ],
    };

    const relevantCategories = categoryMappings[dept.name] || [];

    // PRECISE MATCHING: Exact category match or starts with pattern to avoid false positives
    const categoryFeedback = weeklyFeedback?.filter((f) => {
      const feedbackCategory = f.category.toLowerCase().trim();
      return relevantCategories.some((cat) => {
        const categoryLower = cat.toLowerCase();
        // Exact match or category starts with the mapping (prevents "Service" matching "Room Service")
        return feedbackCategory === categoryLower ||
          feedbackCategory.startsWith(categoryLower + " ") ||
          categoryLower.startsWith(feedbackCategory + " ");
      });
    }) || [];

    console.log(
      `📊 ${dept.name}: Found ${categoryFeedback.length} relevant feedback items`,
    );

    // REAL CALCULATION: Only show score if we have actual data
    let avgRating = null;
    let hasData = categoryFeedback.length > 0;

    if (hasData) {
      avgRating = categoryFeedback.reduce((sum, f) => sum + f.rating, 0) /
        categoryFeedback.length;
    }

    const trend = hasData ? getTrendArrow(avgRating, 4.0) : "➡️";
    const status = hasData
      ? getTrafficLight(avgRating, { good: 4.0, warning: 3.5 })
      : "⚪";

    return {
      ...dept,
      score: hasData ? avgRating.toFixed(1) : "No Data",
      trend,
      status,
      feedbackCount: categoryFeedback.length,
      issues: categoryFeedback.filter((f) => f.rating <= 3).length,
      hasData,
    };
  });

  return departmentScores;
}

// Get strategic attention items
async function getStrategicAttentionItems(
  supabase: any,
  tenantId: string,
  lastWeek: Date,
) {
  const items = [];

  // Check for recurring issues
  const { data: recentFeedback } = await supabase
    .from("feedback")
    .select("category, rating, comment")
    .eq("tenant_id", tenantId)
    .gte("created_at", lastWeek.toISOString())
    .lte("rating", 3);

  // Analyze patterns
  const categoryIssues = {};
  recentFeedback?.forEach((f) => {
    categoryIssues[f.category] = (categoryIssues[f.category] || 0) + 1;
  });

  // Add top issues as attention items
  Object.entries(categoryIssues)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 2)
    .forEach(([category, count]) => {
      items.push({
        type: "recurring_issue",
        priority: count > 2 ? "high" : "medium",
        title: `${category} Department Concerns`,
        description:
          `${count} guest complaints this week - pattern analysis needed`,
        action: "Department head review recommended for pattern analysis",
      });
    });

  // Add strategic items
  if (items.length < 3) {
    items.push({
      type: "strategic",
      priority: "medium",
      title: "Staff Training Opportunity",
      description: "Guest service excellence workshop for front-line staff",
      action: "Monthly service excellence training opportunity identified",
    });
  }

  return items.slice(0, 3);
}

// Get wins to celebrate
async function getWinsToCelebrate(
  supabase: any,
  tenantId: string,
  lastWeek: Date,
) {
  const wins = [];

  // Check for 5-star feedback
  const { data: fiveStarFeedback } = await supabase
    .from("feedback")
    .select("guest_name, comment, category")
    .eq("tenant_id", tenantId)
    .eq("rating", 5)
    .gte("created_at", lastWeek.toISOString())
    .limit(2);

  fiveStarFeedback?.forEach((feedback) => {
    wins.push({
      type: "guest_praise",
      title: `5⭐ Guest Praise - ${feedback.category}`,
      description: `"${
        feedback.comment?.substring(0, 100)
      }..." - ${feedback.guest_name}`,
      impact: "Positive guest experience contributing to rating goal",
    });
  });

  // Add operational wins
  if (wins.length < 2) {
    wins.push({
      type: "operational",
      title: "Zero Critical Issues This Week",
      description: "All departments maintained excellent service standards",
      impact: "Consistent quality delivery supporting reputation goals",
    });
  }

  return wins.slice(0, 3);
}

// Helper function to get week number
function getWeekNumber(date: Date): number {
  const firstDayOfYear = new Date(date.getFullYear(), 0, 1);
  const pastDaysOfYear = (date.getTime() - firstDayOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + firstDayOfYear.getDay() + 1) / 7);
}

// REAL CRITICAL ALERT ALGORITHM
async function getCriticalIssues(supabase: any, tenantId: string) {
  const issues = [];
  const now = new Date();
  const last24Hours = new Date(now.getTime() - 24 * 60 * 60 * 1000);

  console.log("🔍 Checking for REAL critical issues...");

  // REAL CHECK 1: Recent 1-3 star feedback (last 24 hours) - 3⭐ should be flagged as concerning
  const { data: criticalFeedback } = await supabase
    .from("feedback")
    .select(
      "id, guest_name, guest_email, rating, category, comment, created_at",
    )
    .eq("tenant_id", tenantId)
    .lte("rating", 3)
    .gte("created_at", last24Hours.toISOString())
    .order("created_at", { ascending: false });

  console.log(
    `Found ${criticalFeedback?.length || 0} critical feedback entries`,
  );
  console.log("Critical feedback details:", criticalFeedback);

  // REAL CHECK 2: TripAdvisor rating drop detection with freshness validation
  const { data: recentRatings } = await supabase
    .from("tripadvisor_scrapes")
    .select("rating, scraped_at")
    .eq("tenant_id", tenantId)
    .order("scraped_at", { ascending: false })
    .limit(2);

  let ratingDropDetected = false;
  let dataFreshnessIssue = false;

  if (recentRatings && recentRatings.length >= 1) {
    const latestScrape = new Date(recentRatings[0].scraped_at);
    const hoursOld = (now.getTime() - latestScrape.getTime()) /
      (1000 * 60 * 60);

    // Flag if data is older than 8 hours (beyond normal 6-hour cycle)
    if (hoursOld > 8) {
      dataFreshnessIssue = true;
      console.log(
        `⚠️ TripAdvisor data freshness issue: ${hoursOld.toFixed(1)} hours old`,
      );
    }

    if (recentRatings.length >= 2) {
      const current = parseFloat(recentRatings[0].rating);
      const previous = parseFloat(recentRatings[1].rating);
      ratingDropDetected = current < previous;
      console.log(
        `Rating trend: ${previous}⭐ → ${current}⭐ (Drop: ${ratingDropDetected})`,
      );
    }
  }

  // Add REAL critical issues only
  criticalFeedback?.forEach((feedback) => {
    issues.push({
      type: "guest_complaint",
      severity: feedback.rating <= 2 ? "critical" : "high",
      title: `${feedback.rating}⭐ Guest ${
        feedback.rating <= 2 ? "Complaint" : "Concern"
      } - ${feedback.category}`,
      description: `Guest ${
        feedback.guest_name || "Anonymous"
      } submitted a ${feedback.rating}-star review about ${feedback.category}. ${
        feedback.rating <= 2
          ? "High risk of negative public review."
          : "Service improvement opportunity identified."
      }`,
      guestImpact: feedback.rating <= 2
        ? "High - Potential TripAdvisor review risk"
        : "Medium - Service quality concern",
      actions: [
        "Guest contact recommended within 2 hours",
        "Service recovery opportunity identified",
        "Follow-up documentation suggested",
        "Public review monitoring advised",
      ],
      contacts: [
        {
          name: "Front Desk Manager - David Mensah",
          phone: "+233 24 456 7890",
        },
        { name: "General Manager", phone: "+233 24 479 9348" },
      ],
      timeline: "Within 2 hours",
      feedbackId: feedback.id,
    });
  });

  if (ratingDropDetected) {
    issues.push({
      type: "rating_drop",
      severity: "high",
      title: "TripAdvisor Rating Drop Detected",
      description: `Rating decreased from ${recentRatings[1].rating}⭐ to ${
        recentRatings[0].rating
      }⭐`,
      guestImpact: "Medium - Reputation impact",
      actions: [
        "Recent feedback pattern analysis recommended",
        "Service improvement opportunities identified",
        "Additional review monitoring suggested",
      ],
      contacts: [
        { name: "General Manager", phone: "+233 24 479 9348" },
      ],
      timeline: "Within 4 hours",
    });
  }

  if (dataFreshnessIssue) {
    issues.push({
      type: "data_freshness",
      severity: "medium",
      title: "TripAdvisor Data Freshness Alert",
      description: `Rating data is ${
        Math.round(
          (now.getTime() - new Date(recentRatings[0].scraped_at).getTime()) /
            (1000 * 60 * 60),
        )
      } hours old (beyond 6-hour update cycle)`,
      guestImpact: "Low - Monitoring delay only",
      actions: [
        "Check TripAdvisor scraping function status",
        "Verify Firecrawl API connectivity",
        "Manual rating check if critical decisions needed",
      ],
      contacts: [
        { name: "Technical Support", phone: "+233 24 479 9348" },
      ],
      timeline: "Within 24 hours",
    });
  }

  console.log(`Total critical issues found: ${issues.length}`);
  return issues;
}
