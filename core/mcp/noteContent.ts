// Plain-text helpers for note bodies. Output-only: the result is shown to AI
// agents, never rendered as HTML, so a small markup scanner is sufficient.

const NAMED_ENTITIES: Record<string, string> = {
  amp: '&',
  lt: '<',
  gt: '>',
  quot: '"',
  apos: "'",
  nbsp: ' ',
}

const MAX_CODE_POINT = 0x10ffff

/** Closing tags that end a block: a line break is emitted in their place. */
const BLOCK_TAGS = new Set(['p', 'div', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'li', 'blockquote', 'pre', 'tr', 'table', 'ul', 'ol'])
const LINE_BREAK_TAGS = new Set(['br', 'hr'])
/** Elements whose text content is never note text. */
const SKIPPED_ELEMENTS = new Set(['script', 'style'])

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

function readTagName(tagBody: string): { name: string; closing: boolean } {
  const closing = tagBody.startsWith('/')
  const rest = closing ? tagBody.slice(1) : tagBody
  let end = 0
  while (end < rest.length && /[a-zA-Z0-9]/.test(rest[end])) end++
  return { name: rest.slice(0, end).toLowerCase(), closing }
}

/**
 * Walks the markup once, dropping every tag, skipping script/style content and
 * emitting line breaks for block boundaries (list items get a bullet).
 */
function stripMarkup(source: string): string {
  const lower = source.toLowerCase()
  let output = ''
  let index = 0

  while (index < source.length) {
    const char = source[index]
    if (char !== '<') {
      output += char
      index += 1
      continue
    }

    const tagEnd = source.indexOf('>', index + 1)
    if (tagEnd === -1) break // unterminated tag: drop the rest

    const { name, closing } = readTagName(source.slice(index + 1, tagEnd))

    if (!closing && SKIPPED_ELEMENTS.has(name)) {
      const closeStart = lower.indexOf(`</${name}`, tagEnd + 1)
      if (closeStart === -1) break
      const closeEnd = source.indexOf('>', closeStart)
      if (closeEnd === -1) break
      index = closeEnd + 1
      continue
    }

    if (!closing && name === 'li') {
      output += '\n• '
    } else if (LINE_BREAK_TAGS.has(name) || (closing && BLOCK_TAGS.has(name))) {
      output += '\n'
    }

    index = tagEnd + 1
  }

  return output
}

/**
 * Converts editor markup into readable plain text: block boundaries become
 * line breaks, list items get a bullet, tags and scripts are removed,
 * entities are decoded and whitespace is collapsed.
 */
export function htmlToPlainText(source: string | null | undefined): string {
  if (!source) return ''

  return decodeEntities(stripMarkup(source))
    .replace(/[ \t\f\v\u00a0]+/g, ' ')
    .replace(/\s*\n\s*/g, '\n')
    .trim()
}

/** Single-line excerpt of a note body, truncated with an ellipsis. */
export function buildExcerpt(source: string | null | undefined, maxLength = 200): string {
  const singleLine = htmlToPlainText(source).replace(/\s*\n\s*/g, ' ').trim()
  if (singleLine.length <= maxLength) return singleLine

  const cut = Math.max(1, maxLength - 1)
  return `${singleLine.slice(0, cut).trimEnd()}…`
}
