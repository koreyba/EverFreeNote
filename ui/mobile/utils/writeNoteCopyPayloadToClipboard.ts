import * as Clipboard from 'expo-clipboard'
import type { NoteCopyPayload } from '@core/services/noteCopy'

const logCopyFailure = (
  stage: 'html' | 'plainTextFormatted' | 'plainTextLegacy',
  error: unknown,
) => {
  const name = error instanceof Error ? error.name : typeof error
  const message = error instanceof Error ? error.message : String(error)
  console.error(`[NoteCopy] ${stage} copy failed`, { name, message })
}

export async function writeNoteCopyPayloadToClipboard(payload: NoteCopyPayload): Promise<void> {
  try {
    await Clipboard.setStringAsync(payload.html, { inputFormat: Clipboard.StringFormat.HTML })
  } catch (htmlError) {
    logCopyFailure('html', htmlError)
    try {
      await Clipboard.setStringAsync(payload.text, { inputFormat: Clipboard.StringFormat.PLAIN_TEXT })
    } catch (formattedPlainTextError) {
      logCopyFailure('plainTextFormatted', formattedPlainTextError)
      try {
        await Clipboard.setStringAsync(payload.text)
      } catch (legacyPlainTextError) {
        logCopyFailure('plainTextLegacy', legacyPlainTextError)
        throw legacyPlainTextError
      }
    }
  }
}
