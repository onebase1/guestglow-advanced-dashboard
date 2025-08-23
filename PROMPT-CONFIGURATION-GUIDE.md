# External Review Response Prompt Configuration Guide

## Main Prompt Configuration File

**📁 Path**: `guestglow-fresh/src/config/external-review-prompts.ts`

This is the central configuration file for the improved external review response system. You can review and modify all prompts, settings, and language patterns from this single location.

## What's in the Configuration File

### 1. Platform-Specific Settings
```typescript
export const PLATFORM_CONTEXTS: Record<string, PlatformContext> = {
  'google': {
    guidelines: 'Keep responses professional and concise...',
    max_length: 350,
    tone: 'professional',
    formatting: 'simple'
  },
  'tripadvisor': {
    guidelines: 'Be warm and personal...',
    max_length: 500,
    tone: 'friendly',
    formatting: 'conversational'
  }
  // ... more platforms
}
```

### 2. Robotic Phrases to Avoid
```typescript
export const AVOID_PHRASES = [
  "Thank you for taking the time to share your valuable feedback with us",
  "We deeply appreciate your candid review",
  "We sincerely apologize for your disappointing experience",
  // ... more phrases to avoid
]
```

### 3. Natural Language Alternatives
```typescript
export const NATURAL_ALTERNATIVES = {
  greetings: [
    "Hello {name}",
    "Dear {name}",
    "Hi {name}",
    // ... more variations
  ],
  acknowledgments: [
    "I appreciate you sharing your experience",
    "Your review helps us understand what went wrong",
    // ... more variations
  ]
}
```

### 4. OpenAI Configuration
```typescript
export const OPENAI_CONFIG = {
  model: 'gpt-4o-2024-08-06',
  max_tokens: 600,
  temperature: 0.8,        // Higher for more variation
  presence_penalty: 0.3,   // Encourage diverse language
  frequency_penalty: 0.2,  // Reduce repetitive phrases
}
```

## How to Review and Modify Prompts

### 1. Open the Configuration File
Navigate to: `guestglow-fresh/src/config/external-review-prompts.ts`

### 2. Key Functions to Review

#### `getImprovedSystemPrompt()`
This function creates the main system prompt that instructs the AI on how to respond:
- Sets the tone and style guidelines
- Lists phrases to avoid
- Provides examples of natural language
- Defines response structure requirements

#### `createHumanLikeResponsePrompt()`
This function creates the specific prompt for each review:
- Analyzes the review content
- Identifies specific issues mentioned
- Determines appropriate response approach
- Provides context-specific instructions

### 3. Customization Options

#### Adjust Response Tone
```typescript
// In PLATFORM_CONTEXTS, modify the tone field:
'tripadvisor': {
  tone: 'friendly',        // Options: 'professional', 'friendly', 'helpful'
  formatting: 'conversational'
}
```

#### Add New Platforms
```typescript
'new-platform': {
  guidelines: 'Your specific guidelines here',
  max_length: 400,
  tone: 'professional',
  formatting: 'structured'
}
```

#### Modify Issue Detection
```typescript
// In extractMentionedIssues() function, add new issue types:
if (reviewLower.includes('parking') || reviewLower.includes('car')) {
  mentionedIssues.push('parking facilities')
}
```

#### Update Natural Language Patterns
```typescript
// Add new greeting variations:
greetings: [
  "Hello {name}",
  "Dear {name}",
  "Hi {name}",
  "Good day {name}",     // New addition
  "Thank you {name}"
]
```

## Testing Your Changes

### 1. Use the UI Test Button
1. Navigate to External Review Response Manager
2. Click "✨ Test Improved AI" button
3. Review the generated response

### 2. Create Test Reviews
```typescript
// Add test cases with different scenarios:
const testReview = {
  guest_name: 'Test Guest',
  rating: 2,
  review_text: 'Your test review text here',
  platform: 'tripadvisor',
  sentiment: 'negative'
}
```

### 3. Monitor Response Quality
Check for:
- ✅ Varied opening phrases
- ✅ Specific issue addressing
- ✅ Appropriate tone for rating
- ✅ Platform character limits
- ✅ Professional language

## Common Modifications

### 1. Adjust Response Creativity
```typescript
// In OPENAI_CONFIG:
temperature: 0.9,        // Higher = more creative (0.1-1.0)
presence_penalty: 0.4,   // Higher = more diverse language (0.0-2.0)
frequency_penalty: 0.3,  // Higher = less repetition (0.0-2.0)
```

### 2. Add Brand-Specific Language
```typescript
// In createHumanLikeResponsePrompt(), add brand voice:
Brand Voice: ${brand_voice}
Hotel Values: hospitality, excellence, guest satisfaction
Signature Phrases: "We're committed to your comfort", "Your experience matters"
```

### 3. Customize Contact Information
```typescript
// Modify contact details in the prompt:
contact_email: tenant.contact_email || 'guestrelations@eusbetthotel.com'
phone: tenant.phone || '+233 123 456 789'
```

### 4. Add Seasonal/Promotional Content
```typescript
// Add conditional content based on date/season:
const currentMonth = new Date().getMonth()
const seasonalMessage = currentMonth >= 11 || currentMonth <= 1 
  ? "We hope you'll consider visiting us during our festive season celebrations!"
  : "We'd love to welcome you back during your next visit to the region."
```

## Quality Assurance Checklist

When modifying prompts, ensure:

- [ ] Responses vary in opening phrases
- [ ] Specific issues are addressed
- [ ] Tone matches the review rating
- [ ] Character limits are respected
- [ ] Professional standards maintained
- [ ] Contact information included for negative reviews
- [ ] Brand voice consistency
- [ ] No robotic/corporate language
- [ ] Appropriate emotional response
- [ ] Clear call-to-action when needed

## File Dependencies

The prompt configuration file is used by:
1. `netlify/edge-functions/generate-external-review-response.ts` - Main edge function
2. `src/components/ExternalReviewResponseManager.tsx` - UI component
3. Test scripts and utilities

## Backup and Version Control

Before making changes:
1. Create a backup of the current configuration
2. Test changes thoroughly
3. Document modifications
4. Monitor response quality after deployment

## Support and Troubleshooting

If you encounter issues:
1. Check browser console for errors
2. Verify OpenAI API configuration
3. Test with simple review examples
4. Compare with working examples in the demo file

The configuration system is designed to be flexible and maintainable, allowing you to fine-tune the response generation without touching the core logic.
