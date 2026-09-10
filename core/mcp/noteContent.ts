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

/** Index just past the closing tag of a skipped element, or -1 when it never closes. */
function findSkippedElementEnd(html: string, lowerHtml: string, name: string, from: number): number {
  const closeStart = lowerHtml.indexOf(`</${name}`, from)
  if (closeStart === -1) return -1

  const closeEnd = html.indexOf('>', closeStart)
  return closeEnd === -1 ? -1 : closeEnd + 1
}

/** The plain-text separator a tag contributes: a bullet for list items, a line break for blocks. */
function separatorForTag(name: string, closing: boolean): string {
  if (!closing && name === 'li') return '\n• '
  if (LINE_BREAK_TAGS.has(name)) return '\n'
  if (closing && BLOCK_TAGS.has(name)) return '\n'
  return ''
}

/**
 * Walks the markup once, dropping every tag, skipping script/style content and
 * emitting line breaks for block boundaries (list items get a bullet).
 */
function stripMarkup(html: string): string {
  const lowerHtml = html.toLowerCase()
  let output = ''
  let index = 0

  while (index < html.length) {
    const tagStart = html.indexOf('<', index)
    if (tagStart === -1) {
      output += html.slice(index)
      break
    }

    output += html.slice(index, tagStart)

    const tagEnd = html.indexOf('>', tagStart + 1)
    if (tagEnd === -1) break // unterminated tag: drop the rest

    const { name, closing } = readTagName(html.slice(tagStart + 1, tagEnd))

    if (!closing && SKIPPED_ELEMENTS.has(name)) {
      const resumeAt = findSkippedElementEnd(html, lowerHtml, name, tagEnd + 1)
      if (resumeAt === -1) break
      index = resumeAt
      continue
    }

    output += separatorForTag(name, closing)
    index = tagEnd + 1
  }

  return output
}

const HORIZONTAL_WHITESPACE = new Set([' ', '\t', '\f', '\v', '\u00a0'])

/**
 * Collapses runs of horizontal whitespace into a single space, reduces any
 * whitespace around a line break to one `\n`, and trims both ends. Written as a
 * single pass because the equivalent regexes backtrack super-linearly.
 */
function collapseWhitespace(text: string): string {
  let output = ''
  let pendingSpace = false
  let pendingBreak = false

  for (const char of text) {
    if (char === '\n' || char === '\r') {
      pendingBreak = true
      pendingSpace = false
      continue
    }

    if (HORIZONTAL_WHITESPACE.has(char)) {
      pendingSpace = true
      continue
    }

    if (output.length > 0) {
      if (pendingBreak) output += '\n'
      else if (pendingSpace) output += ' '
    }

    pendingBreak = false
    pendingSpace = false
    output += char
  }

  return output
}

/**
 * Converts editor markup into readable plain text: block boundaries become
 * line breaks, list items get a bullet, tags and scripts are removed,
 * entities are decoded and whitespace is collapsed.
 */
export function htmlToPlainText(html: string | null | undefined): string {
  if (!html) return ''

  return collapseWhitespace(decodeEntities(stripMarkup(html)))
}

/** Single-line excerpt of a note body, truncated with an ellipsis. */
export function buildExcerpt(html: string | null | undefined, maxLength = 200): string {
  const singleLine = htmlToPlainText(html).split('\n').join(' ')
  if (singleLine.length <= maxLength) return singleLine

  const cut = Math.max(1, maxLength - 1)
  return `${singleLine.slice(0, cut).trimEnd()}…`
}
