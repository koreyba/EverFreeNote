import type { MutationQueueItem } from '../types/offline'

/** Place a later local mutation after every known queued write for its notes. */
export function nextMutationTimestamp(queue: MutationQueueItem[], noteIds: Set<string>): string {
  let latest = Date.now() - 1
  for (const item of queue) {
    if (!noteIds.has(item.noteId)) continue
    const timestamp = Date.parse(item.clientUpdatedAt)
    if (Number.isFinite(timestamp)) latest = Math.max(latest, timestamp)
  }
  return new Date(latest + 1).toISOString()
}
