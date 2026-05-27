import type { NoteCopyPayload } from '@core/services/noteCopy'

const CACHE_TTL_MS = 2 * 60 * 1000

type CachedNoteCopyPayload = {
  payload: NoteCopyPayload
  copiedAt: number
}

let lastNoteCopyPayload: CachedNoteCopyPayload | null = null

export function rememberMobileNoteCopyPayload(payload: NoteCopyPayload, now = Date.now()) {
  lastNoteCopyPayload = { payload, copiedAt: now }
}

export function getMatchingMobileNoteCopyPayload(nativeText: string, now = Date.now()): NoteCopyPayload | null {
  if (!lastNoteCopyPayload) return null
  if (now - lastNoteCopyPayload.copiedAt > CACHE_TTL_MS) return null

  const nativeComparable = normalizeClipboardText(nativeText)
  const cachedComparable = normalizeClipboardText(lastNoteCopyPayload.payload.text)
  if (!nativeComparable || nativeComparable !== cachedComparable) return null

  return lastNoteCopyPayload.payload
}

export function clearMobileNoteCopyPayload() {
  lastNoteCopyPayload = null
}

function normalizeClipboardText(text: string): string {
  return text.replace(/\s+/g, ' ').trim()
}
