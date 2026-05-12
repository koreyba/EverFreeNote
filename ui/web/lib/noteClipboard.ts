import type { NoteCopyPayload } from '@core/services/noteCopy'

export async function copyNotePayloadToClipboard(payload: NoteCopyPayload): Promise<void> {
  if (!globalThis.navigator?.clipboard) {
    throw new Error('Clipboard API unavailable')
  }

  if (
    globalThis.ClipboardItem !== undefined &&
    typeof globalThis.navigator.clipboard.write === 'function'
  ) {
    try {
      await globalThis.navigator.clipboard.write([
        new globalThis.ClipboardItem({
          'text/html': new Blob([payload.html], { type: 'text/html' }),
          'text/plain': new Blob([payload.text], { type: 'text/plain' }),
        }),
      ])
      return
    } catch {
      // Some browsers expose rich clipboard APIs but reject HTML writes at runtime.
    }
  }

  await globalThis.navigator.clipboard.writeText(payload.text)
}
