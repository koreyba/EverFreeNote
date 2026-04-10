/**
 * Strip HTML tags and convert to plain text for LLM consumption.
 * Uses a simple regex-based approach since we're in Node.js (no DOM).
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== 'string') {
    return ''
  }

  let text = html

  // Replace block-level tags with newlines
  text = text.replace(/<\/?(p|div|br|li|h[1-6])[^>]*>/gi, '\n')

  // Strip all remaining HTML tags
  text = text.replace(/<[^>]+>/g, '')

  // Decode common HTML entities
  text = text
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, ' ')
    .replace(/&#39;/g, "'")

  // Normalize whitespace
  text = text
    .replace(/\n{3,}/g, '\n\n') // Max 2 consecutive newlines
    .replace(/[ \t]+/g, ' ')    // Collapse spaces
    .trim()

  return text
}
