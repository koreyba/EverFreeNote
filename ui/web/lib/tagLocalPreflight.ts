import type { CachedNote, MutationQueueItem } from '@core/types/offline'
import { matchesQueuedSnapshot, queueOwners } from '@ui/web/lib/offlineOwnership'

const unverifiedChangesBlock = 'Some local changes need account verification before tags can be managed. Keep this site’s data and try the original account online.'
const sharedStorageBlock = 'Some local data belongs to another or unverified account and shares this browser’s storage. Open the original account to review its data, or manage tags in a browser with IndexedDB available. Keep this site’s data.'

function inspectTagLocalState(notes: CachedNote[], queue: MutationQueueItem[], userId: string) {
  const byId = new Map(notes.map(note => [note.id, note]))
  const groups = new Map<string, MutationQueueItem[]>()
  let unverified = notes.some(note => note.user_id != null && (typeof note.user_id !== 'string' || !note.user_id.trim()))
  let ownPending = false
  for (const item of queue) {
    if (typeof item.noteId !== 'string' || !item.noteId || !item.payload || typeof item.payload !== 'object' || Array.isArray(item.payload)) { unverified = true; continue }
    const ownerValues = [item.payload.user_id, (item.payload as { userId?: unknown }).userId]
    if (ownerValues.some(owner => owner != null && (typeof owner !== 'string' || !owner.trim()))) { unverified = true; continue }
    const group = groups.get(item.noteId) ?? []
    group.push(item)
    groups.set(item.noteId, group)
  }
  const foreignIds = new Set<string>()
  for (const [id, group] of groups) {
    const note = byId.get(id)
    const individualOwners = group.map(item => new Set(queueOwners(item)))
    const owners = new Set(individualOwners.flatMap(itemOwners => [...itemOwners]))
    if ([...owners].some(owner => typeof owner !== 'string' || !owner.trim())) { unverified = true; continue }
    const owner = owners.size === 1 ? [...owners][0] : undefined
    if (!owner && owners.size === 0 && note?.user_id === userId) {
      ownPending = true
    } else if (!owner || (note?.user_id && note.user_id !== owner) || individualOwners.some(itemOwners => itemOwners.size !== 1)) {
      unverified = true
    } else if (owner === userId) {
      ownPending = true
    } else if (!note || note.user_id === owner || group.some(item => matchesQueuedSnapshot(note, item))) {
      // A legacy snapshot needs matching full content and version, not just an ID.
      foreignIds.add(id)
    } else {
      unverified = true
    }
  }
  const relevantNotes = notes.filter(note => !foreignIds.has(note.id) && (!note.user_id || note.user_id === userId))
  for (const note of relevantNotes) {
    if (note.status === 'synced' && !note.pendingOps?.length) continue
    if (note.user_id === userId) ownPending = true
    else unverified = true
  }
  const shared = foreignIds.size > 0 || notes.some(note => !note.user_id || note.user_id !== userId)
  return { relevantNotes, unverified, ownPending, shared }
}

export function assertTagLocalState(notes: CachedNote[], queue: MutationQueueItem[], userId: string, atomicTagPatches: boolean) {
  const state = inspectTagLocalState(notes, queue, userId)
  if (state.unverified) throw new Error(unverifiedChangesBlock)
  if (state.ownPending) throw new Error('Finish syncing your notes before managing tags.')
  if (state.shared && !atomicTagPatches) throw new Error(sharedStorageBlock)
  return state.relevantNotes
}
