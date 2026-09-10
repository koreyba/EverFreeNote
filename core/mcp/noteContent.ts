// Plain-text helpers for note bodies. Output-only: the result is shown to AI
// agents, never rendered as HTML, so a lightweight tag stripper is sufficient.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

const MAX_CODE_POINT = 0x10ffff

function decodeEntities(text: string): string {
  return text.replace(/&(#x[0-9a-f]+|#\d+|[a-z]+);/gi, (match, entity: string) => {
    if (entity.startsWith('#')) {
      const isHex = entity[1] === 'x' || entity[1] === 'X'
      const codePoint = isHex ? Number.parseInt(entity.slice(2), 16) : Number.parseInt(entity.slice(1), 10)
      if (!Number.isFinite(codePoint) || codePoint < 0 || codePoint > MAX_CODE_POINT) return match
      try {
        return String.fromCodePoint(codePoint)
      } catch {
        return match
      }
    }

    return NAMED_ENTITIES[entity.toLowerCase()] ?? match
  })
}

/**
 * Converts editor HTML into readable plain text: block boundaries become line
 * breaks, list items get a bullet, tags and scripts are removed, entities are
 * decoded and whitespace is collapsed.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''

  const withoutScripts = html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1\s*>/gi, '')
  const withBreaks = withoutScripts
    .replace(/<li\b[^>]*>/gi, '\n• ')
    .replace(/<\/(p|div|h[1-6]|li|blockquote|pre|tr|table|ul|ol)\s*>/gi, '\n')
    .replace(/<(br|hr)\b[^>]*\/?>/gi, '\n')
  const withoutTags = withBreaks.replace(/<[^>]+>/g, '')

  return decodeEntities(withoutTags)
    .replace(/[ \t\f\v\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

/** Single-line excerpt of a note body, truncated with an ellipsis. */
export function buildExcerpt(html: string | null | undefined, maxLength = 200): string {
  const singleLine = htmlToPlainText(html).replace(/\s*\n\s*/g, ' ').trim()
  if (singleLine.length <= maxLength) return singleLine

  const cut = Math.max(1, maxLength - 1)
  return `${singleLine.slice(0, cut).trimEnd()}…`
}
