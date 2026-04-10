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

  // Replace block-level tags with newlines to preserve paragraph structure.
  // TipTap outputs semantic HTML like <p>, <h1>, <li>, so converting these
  // to newlines maintains readability in the plain text output.
  text = text.replace(/<\/?(p|div|br|li|h[1-6])[^>]*>/gi, "\n");

  // Strip all remaining HTML tags (inline formatting like <strong>, <em>, etc.).
  // These don't affect semantic meaning for LLM consumption.
  text = text.replace(/<[^>]+>/g, "");

  // Decode common HTML entities to plain characters.
  // TipTap may encode these when users type special characters.
  text = text
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&nbsp;/g, " ")
    .replace(/&#39;/g, "'");

  // Normalize whitespace for cleaner LLM input:
  // - Collapse multiple consecutive newlines to max 2 (preserve paragraph breaks)
  // - Collapse runs of spaces/tabs to single space
  text = text
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]+/g, " ")
    .trim();

  return text;
}
