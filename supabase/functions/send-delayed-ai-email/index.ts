import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface DelayedEmailRequest {
  feedback_id: string;
  guest_name: string;
  guest_email: string;
  room_number?: string;
  rating: number;
  feedback_text: string;
  issue_category?: string;
  tenant_id: string;
  tenant_slug: string;
  delay_minutes?: number;
}

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
    );

    const request: DelayedEmailRequest = await req.json();
    console.log("⏰ Processing delayed AI email request for:", {
      feedback_id: request.feedback_id,
      guest: request.guest_name,
      delay_minutes: request.delay_minutes || 3,
    });

    // Feature flag to bypass human-in-loop gating when disabled
    const humanInLoopEnabled =
      (Deno.env.get("HUMAN_IN_LOOP_ENABLED") ?? "false").toLowerCase() ===
        "true";

    // PHASE 1: SECURITY CHECK BEFORE GENERATION (fail closed) - only when enabled
    if (humanInLoopEnabled) {
      const feedbackLower = (request.feedback_text || "").toLowerCase();
      const HIGH_RISK_KEYWORDS = [
        "food poisoning",
        "poisoning",
        "poison",
        "food poinsing",
        "stolen",
        "theft",
        "robbed",
        "burglar",
        "missing jewelry",
        "jewels",
        "assault",
        "attack",
        "violence",
        "abuse",
        "harassment",
        "lawsuit",
        "legal action",
        "sue",
        "lawyer",
        "attorney",
        "discrimination",
        "racist",
        "sexist",
        "homophobic",
        "injury",
        "hurt",
        "hospital",
        "ambulance",
        "medical emergency",
        "fire",
        "smoke",
        "gas leak",
        "carbon monoxide",
        "bed bugs",
        "cockroach",
        "rat",
        "mouse",
        "infestation",
      ];
      const hasDangerousKeyword = HIGH_RISK_KEYWORDS.some((k) =>
        feedbackLower.includes(k)
      );
      const isLowRating = (request.rating ?? 5) <= 2;
      if (hasDangerousKeyword || isLowRating) {
        console.log(
          "🛑 Dangerous content or low rating detected - requiring human approval",
        );
        const { data: insertRow, error: insertError } = await supabase
          .from("response_approvals")
          .insert({
            feedback_id: request.feedback_id,
            tenant_id: request.tenant_id,
            generated_response: "",
            response_type: "guest_response",
            severity_level: "HIGH",
            risk_factors: [
              ...(hasDangerousKeyword ? ["Dangerous keyword detected"] : []),
              ...(isLowRating ? ["Low rating (<=2 stars)"] : []),
            ],
            ai_confidence_score: 0.9,
            risk_explanation:
              "Security trigger words or low rating detected. Human approval required before sending.",
            requires_approval: true,
            status: "pending",
          })
          .select("id")
          .single();
        if (insertError) throw insertError;
        try {
          await supabase.functions.invoke("send-approval-notification", {
            body: { approval_id: insertRow?.id, tenant_id: request.tenant_id },
          });
        } catch (notifyErr) {
          console.error("⚠️ Approval notification failed:", notifyErr);
        }
        return new Response(
          JSON.stringify({
            success: false,
            reason: "pending_approval",
            message: "Email not sent - awaiting human approval",
          }),
          {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
          },
        );
      }
    }

    // Wait for the specified delay
    const delayMs = (request.delay_minutes || 3) * 60 * 1000;
    console.log(
      `⏳ Waiting ${request.delay_minutes || 3} minutes before sending...`,
    );

    await new Promise((resolve) => setTimeout(resolve, delayMs));

    // 🚨 PHASE 2: CHECK APPROVAL STATUS BEFORE SENDING (only when enabled)
    if (humanInLoopEnabled) {
      console.log("🔍 Checking approval status...");
      const { data: approvalCheck, error: _approvalError } = await supabase
        .from("response_approvals")
        .select("status, requires_approval")
        .eq("feedback_id", request.feedback_id)
        .eq("tenant_id", request.tenant_id)
        .single();

      if (approvalCheck?.requires_approval) {
        if (approvalCheck.status === "pending") {
          console.log("⏸️ Response pending approval - not sending email");
          return new Response(
            JSON.stringify({
              success: false,
              reason: "pending_approval",
              message: "Email not sent - awaiting human approval",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        } else if (approvalCheck.status === "rejected") {
          console.log("❌ Response rejected - not sending email");
          return new Response(
            JSON.stringify({
              success: false,
              reason: "rejected",
              message: "Email not sent - response was rejected",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        } else if (approvalCheck.status === "expired") {
          console.log("⏰ Response expired - not sending email");
          return new Response(
            JSON.stringify({
              success: false,
              reason: "expired",
              message: "Email not sent - approval expired",
            }),
            {
              headers: { ...corsHeaders, "Content-Type": "application/json" },
              status: 200,
            },
          );
        }
        // If status is 'approved', continue with sending
        console.log("✅ Response approved - proceeding with email");
      } else {
        console.log("✅ No approval required - proceeding with email");
      }
    } else {
      console.log("✅ Human-in-loop disabled - proceeding with email");
    }

    // Generate structured email content
    console.log("📧 Generating structured detailed email content...");
    const hotelName = `${
      request.tenant_slug.charAt(0).toUpperCase() + request.tenant_slug.slice(1)
    } Hotel`;

    // Generate AI content but structure it properly
    let aiGeneratedContent = "";
    try {
      const { data: aiData, error: aiError } = await supabase.functions.invoke(
        "ai-response-generator",
        {
          body: {
            reviewText: request.feedback_text,
            rating: request.rating,
            isExternal: false,
            guestName: request.guest_name,
            tenant_id: request.tenant_id,
            tenant_slug: request.tenant_slug,
          },
        },
      );

      if (!aiError && aiData?.response) {
        aiGeneratedContent = aiData.response;
        console.log("✅ AI content generated successfully");
      }
    } catch (error) {
      console.warn("AI generation failed, using structured template");
    }

    // Structure the email content to match the reference image exactly
    const structuredContent = generateStructuredEmailContent({
      guestName: request.guest_name,
      hotelName,
      rating: request.rating,
      feedbackText: request.feedback_text,
      roomNumber: request.room_number,
      aiContent: aiGeneratedContent,
    });

    // Create clean HTML email matching the reference format exactly
    const subject =
      `Thank you for your feedback regarding your recent stay in Room ${
        request.room_number || "N/A"
      } at ${hotelName}`;

    const htmlContent = `
      <!DOCTYPE html>
      <html>
      <head>
        <meta charset="utf-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${subject}</title>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.5; color: #333; margin: 0; padding: 20px; background-color: #f5f5f5; }
          .container { max-width: 600px; margin: 0 auto; background: #fff; padding: 30px; border-radius: 8px; box-shadow: 0 2px 10px rgba(0,0,0,0.1); }
          .content { font-size: 14px; line-height: 1.6; }
          .content p { margin: 0 0 15px 0; }
          .signature { margin-top: 25px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="content">
            ${structuredContent}
          </div>
        </div>
      </body>
      </html>
    `;

    // Send the email using send-tenant-emails function
    console.log("📤 Sending delayed detailed AI-powered email...");
    const { data: emailResult, error: emailError } = await supabase.functions
      .invoke("send-tenant-emails", {
        body: {
          feedback_id: request.feedback_id,
          email_type: "detailed_ai_thankyou",
          recipient_email: request.guest_email,
          subject: subject,
          html_content: htmlContent,
          tenant_id: request.tenant_id,
          tenant_slug: request.tenant_slug,
          priority: "normal",
        },
      });

    if (emailError) {
      console.error("❌ Detailed AI email failed:", emailError);
      throw new Error(`Email sending failed: ${emailError.message}`);
    }

    console.log("✅ Delayed detailed AI email sent successfully!");

    return new Response(
      JSON.stringify({
        success: true,
        message: "Delayed detailed AI email sent successfully",
        feedback_id: request.feedback_id,
        guest_email: request.guest_email,
        delay_minutes: request.delay_minutes || 3,
        email_result: emailResult,
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("❌ Failed to send delayed AI email:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

/**
 * Generate structured email content matching the reference image format
 */
function generateStructuredEmailContent(params: {
  guestName: string;
  hotelName: string;
  rating: number;
  feedbackText: string;
  roomNumber?: string;
  aiContent?: string;
}): string {
  const { guestName, hotelName, rating, feedbackText, roomNumber, aiContent } =
    params;

  // If we have AI content, extract key points and structure them properly
  let structuredResponse = "";

  if (aiContent && aiContent.length > 100) {
    // Extract the main apology/acknowledgment and key points from AI content
    const lines = aiContent.split("\n").filter((line) =>
      line.trim().length > 0
    );
    const mainContent = lines.slice(0, 3).join(" ").replace(/\s+/g, " ").trim();
    structuredResponse = mainContent.substring(0, 400) +
      (mainContent.length > 400 ? "..." : "");
  }

  // Create SHORT structured content matching the reference format EXACTLY
  if (!structuredResponse || structuredResponse.length > 300) {
    if (rating <= 3) {
      structuredResponse =
        `We sincerely apologize that your experience did not meet your expectations. Your feedback is invaluable to us, and we take every comment seriously.

Please rest assured that your comments have been shared with our management team. We are taking immediate steps to address the issues you mentioned and ensure a much better experience for all our guests in the future.

Should you have any further questions or concerns, please do not hesitate to reach out to us directly.`;
    } else {
      structuredResponse =
        `Thank you so much for taking the time to share your positive feedback about your recent stay with us. We're delighted to hear that you had such a wonderful experience!

Your kind words mean a great deal to our entire team, and we're thrilled that we were able to provide you with exceptional service. It's guests like you who inspire us to maintain our high standards.

We hope to have the pleasure of welcoming you back soon for another memorable stay.`;
    }
  }

  return `<p>Dear ${guestName},</p>

<p>Thank you for taking the time to share your feedback regarding your recent stay in Room ${
    roomNumber || "N/A"
  } at ${hotelName}.</p>

<p>${structuredResponse}</p>

<div class="signature">
<p>Warm regards,</p>
<p><strong>${hotelName} Team</strong></p>
</div>`;
}
