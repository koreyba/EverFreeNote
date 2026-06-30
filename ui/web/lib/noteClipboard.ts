import type { NoteClipboardPayload } from '@core/services/noteClipboard'

/**
 * Writes the note clipboard payload using the async Clipboard API, putting both
 * `text/html` (rich) and `text/plain` on the clipboard so rich targets keep
 * formatting and plain targets get clean text. Falls back to `writeText(plain)`
 * when rich writes are unavailable or rejected at runtime.
 *
 * Throws when the clipboard is entirely unavailable or every write fails, so the
 * caller can surface an error.
 */
export async function copyNotePayloadToClipboard(payload: NoteClipboardPayload): Promise<void> {
  const clipboard = globalThis.navigator?.clipboard
  if (!clipboard) {
    throw new Error('Clipboard API unavailable')
  }

  if (typeof globalThis.ClipboardItem !== 'undefined' && typeof clipboard.write === 'function') {
    try {
      await clipboard.write([
        new ClipboardItem({
          'text/html': new Blob([payload.html], { type: 'text/html' }),
          'text/plain': new Blob([payload.text], { type: 'text/plain' }),
        }),
      ])
      return
    } catch {
      // Some browsers expose the rich clipboard API but reject text/html writes
      // at runtime — fall through to the plain-text path.
    }
  }

  await clipboard.writeText(payload.text)
}
