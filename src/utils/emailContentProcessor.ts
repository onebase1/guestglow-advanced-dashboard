/**
 * Professional Email Content Processing Utility
 * For GuestGlow $50K System - Production Grade
 * 
 * Handles AI response sanitization, markdown cleanup, and HTML processing
 */

export interface ProcessedEmailContent {
  html: string;
  plainText: string;
  isValid: boolean;
  warnings: string[];
}

/**
 * Comprehensive email content processor that handles:
 * - Markdown code block removal (```html, ```text, etc.)
 * - HTML sanitization and validation
 * - Plain text extraction
 * - Professional formatting
 */
export function processEmailContent(rawContent: string): ProcessedEmailContent {
  const warnings: string[] = [];
  
  if (!rawContent || typeof rawContent !== 'string') {
    return {
      html: '<p>No content available</p>',
      plainText: 'No content available',
      isValid: false,
      warnings: ['Empty or invalid content provided']
    };
  }

  // Step 1: Remove markdown code blocks (```html, ```text, ```, etc.)
  let cleanContent = rawContent;
  
  // Remove code blocks with language specifiers
  cleanContent = cleanContent.replace(/```(?:html|text|markdown|md)?\s*\n?([\s\S]*?)\n?```/gi, '$1');
  
  // Remove any remaining triple backticks
  cleanContent = cleanContent.replace(/```/g, '');
  
  // Log if we found markdown formatting (for monitoring)
  if (rawContent.includes('```')) {
    warnings.push('Removed markdown code block formatting');
  }

  // Step 2: Clean up common AI artifacts
  cleanContent = cleanContent
    // Remove AI instruction artifacts
    .replace(/^(Here's|Here is|Below is).*?:/gi, '')
    // Remove "Subject:" lines that sometimes appear
    .replace(/^Subject:\s*.*/gim, '')
    // Clean up excessive whitespace
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();

  // Step 3: Determine if content is HTML or plain text
  const isHtmlContent = /<[^>]+>/.test(cleanContent);
  
  let html: string;
  let plainText: string;

  if (isHtmlContent) {
    // Content appears to be HTML
    html = sanitizeHtml(cleanContent);
    plainText = htmlToPlainText(html);
  } else {
    // Content is plain text - convert to HTML
    plainText = cleanContent;
    html = plainTextToHtml(cleanContent);
  }

  // Step 4: Validate final content
  const isValid = html.length > 0 && plainText.length > 0;
  
  if (!isValid) {
    warnings.push('Content validation failed');
  }

  return {
    html,
    plainText,
    isValid,
    warnings
  };
}

/**
 * Sanitize HTML content for email safety
 */
function sanitizeHtml(html: string): string {
  return html
    // Remove potentially dangerous tags
    .replace(/<script[^>]*>.*?<\/script>/gis, '')
    .replace(/<style[^>]*>.*?<\/style>/gis, '')
    .replace(/<link[^>]*>/gi, '')
    // Clean up malformed HTML
    .replace(/<br\s*\/?>/gi, '<br>')
    .replace(/&nbsp;/g, ' ')
    // Ensure proper paragraph structure
    .replace(/\n\n/g, '</p><p>')
    // Wrap in proper structure if not already wrapped
    .replace(/^(?!<)/, '<p>')
    .replace(/(?!>)$/, '</p>')
    // Clean up empty paragraphs
    .replace(/<p>\s*<\/p>/g, '')
    .trim();
}

/**
 * Convert HTML to clean plain text
 */
function htmlToPlainText(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\n\s*\n\s*\n/g, '\n\n')
    .trim();
}

/**
 * Convert plain text to professional HTML
 */
function plainTextToHtml(text: string): string {
  return text
    .split('\n\n')
    .map(paragraph => paragraph.trim())
    .filter(paragraph => paragraph.length > 0)
    .map(paragraph => `<p>${paragraph.replace(/\n/g, '<br>')}</p>`)
    .join('');
}

/**
 * Wrapper for email HTML content with professional styling
 */
export function wrapEmailHtml(content: string, hotelName: string = 'Eusbett Hotel'): string {
  return `
    <div style="font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; line-height: 1.6; color: #333; max-width: 600px;">
      ${content}
      <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #eee; font-size: 14px; color: #666;">
        <p style="margin: 0;">
          Best regards,<br>
          <strong>The ${hotelName} Guest Relations Team</strong>
        </p>
      </div>
    </div>
  `.trim();
}

/**
 * Quick utility for legacy code - just removes markdown formatting
 * @deprecated Use processEmailContent() for new implementations
 */
export function stripMarkdownFormatting(content: string): string {
  if (!content) return '';
  
  return content
    .replace(/```(?:html|text|markdown|md)?\s*\n?([\s\S]*?)\n?```/gi, '$1')
    .replace(/```/g, '')
    .trim();
}
