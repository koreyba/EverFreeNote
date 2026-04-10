/**
 * Strip HTML tags and convert to plain text for LLM consumption.
 * Uses a regex-based approach since we're in Node.js without DOM APIs.
 * Handles TipTap editor HTML output, which is semantic and well-formed.
 */
export function stripHtml(html: string): string {
  if (!html || typeof html !== "string") {
    return "";
  }

  let text = html;

  // Replace block-level tags with newlines to preserve paragraph structure
  text = text.replace(/<\/?(p|div|br|li|h[1-6])[^>]*>/gi, "\n");

  // Strip all remaining HTML tags (inline formatting, etc.)
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities to plain characters
  // TipTap may encode these when users type special characters
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'");

  // Normalize whitespace for cleaner LLM input
  text = text
    .replace(/\n{3,}/g, "\n\n") // Max 2 consecutive newlines
    .replace(/[ \t]+/g, " ") // Collapse horizontal whitespace
    .trim();

  return text;
}
