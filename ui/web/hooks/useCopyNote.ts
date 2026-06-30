"use client"

import * as React from "react"
import { toast } from "sonner"
import { NoteClipboardService } from "@core/services/noteClipboard"
import { copyNotePayloadToClipboard } from "@ui/web/lib/noteClipboard"

const CONFIRMATION_MS = 1000

/**
 * Drives the note Copy action: builds the dual html/plain payload, writes it to
 * the clipboard, and exposes a brief (~1s) on-button confirmation state.
 * Success shows the on-button confirmation (no toast); failure shows an error toast.
 */
export function useCopyNote() {
  const [copied, setCopied] = React.useState(false)
  const timerRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  React.useEffect(() => () => {
    if (timerRef.current) clearTimeout(timerRef.current)
  }, [])

  const copyNote = React.useCallback(async (bodyHtml: string) => {
    const payload = NoteClipboardService.buildPayload(bodyHtml)
    if (!payload.html) return

    try {
      await copyNotePayloadToClipboard(payload)
      setCopied(true)
      if (timerRef.current) clearTimeout(timerRef.current)
      timerRef.current = setTimeout(() => setCopied(false), CONFIRMATION_MS)
    } catch {
      toast.error("Failed to copy note")
    }
  }, [])

  return { copied, copyNote }
}
