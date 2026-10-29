"use client"

import { cn } from "@ui/web/lib/utils"

type DeviceSyncStatusProps = Readonly<{
  isOffline: boolean
  pendingCount: number
  failedCount: number
}>

// Queue counts are device-wide and navigator.onLine does not prove that the
// server is reachable. Do not infer the sync state of an individual note.
export function describeDeviceSyncStatus({ isOffline, pendingCount, failedCount }: DeviceSyncStatusProps) {
  const parts: string[] = []
  if (isOffline) parts.push("Offline")
  if (failedCount > 0) parts.push(`${failedCount} failed`)
  if (pendingCount > 0) parts.push(`${pendingCount} waiting`)

  return {
    text: parts.join(" · ") || "Sync status",
    hasIssue: parts.length > 0,
    tone: failedCount > 0 ? "error" : isOffline ? "offline" : "neutral",
  } as const
}

export function DeviceSyncStatus(props: DeviceSyncStatusProps) {
  const status = describeDeviceSyncStatus(props)

  return (
    <div
      data-testid="device-sync-status"
      role="status"
      aria-live="polite"
      aria-atomic="true"
      className={cn(
        !status.hasIssue ? "sr-only" : "flex shrink-0 items-center gap-2 border-b px-3 py-1.5 text-xs font-medium leading-4",
        status.hasIssue && status.tone === "error" && "border-destructive/20 bg-destructive/5 text-destructive",
        status.hasIssue && status.tone === "offline" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
        status.hasIssue && status.tone === "neutral" && "border-border/60 bg-muted/40 text-foreground/80",
      )}
    >
      {status.hasIssue && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />}
      <span><span className="sr-only">Device-wide </span>{status.hasIssue ? `Sync: ${status.text}` : "No waiting or failed changes reported"}</span>
    </div>
  )
}
