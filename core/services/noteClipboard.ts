import {
  EVERFREENOTE_COPY_ATTRIBUTE,
  EVERFREENOTE_COPY_KIND,
} from '@core/services/noteCopy'
import { SanitizationService } from '@core/services/sanitizer'
import { isNoteBodyEmpty } from '@core/utils/noteBody'

export type NoteClipboardPayload = {
  /** Self-copy-marked rich HTML for `text/html` clipboard writes. */
  html: string
  /** Clean plain text for `text/plain` — line breaks only, never markdown. */
  text: string
}

// Block-level close tags whose boundaries become a newline in plain text.
const BLOCK_CLOSE_PATTERN = /<\/(p|div|li|h[1-6]|blockquote|pre|tr)\s*>/gi
const LINE_BREAK_PATTERN = /<\s*br\s*\/?>/gi
const IMAGE_TAG_PATTERN = /<img\b[^>]*>/gi

// A paragraph whose entire content is one <br> is our own blank-line marker
// (see markInteriorEmptyParagraphs below) — structurally it's still a single
// empty paragraph, so it must contribute exactly one newline. Left alone, the
// block-close substitution below would add a newline for the paragraph
// boundary *and* the <br>-to-newline substitution would add a second one for
// the same visual blank line. Strip the marker <br> back out first so only
// the paragraph boundary counts.
const BR_ONLY_PARAGRAPH_PATTERN = /<p([^<>]*)>\s*<br\s*\/?>\s*<\/p>/gi

// Attribute on a paragraph that insertMissingParagraphGaps() fabricated to
// represent a single-Enter boundary as a blank line for external paste
// targets (Telegram/Facebook don't preserve the editor's smaller CSS gap).
// Pasting that same HTML back into EverFreeNote itself must NOT treat the
// fabricated paragraph as a real blank line — that would permanently widen
// a single Enter into a genuine empty paragraph on every self-copy round
// trip. The self-copy paste path (core/services/smartPaste.ts) strips any
// paragraph carrying this marker back out before re-inserting into the
// editor, restoring the original single-Enter adjacency. Must be allowlisted
// in the 'editor-self-copy' sanitize profile to survive that far.
const GAP_MARKER_ATTRIBUTE = 'data-everfreenote-gap'
const GAP_MARKER_PARAGRAPH_PATTERN = new RegExp(
  `<p\\b[^<>]*\\b${GAP_MARKER_ATTRIBUTE}="1"[^<>]*>[\\s\\S]*?<\\/p>`,
  'gi',
)

// --- Blank-line preservation ------------------------------------------------
//
// A single Enter between paragraphs is only a ~20px CSS gap (.note-content p
// in globals.css), not a blank line — a real blank line (a second Enter, an
// actually-empty paragraph) measures ~68px, verified by comparison in the
// live app. Paste destinations don't see either gap: they only see the raw
// HTML/text, where a single-Enter paragraph boundary is just one line break
// and a same-looking-in-EverFreeNote gap can silently vanish. So every
// paragraph-to-paragraph boundary is normalized to represent one blank line
// on copy, matching how the note already looks in the editor — including
// direct paragraph-to-paragraph adjacency (single Enter), which gets a gap
// paragraph inserted. Existing blank lines are never collapsed: N empty
// paragraphs in a row stay N empty paragraphs (if a paste destination
// collapses multiple blank lines itself, that's out of our control).
//
// Scoped to <p> only (not headings/lists/etc.) — that covers what's been
// verified; other block types can be added if they turn out to need it too.
const P_BLOCK_PATTERN = /<p(?:\s+[^<>]*)?>[\s\S]*?<\/p>/gi
const EMPTY_P_BLOCK_PATTERN = /^<p(?:\s+[^<>]*)?>(?:\s|<br\s*\/?>)*<\/p>$/i

function isEmptyParagraphBlock(block: string): boolean {
  return EMPTY_P_BLOCK_PATTERN.test(block)
}

// Walks the top-level <p> blocks and inserts a bare <p></p> between any pair
// of directly-adjacent non-empty paragraphs (single Enter). Pre-existing
// paragraphs — empty or not — are left completely untouched, so this never
// collapses an existing run of blank lines.
//
// "Directly adjacent" means adjacent in the HTML string itself (nothing but
// possibly whitespace between the two <p> tags), not just next to each other
// in the list of matched blocks — a <p> right before a list and the <p>
// inside that list's first <li> are next to each other in match order too,
// but <ol><li> sits between them, so they are not a single-Enter paragraph
// boundary and must not get a gap inserted between them.
function insertMissingParagraphGaps(html: string): string {
  const blocks = Array.from(html.matchAll(P_BLOCK_PATTERN))
  if (blocks.length < 2) return html

  let result = ''
  let cursor = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    result += html.slice(cursor, block.index)

    const previous = i > 0 ? blocks[i - 1] : null
    const isDirectlyAdjacent =
      previous !== null && html.slice(previous.index + previous[0].length, block.index).trim() === ''
    const isContent = !isEmptyParagraphBlock(block[0])
    const previousWasContent = isDirectlyAdjacent && !isEmptyParagraphBlock(previous[0])
    if (isContent && previousWasContent) {
      result += `<p ${GAP_MARKER_ATTRIBUTE}="1"></p>`
    }
    result += block[0]
    cursor = block.index + block[0].length
  }
  return result + html.slice(cursor)
}

// Marks every INTERIOR empty paragraph (pre-existing or just inserted above)
// with a literal <br>. Verified against real client source (Telegram
// Desktop's HTML-to-text tokenizer, desktop-app/lib_ui ui/text/text_html_tags.cpp):
// consecutive paragraph-boundary newlines are deliberately deduplicated down
// to one ("Structural" line breaks, repeat=false), but a literal <br> is a
// "Visible" line break (repeat=true) that is never deduplicated — an
// invisible marker (nbsp, zero-width space) doesn't survive that dedup, a
// real <br> does.
//
// A leading or trailing empty paragraph (e.g. the cursor's resting spot
// after the user's last Enter) isn't separating anything, so it's left
// as-is rather than marked.
function markInteriorEmptyParagraphs(html: string): string {
  const blocks = Array.from(html.matchAll(P_BLOCK_PATTERN))
  if (blocks.length < 2) return html

  let result = ''
  let cursor = 0
  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]
    result += html.slice(cursor, block.index)

    const isInterior = i > 0 && i < blocks.length - 1
    if (isInterior && isEmptyParagraphBlock(block[0])) {
      result += block[0].replace(/>[\s\S]*<\//, '><br></')
    } else {
      result += block[0]
    }
    cursor = block.index + block[0].length
  }
  return result + html.slice(cursor)
}

// SanitizationService.stripHtml() only removes tags — entities in the remaining
// text (e.g. ones already present in pasted-from-elsewhere note content) are
// left encoded. Decode the common ones so plain text never shows a literal
// "&nbsp;"/"&amp;" instead of the character it represents.
const HTML_ENTITY_PATTERN = /&(nbsp|#160|#xA0|amp|lt|gt|quot|apos|#39);/gi
const HTML_ENTITY_DECODE_MAP: Record<string, string> = {
  nbsp: ' ', '#160': ' ', '#xa0': ' ',
  amp: '&', lt: '<', gt: '>', quot: '"', apos: '\'', '#39': '\'',
}

/**
 * Builds the EverFreeNote clipboard payload from note body (or selection) HTML.
 *
 * - `html` is sanitized with the editor self-copy profile and wrapped in the
 *   EverFreeNote self-copy marker so paste back into EverFreeNote restores
 *   supported formatting with zero loss, while external apps ignore the marker.
 * - `text` is a clean plain-text degradation (block boundaries become newlines,
 *   links degrade to their visible text); it never emits markdown markers.
 */
export const NoteClipboardService = {
  buildPayload(bodyHtml: string): NoteClipboardPayload {
    if (isNoteBodyEmpty(bodyHtml)) {
      return { html: '', text: '' }
    }

    const sanitized = SanitizationService.sanitize(bodyHtml.trim(), { profile: 'editor-self-copy' })
    const withGaps = insertMissingParagraphGaps(sanitized)
    const withBlankLinesMarked = markInteriorEmptyParagraphs(withGaps)
    const html = `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}">${withBlankLinesMarked}</div>`
    const text = NoteClipboardService.htmlToPlainText(withGaps)
    return { html, text }
  },

  /** True when the note body has no copyable content (no text and no images). */
  isBodyEmpty(html: string): boolean {
    return isNoteBodyEmpty(html)
  },

  /**
   * Removes paragraphs buildPayload() fabricated to widen a single-Enter
   * boundary into a blank line for external paste targets. Used on the
   * self-copy paste path so pasting back into EverFreeNote restores the
   * original single-Enter adjacency instead of permanently turning it into
   * a real empty paragraph. Pre-existing blank lines (no marker) are
   * untouched and still round-trip as real blank lines.
   */
  stripFabricatedGaps(html: string): string {
    if (!html) return html
    return html.replace(GAP_MARKER_PARAGRAPH_PATTERN, '')
  },

  htmlToPlainText(html: string): string {
    if (!html) return ''

    // Degrade images to their alt text (or a placeholder) so image-only notes
    // produce a non-empty plain-text payload instead of an empty clipboard.
    const withImages = html.replace(IMAGE_TAG_PATTERN, (tag) => {
      const altMatch = /\balt\s*=\s*(?:"([^"]*)"|'([^']*)')/i.exec(tag)
      const alt = (altMatch?.[1] ?? altMatch?.[2] ?? '').trim()
      return alt || '[image]'
    })

    // Insert newline boundaries before stripping tags so block structure survives
    // as line breaks (no markdown markers for lists/checkboxes/links).
    const withBreaks = withImages
      .replace(BR_ONLY_PARAGRAPH_PATTERN, '<p$1></p>')
      .replace(LINE_BREAK_PATTERN, '\n')
      .replace(BLOCK_CLOSE_PATTERN, '$&\n')

    const text = SanitizationService.stripHtml(withBreaks)
      .replace(HTML_ENTITY_PATTERN, (match, name: string) => HTML_ENTITY_DECODE_MAP[name.toLowerCase()] ?? match)

    // No collapsing of 3+ consecutive newlines here: each blank line the note
    // already has (one per empty paragraph) must survive as its own newline,
    // not get flattened together with its neighbors.
    return text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .trim()
  },
}
