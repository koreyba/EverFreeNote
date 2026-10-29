"use client"

import { cn } from "@ui/web/lib/utils"

type DeviceSyncStatusProps = Readonly<{
  isOffline: boolean
  pendingCount: number
  failedCount: number
  syncStateReady?: boolean
  storageReadError?: boolean
  legacyUnverifiedCount?: number
  unqueuedLocalCount?: number
  unavailableRemoteEdits?: boolean
  legacyClaimBlocked?: boolean
  onRetryLocalVerification?: () => void
  localCleanupCount?: number
  onRetryLocalDeletion?: () => void
}>

// Counts cover this account's local queue. navigator.onLine does not prove that
// the server is reachable, so do not infer an individual note's sync state.
export function describeDeviceSyncStatus({ isOffline, pendingCount, failedCount, syncStateReady = true, storageReadError = false, legacyUnverifiedCount = 0, unqueuedLocalCount = 0, unavailableRemoteEdits = false, legacyClaimBlocked = false, localCleanupCount = 0 }: DeviceSyncStatusProps) {
  const parts: string[] = []
  if (!syncStateReady) parts.push("Checking local data")
  if (storageReadError) parts.push("Local data could not be read")
  if (legacyUnverifiedCount > 0) parts.push("Some local data needs account verification")
  if (unqueuedLocalCount > 0) parts.push("Some local changes are not queued")
  if (unavailableRemoteEdits) parts.push("A local note is unavailable on the server")
  if (legacyClaimBlocked) parts.push("Could not safely retain a local note's account")
  if (localCleanupCount > 0) parts.push("Server accepted deletion; check local cleanup")
  if (isOffline) parts.push("Device: Offline")
  const queued: string[] = []
  if (failedCount > 0) queued.push(`${failedCount} failed`)
  if (pendingCount > 0) queued.push(`${pendingCount} waiting`)
  if (queued.length) parts.push(`This account on this device: ${queued.join(" · ")}`)

  return {
    text: parts.join(" · ") || "Sync status",
    hasIssue: parts.length > 0,
    tone: failedCount > 0 || storageReadError || unqueuedLocalCount > 0 || legacyClaimBlocked || localCleanupCount > 0 ? "error" : isOffline || legacyUnverifiedCount > 0 || unavailableRemoteEdits ? "offline" : "neutral",
  } as const
}

export function DeviceSyncStatus(props: DeviceSyncStatusProps) {
  const status = describeDeviceSyncStatus(props)

  return (
    <div
      data-testid="device-sync-status"
      className={cn(
        !status.hasIssue ? "sr-only" : "shrink-0 border-b px-3 py-1.5 text-xs font-medium leading-4",
        status.hasIssue && status.tone === "error" && "border-destructive/20 bg-destructive/5 text-destructive",
        status.hasIssue && status.tone === "offline" && "border-amber-200 bg-amber-50 text-amber-900 dark:border-amber-900 dark:bg-amber-950/30 dark:text-amber-200",
        status.hasIssue && status.tone === "neutral" && "border-border/60 bg-muted/40 text-foreground/80",
      )}
    >
      <div role="status" aria-live="polite" aria-atomic="true" className="flex items-center gap-2">
        {status.hasIssue && <span aria-hidden="true" className="h-2 w-2 shrink-0 rounded-full bg-current" />}
        <span>{status.hasIssue ? status.text : "This account on this device: No waiting or failed changes reported"}</span>
      </div>
      {(props.legacyUnverifiedCount || props.unqueuedLocalCount || props.unavailableRemoteEdits || props.storageReadError || props.legacyClaimBlocked || props.localCleanupCount) ? (
        <details className="mt-1">
          <summary className="cursor-pointer underline">What can I do?</summary>
          {Boolean(props.legacyUnverifiedCount) && <p className="mt-1">Sign in to the original account while online. Some older drafts cannot be verified automatically, so their contents stay hidden and remain on this device. Keep this site&apos;s data.</p>}
          {Boolean(props.unqueuedLocalCount) && <p className="mt-1">Open the local note and copy its contents before leaving. Its changes may not have been saved to the sync queue.</p>}
          {props.unavailableRemoteEdits && <p className="mt-1">Open the note and copy its contents into a new note to restore them.</p>}
          {props.storageReadError && <p className="mt-1">Keep this site&apos;s data and try again. Clearing browser data can remove local changes.</p>}
          {props.legacyClaimBlocked && <p className="mt-1">The local note was not sent. Keep this site&apos;s data, copy the note&apos;s contents and check device storage before trying again.</p>}
          {Boolean(props.localCleanupCount) && <p className="mt-1">The server accepted the deletion, but a local copy may remain on this device. Keep this page open and retry local cleanup after checking device storage. Changed or unsynced copies are kept; copy their contents before continuing.</p>}
          {Boolean(props.localCleanupCount) && props.onRetryLocalDeletion ? (
            <button type="button" data-testid="retry-local-cleanup" className="mt-2 underline" onClick={props.onRetryLocalDeletion}>Retry local cleanup</button>
          ) : null}
          {(props.legacyUnverifiedCount || props.storageReadError || props.legacyClaimBlocked) && props.onRetryLocalVerification ? (
            <button type="button" className="mt-2 underline" onClick={props.onRetryLocalVerification}>Check again</button>
          ) : null}
        </details>
      ) : null}
    </div>
  )
}
