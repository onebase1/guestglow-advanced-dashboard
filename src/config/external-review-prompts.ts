/**
 * External Review Response Prompt Configuration
 * 
 * This file contains the improved prompts for generating human-like responses
 * to external reviews. The prompts are designed to create varied, professional
 * responses that don't sound robotic or repetitive.
 * 
 * Path: guestglow-fresh/src/config/external-review-prompts.ts
 */

export interface PlatformContext {
  guidelines: string
  max_length: number
  tone: string
  formatting: string
}

export interface ResponsePromptParams {
  platform: string
  platformContext: PlatformContext
  guest_name?: string
  rating: number
  review_text: string
  sentiment: string
  tenant_name: string
  brand_voice: string
  contact_email: string
}

// Platform-specific contexts and guidelines
export const PLATFORM_CONTEXTS: Record<string, PlatformContext> = {
  'google': {
    guidelines: 'Keep responses professional and concise. Thank the reviewer and address specific points mentioned.',
    max_length: 350,
    tone: 'professional',
    formatting: 'simple'
  },
  'tripadvisor': {
    guidelines: 'Be warm and personal. Acknowledge specific details from the review and invite future visits.',
    max_length: 500,
    tone: 'friendly',
    formatting: 'conversational'
  },
  'booking.com': {
    guidelines: 'Focus on practical improvements and future service enhancements.',
    max_length: 400,
    tone: 'helpful',
    formatting: 'structured'
  },
  'expedia': {
    guidelines: 'Be concise and solution-focused. Highlight positive aspects when appropriate.',
    max_length: 300,
    tone: 'professional',
    formatting: 'brief'
  },
  'default': {
    guidelines: 'Maintain a professional, empathetic tone while addressing the guest\'s specific concerns.',
    max_length: 350,
    tone: 'professional',
    formatting: 'balanced'
  }
}

// Phrases to avoid (robotic/corporate language)
export const AVOID_PHRASES = [
  "Thank you for taking the time to share your valuable feedback with us",
  "We deeply appreciate your candid review",
  "We sincerely apologize for your disappointing experience",
  "Your feedback is extremely important to us",
  "We take full responsibility for not meeting your expectations",
  "We have immediately addressed these concerns with our team",
  "We would be honored to welcome you back",
  "Please feel free to contact us directly"
]

// Alternative natural phrases to use instead
export const NATURAL_ALTERNATIVES = {
  greetings: [
    "Hello {name}",
    "Dear {name}",
    "Hi {name}",
    "{name}",
    "Thank you {name}"
  ],
  acknowledgments: [
    "We appreciate you sharing your experience",
    "Your review helps us understand what went wrong",
    "Thank you for your honest feedback",
    "We value your input",
    "We're glad you took the time to write this review",
    "Your experience matters to us"
  ],
  apologies: [
    "We're sorry to hear about the issues you encountered",
    "We apologize for the problems during your stay",
    "We're disappointed that we didn't meet your expectations",
    "We're sorry your experience wasn't what it should have been",
    "We clearly fell short of our standards"
  ],
  improvements: [
    "We're working to address these issues",
    "Your feedback is helping us improve",
    "We've taken steps to prevent this from happening again",
    "We're making changes based on your experience",
    "This has prompted us to review our procedures"
  ],
  invitations: [
    "We'd love the opportunity to provide you with a better experience",
    "I hope you'll consider giving us another chance",
    "We'd welcome you back to show you the improvements we've made",
    "Please reach out if you'd like to discuss this further"
  ]
}

// System prompt template for improved human-like responses
export function getImprovedSystemPrompt(platform: string, platformContext: PlatformContext): string {
  return `You are an experienced hotel guest relations manager responding to online reviews on ${platform}. Your responses should sound genuinely human, professional, and varied.

CRITICAL REQUIREMENTS:
1. NEVER use the same opening phrase repeatedly - vary your greetings naturally
2. Address SPECIFIC issues mentioned by the guest (WiFi, breakfast, room service, cleanliness, etc.)
3. Use natural, conversational language that sounds human-written
4. Avoid corporate jargon and robotic phrases
5. Keep responses within ${platformContext.max_length} characters
6. Use ${platformContext.tone} tone with ${platformContext.formatting} formatting

RESPONSE STRUCTURE (vary the language):
- Natural greeting (vary: "Hello [Name]", "Dear [Name]", "Hi [Name]", or just "[Name]")
- Acknowledge their experience (vary your language - don't always say "thank you for taking the time")
- Address specific issues mentioned with genuine concern
- Mention improvements or actions (be specific but realistic)
- Professional closing with contact info when appropriate

AVOID THESE ROBOTIC PHRASES:
${AVOID_PHRASES.map(phrase => `- "${phrase}"`).join('\n')}

INSTEAD USE VARIED, NATURAL LANGUAGE:
- "We appreciate you sharing your experience"
- "Your review helps us understand what went wrong"
- "We're sorry to hear about the issues you encountered"
- "We value your honest feedback"
- "Your experience matters to us"
- "We're working to address these issues"

Platform guidelines: ${platformContext.guidelines}

Generate responses that sound like they were written by a caring, professional human manager who genuinely wants to address the guest's concerns.`
}

// Function to extract specific issues from review text
export function extractMentionedIssues(reviewText: string): string[] {
  const reviewLower = reviewText.toLowerCase()
  const mentionedIssues: string[] = []
  
  if (reviewLower.includes('wifi') || reviewLower.includes('internet')) {
    mentionedIssues.push('WiFi connectivity')
  }
  if (reviewLower.includes('breakfast') || reviewLower.includes('food')) {
    mentionedIssues.push('dining experience')
  }
  if (reviewLower.includes('room service') || reviewLower.includes('service')) {
    mentionedIssues.push('service quality')
  }
  if (reviewLower.includes('clean') || reviewLower.includes('dirty')) {
    mentionedIssues.push('cleanliness standards')
  }
  if (reviewLower.includes('staff') || reviewLower.includes('employee')) {
    mentionedIssues.push('staff interaction')
  }
  if (reviewLower.includes('shower') || reviewLower.includes('bathroom')) {
    mentionedIssues.push('bathroom facilities')
  }
  if (reviewLower.includes('noise') || reviewLower.includes('loud')) {
    mentionedIssues.push('noise levels')
  }
  if (reviewLower.includes('booking') || reviewLower.includes('reservation')) {
    mentionedIssues.push('booking process')
  }
  if (reviewLower.includes('room') && (reviewLower.includes('small') || reviewLower.includes('uncomfortable'))) {
    mentionedIssues.push('room comfort')
  }
  if (reviewLower.includes('pool') || reviewLower.includes('facility')) {
    mentionedIssues.push('hotel facilities')
  }

  return mentionedIssues
}

// Function to determine response approach based on rating
export function getResponseApproach(rating: number): string {
  if (rating <= 2) return 'recovery_focused'
  if (rating <= 3) return 'improvement_focused'
  if (rating >= 4) return 'appreciation_focused'
  return 'balanced'
}

// Main function to create human-like response prompt
export function createHumanLikeResponsePrompt(params: ResponsePromptParams): string {
  const {
    platform,
    platformContext,
    guest_name,
    rating,
    review_text,
    sentiment,
    tenant_name,
    brand_voice,
    contact_email
  } = params

  const mentionedIssues = extractMentionedIssues(review_text)
  const responseApproach = getResponseApproach(rating)

  return `Generate a human-like response to this ${platform} review for ${tenant_name}:

REVIEW DETAILS:
Guest: ${guest_name || 'Anonymous'}
Rating: ${rating}/5 stars
Review: "${review_text}"
Sentiment: ${sentiment}
Specific Issues: ${mentionedIssues.length > 0 ? mentionedIssues.join(', ') : 'General feedback'}

RESPONSE REQUIREMENTS:
Brand Voice: ${brand_voice}
Platform: ${platform}
Max Length: ${platformContext.max_length} characters
Tone: ${platformContext.tone}
Approach: ${responseApproach}

SPECIFIC INSTRUCTIONS:
${rating <= 2 ? 
  `- Focus on service recovery and genuine apology
   - Address each specific issue mentioned: ${mentionedIssues.join(', ')}
   - Offer direct contact for resolution: ${contact_email}
   - Show accountability and commitment to improvement` :
  rating <= 3 ?
  `- Acknowledge the mixed experience
   - Address specific concerns: ${mentionedIssues.join(', ')}
   - Highlight improvements being made
   - Invite them to give you another chance` :
  `- Express genuine appreciation for positive feedback
   - Acknowledge specific aspects they enjoyed
   - Invite them to return and experience continued excellence
   - Keep tone warm but professional`
}

VARIATION REQUIREMENTS:
- Use natural, conversational language
- Vary your opening greeting (don't always use the same phrase)
- Sound like a real person, not a corporate template
- Be specific about the issues they mentioned
- Show genuine care and professionalism

Generate ONLY the response text, ready for posting on ${platform}.`
}

// Configuration for OpenAI API call
export const OPENAI_CONFIG = {
  model: 'gpt-4o-2024-08-06',
  max_tokens: 600,
  temperature: 0.8, // Higher temperature for more variation
  presence_penalty: 0.3, // Encourage diverse language
  frequency_penalty: 0.2, // Reduce repetitive phrases
}

// Example responses for different rating levels (for reference)
export const EXAMPLE_RESPONSES = {
  low_rating: `Hi Sarah,

We're sorry to hear about the issues you encountered during your stay. The WiFi problems and cold breakfast are definitely not the standard we aim for, and we understand how frustrating that must have been.

We've been working on upgrading our internet infrastructure, and your feedback confirms we need to accelerate these improvements. We've also spoken with our kitchen team about maintaining proper food temperatures.

We'd appreciate the chance to discuss this with you directly - please reach out to guestrelations@eusbetthotel.com so we can make this right.

Best regards,
The Eusbett Hotel Guest Relations Team`,

  high_rating: `Hello Lawrence,

What a wonderful review to read! We're so pleased you enjoyed our food and found our staff friendly. It's exactly the kind of experience we strive to create for every guest.

Your comment about feeling at home really means a lot to our team - that's precisely what we hope to achieve. We look forward to welcoming you back to the Bono region soon!

Warm regards,
The Eusbett Hotel Guest Relations Team`
}
