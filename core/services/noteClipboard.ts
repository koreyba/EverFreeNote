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
// Many paste destinations (Telegram/Facebook web compose, among others) strip
// fully-empty block elements before turning paragraph boundaries into line
// breaks, silently eating a blank line between paragraphs. A non-breaking
// space keeps the paragraph non-empty for that pass while staying invisible
// and whitespace-equivalent everywhere else (isNoteBodyEmpty already treats it
// as empty, and it round-trips back into EverFreeNote as a blank line too).
const EMPTY_PARAGRAPH_PATTERN = /<p((?:\s+[^<>]*)?)>(?:\s|<br\s*\/?>)*<\/p>/gi
// SanitizationService.stripHtml() only removes tags — entities in the remaining
// text (e.g. the &nbsp; markers above, or ones already present in pasted-from-
// elsewhere note content) are left encoded. Decode the common ones so plain text
// never shows a literal "&nbsp;"/"&amp;" instead of the character it represents.
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
    const withBlankLinesPreserved = sanitized.replace(EMPTY_PARAGRAPH_PATTERN, '<p$1>&nbsp;</p>')
    const html = `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}">${withBlankLinesPreserved}</div>`
    const text = NoteClipboardService.htmlToPlainText(sanitized)
    return { html, text }
  },

  /** True when the note body has no copyable content (no text and no images). */
  isBodyEmpty(html: string): boolean {
    return isNoteBodyEmpty(html)
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
      .replace(LINE_BREAK_PATTERN, '\n')
      .replace(BLOCK_CLOSE_PATTERN, '$&\n')

    const text = SanitizationService.stripHtml(withBreaks)
      .replace(HTML_ENTITY_PATTERN, (match, name: string) => HTML_ENTITY_DECODE_MAP[name.toLowerCase()] ?? match)

    return text
      .replace(/\r\n?/g, '\n')
      .split('\n')
      .map((line) => line.trimEnd())
      .join('\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  },
}
