import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

interface RiskAssessmentRequest {
  feedback_text: string;
  rating: number;
  response_text: string;
  tenant_id: string;
  feedback_id: string;
}

interface RiskAssessmentResult {
  risk_score: number;
  severity_level: "HIGH" | "MEDIUM" | "LOW";
  requires_approval: boolean;
  risk_factors: string[];
  risk_explanation: string;
  ai_confidence_score: number;
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

    const { feedback_text, rating, response_text, tenant_id, feedback_id }:
      RiskAssessmentRequest = await req.json();

    // Perform risk assessment
    const assessment = await assessResponseRisk(
      feedback_text,
      rating,
      response_text,
    );

    // Store assessment if approval required
    let approval_id: string | null = null;
    if (assessment.requires_approval) {
      const { data: insertRow, error } = await supabase
        .from("response_approvals")
        .insert({
          feedback_id,
          tenant_id,
          generated_response: response_text,
          response_type: "guest_response",
          severity_level: assessment.severity_level,
          risk_factors: assessment.risk_factors,
          ai_confidence_score: assessment.ai_confidence_score,
          risk_explanation: assessment.risk_explanation,
          requires_approval: true,
          status: "pending",
        })
        .select("id")
        .single();

      if (error) throw error;
      approval_id = insertRow?.id || null;
    }

    return new Response(
      JSON.stringify({ success: true, assessment, approval_id }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 200,
      },
    );
  } catch (error) {
    console.error("Risk assessment error:", error);
    return new Response(
      JSON.stringify({ success: false, error: error.message }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
        status: 500,
      },
    );
  }
});

async function assessResponseRisk(
  feedbackText: string,
  rating: number,
  responseText: string,
): Promise<RiskAssessmentResult> {
  let riskScore = 0;
  const riskFactors: string[] = [];
  let explanation = "";

  // Convert to lowercase for analysis
  const feedback = feedbackText.toLowerCase();
  const response = responseText.toLowerCase();

  // 1. Legal/Compliance Threats (30 points)
  if (hasLegalThreat(feedback)) {
    riskScore += 30;
    riskFactors.push("Legal threat detected");
    explanation += "Guest has made explicit legal threats. ";
  }

  // 2. Health & Safety Critical (25 points)
  if (hasHealthSafetyCritical(feedback)) {
    riskScore += 25;
    riskFactors.push("Health/safety critical issue");
    explanation +=
      "Serious health or safety issue requiring medical attention. ";
  }

  // 3. Staff Misconduct - Serious (20 points)
  if (hasSeriousStaffMisconduct(feedback)) {
    riskScore += 20;
    riskFactors.push("Serious staff misconduct");
    explanation += "Serious staff misconduct allegations detected. ";
  }

  // 4. Media/Reputation Threat (15 points)
  if (hasMediaThreat(feedback)) {
    riskScore += 15;
    riskFactors.push("Media/reputation threat");
    explanation += "Media involvement or viral threat mentioned. ";
  }

  // 5. System Bypass Attempt (50 points)
  if (hasBypassAttempt(feedback)) {
    riskScore += 50;
    riskFactors.push("System bypass attempt");
    explanation += "Potential AI manipulation or system bypass detected. ";
  }

  // 6. Security Incidents (25 points)
  if (hasSecurityIncident(feedback)) {
    riskScore += 25;
    riskFactors.push("Security incident");
    explanation +=
      "Security incident involving theft, assault, or unauthorized access. ";
  }

  // Cap at 100
  riskScore = Math.min(100, riskScore);

  // Determine severity and approval requirement
  const severity_level: "HIGH" | "MEDIUM" | "LOW" = riskScore >= 30
    ? "HIGH"
    : riskScore >= 15
    ? "MEDIUM"
    : "LOW";

  const requires_approval = riskScore >= 30 || riskFactors.length >= 2;

  // AI confidence (simulated - in production would use actual AI model)
  const ai_confidence_score = Math.max(
    0.7,
    Math.min(1.0, (riskScore / 100) + 0.3),
  );

  if (!explanation) {
    explanation =
      "Routine service complaint - low risk for automated response.";
  }

  return {
    risk_score: riskScore,
    severity_level,
    requires_approval,
    risk_factors: riskFactors,
    risk_explanation: explanation.trim(),
    ai_confidence_score,
  };
}

function hasLegalThreat(text: string): boolean {
  const legalKeywords = [
    "lawsuit",
    "sue",
    "suing",
    "lawyer",
    "attorney",
    "legal action",
    "discrimination",
    "harassment",
    "civil rights",
    "ada violation",
    "health department",
    "regulatory",
    "compliance violation",
  ];
  return legalKeywords.some((keyword) => text.includes(keyword));
}

function hasHealthSafetyCritical(text: string): boolean {
  const healthSafetyKeywords = [
    "food poisoning",
    "hospital",
    "emergency room",
    "medical treatment",
    "ambulance",
    "injury",
    "hurt",
    "fire hazard",
    "gas leak",
    "electrical",
    "structural damage",
    "ceiling fell",
    "balcony collapse",
  ];
  return healthSafetyKeywords.some((keyword) => text.includes(keyword));
}

function hasSeriousStaffMisconduct(text: string): boolean {
  const misconductKeywords = [
    "theft",
    "stealing",
    "stole",
    "drunk",
    "intoxicated",
    "drugs",
    "fight",
    "assault",
    "hit me",
    "pushed me",
    "threatened",
    "shared my information",
    "privacy breach",
    "bribery",
    "corruption",
  ];
  return misconductKeywords.some((keyword) => text.includes(keyword));
}

function hasMediaThreat(text: string): boolean {
  const mediaKeywords = [
    "viral",
    "social media",
    "facebook",
    "twitter",
    "instagram",
    "tiktok",
    "news",
    "reporter",
    "journalist",
    "boycott",
    "influencer",
    "followers",
    "expose",
    "blast",
    "shame",
  ];
  return mediaKeywords.some((keyword) => text.includes(keyword));
}

function hasBypassAttempt(text: string): boolean {
  const bypassKeywords = [
    "ignore previous",
    "system prompt",
    "admin",
    "root",
    "sudo",
    "execute",
    "command",
    "script",
    "function",
    "override",
    "bypass",
    "hack",
    "inject",
  ];
  return bypassKeywords.some((keyword) => text.includes(keyword));
}

function hasSecurityIncident(text: string): boolean {
  const securityKeywords = [
    "assault",
    "attacked",
    "robbed",
    "stolen",
    "theft",
    "unauthorized access",
    "broke into",
    "violence",
    "weapon",
    "gun",
    "knife",
    "threatened",
    "stalked",
  ];
  return securityKeywords.some((keyword) => text.includes(keyword));
}
