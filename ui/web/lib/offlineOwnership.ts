import type { Note } from '@core/types/domain'
import type { CachedNote, MutationQueueItem } from '@core/types/offline'

export function queueOwners(item: MutationQueueItem): string[] {
  return [item.payload.user_id, (item.payload as { userId?: string }).userId]
    .filter((value): value is string => Boolean(value))
}

// Tying a session-only verification to the entire snapshot prevents a later
// local edit from inheriting stale ownership evidence.
export const snapshotEvidence = (note: CachedNote): string => JSON.stringify(note)

export function isMatchingLegacySnapshot(local: CachedNote, remote: Note, ownerId: string): boolean {
  if (local.user_id || local.deleted || !local.created_at || !remote.created_at || remote.user_id !== ownerId) return false
  const localCreated = Date.parse(local.created_at)
  const remoteCreated = Date.parse(remote.created_at)
  return Number.isFinite(localCreated) && localCreated === remoteCreated &&
    local.id === remote.id && typeof local.title === 'string' && typeof local.description === 'string' &&
    Array.isArray(local.tags) && local.title === remote.title && local.description === remote.description &&
    JSON.stringify(local.tags) === JSON.stringify(remote.tags)
}

const groupedOwners = (queue: MutationQueueItem[]): Map<string, Set<string>> => {
  const groups = new Map<string, Set<string>>()
  for (const item of queue) {
    const owners = groups.get(item.noteId) ?? new Set<string>()
    queueOwners(item).forEach(owner => owners.add(owner))
    groups.set(item.noteId, owners)
  }
  return groups
}

export const matchesQueuedSnapshot = (note: CachedNote, item: MutationQueueItem): boolean => {
  const snapshotTime = Date.parse(note.updatedAt)
  const operationTime = Date.parse(item.clientUpdatedAt)
  return item.operation !== 'delete' && Number.isFinite(snapshotTime) && snapshotTime === operationTime &&
    typeof note.title === 'string' && typeof note.description === 'string' && Array.isArray(note.tags) &&
    item.payload.title === note.title && item.payload.description === note.description &&
    JSON.stringify(item.payload.tags) === JSON.stringify(note.tags)
}

const hasOwnedSnapshot = (note: CachedNote, queue: MutationQueueItem[], userId: string): boolean => (
  queue.some(item => item.noteId === note.id && queueOwners(item).includes(userId) && matchesQueuedSnapshot(note, item))
)

export function visibleLegacyNoteIds(
  cached: CachedNote[], queue: MutationQueueItem[], userId: string | undefined, evidence: ReadonlyMap<string, string>,
): Set<string> {
  if (!userId) return new Set()
  const owners = groupedOwners(queue)
  return new Set(cached.filter(note => {
    if (note.user_id) return false
    const group = owners.get(note.id)
    if ([...(group ?? [])].some(owner => owner !== userId)) return false
    return hasOwnedSnapshot(note, queue, userId) || evidence.get(note.id) === snapshotEvidence(note)
  }).map(note => note.id))
}

export function queueForOwner(
  queue: MutationQueueItem[], cached: CachedNote[], userId: string | undefined, evidence: ReadonlyMap<string, string> = new Map(),
): MutationQueueItem[] {
  if (!userId) return []
  const notes = new Map(cached.map(note => [note.id, note]))
  const owners = groupedOwners(queue)
  return queue.filter(item => {
    const note = notes.get(item.noteId)
    const group = owners.get(item.noteId)
    if ([...(group ?? [])].some(owner => owner !== userId) || (note?.user_id && note.user_id !== userId)) return false
    if (note?.user_id === userId || queueOwners(item).includes(userId)) return true
    // A matching cached/server snapshot proves no different queued update.
    // Only a no-op update with matching complete fields is safe to attribute.
    if (!note || item.operation !== 'update' || !matchesQueuedSnapshot(note, item)) return false
    return evidence.get(note.id) === snapshotEvidence(note) || hasOwnedSnapshot(note, queue, userId)
  })
}

export function countUnverifiedNotes(
  queue: MutationQueueItem[], cached: CachedNote[], userId: string | undefined, evidence: ReadonlyMap<string, string>,
): number {
  if (!userId) return 0
  const visible = visibleLegacyNoteIds(cached, queue, userId, evidence)
  const allowed = new Set(queueForOwner(queue, cached, userId, evidence).map(item => item.id))
  const owners = groupedOwners(queue)
  const byId = new Map(cached.map(note => [note.id, note]))
  const isForeign = (id: string) => {
    const owner = byId.get(id)?.user_id
    const group = owners.get(id)
    return Boolean((owner && owner !== userId) || (group?.size && !group.has(userId)))
  }
  const ids = new Set(cached.filter(note => !note.user_id && !visible.has(note.id) && !isForeign(note.id)).map(note => note.id))
  for (const item of queue) if (!allowed.has(item.id) && !isForeign(item.noteId)) ids.add(item.noteId)
  return ids.size
}
