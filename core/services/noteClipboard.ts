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
    const normalized = (bodyHtml ?? '').trim()
    if (!normalized) {
      return { html: '', text: '' }
    }

    const sanitized = SanitizationService.sanitize(normalized, { profile: 'editor-self-copy' })
    const html = `<div ${EVERFREENOTE_COPY_ATTRIBUTE}="${EVERFREENOTE_COPY_KIND}">${sanitized}</div>`
    const text = NoteClipboardService.htmlToPlainText(sanitized)
    return { html, text }
  },

  /** True when the note body has no copyable content (no text and no images). */
  isBodyEmpty(html: string): boolean {
    return isNoteBodyEmpty(html)
  },

  htmlToPlainText(html: string): string {
    if (!html) return ''

    // Insert newline boundaries before stripping tags so block structure survives
    // as line breaks (no markdown markers for lists/checkboxes/links).
    const withBreaks = html
      .replace(LINE_BREAK_PATTERN, '\n')
      .replace(BLOCK_CLOSE_PATTERN, '$&\n')

    const text = SanitizationService.stripHtml(withBreaks)

    return text
      .replace(/\r\n?/g, '\n')
      .replace(/[ \t]+\n/g, '\n')
      .replace(/\n{3,}/g, '\n\n')
      .trim()
  },
}
