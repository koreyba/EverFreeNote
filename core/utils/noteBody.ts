/**
 * DOM-free check for whether a note body has copyable content.
 *
 * Lives in a dependency-light module (no DOMPurify/jsdom imports) so it is safe
 * to use from React Native, where the DOM-based sanitizer cannot run.
 */
export function isNoteBodyEmpty(html: string): boolean {
  const normalized = (html ?? '').trim()
  if (!normalized) return true
  if (/<img\b/i.test(normalized)) return false

  const text = normalized
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&#160;/g, ' ')
    .trim()

  return text.length === 0
}
