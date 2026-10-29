import type { CachedNote } from '@core/types/offline'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'

export type LocalDeletionRecovery = {
  noteId: string
  snapshot: CachedNote
}

export function canCloseRecoveredTabs(tabs: NoteWorkspaceTab[], recovery: LocalDeletionRecovery): boolean {
  return tabs.filter(tab => tab.noteId === recovery.noteId).every(tab => (
    tab.mode === 'reading' && tab.saveState === 'saved' && tab.note !== null && tab.note.title === recovery.snapshot.title &&
    (tab.note?.description ?? '') === (recovery.snapshot.description ?? '') &&
    JSON.stringify(tab.note?.tags ?? []) === JSON.stringify(recovery.snapshot.tags ?? [])
  ))
}

// Account changes remount the workspace. Keep an unresolved local cleanup in
// this browser context so its owner can retry it without another server DELETE.
const recoveries = new Map<string, Map<string, LocalDeletionRecovery>>()
const listeners = new Set<() => void>()

export function getLocalDeletionRecoveries(ownerId?: string): LocalDeletionRecovery[] {
  return ownerId ? [...(recoveries.get(ownerId)?.values() ?? [])] : []
}

export function rememberLocalDeletionRecovery(ownerId: string, snapshot: CachedNote): void {
  const owner = recoveries.get(ownerId) ?? new Map<string, LocalDeletionRecovery>()
  owner.set(snapshot.id, { noteId: snapshot.id, snapshot })
  recoveries.set(ownerId, owner)
  listeners.forEach(listener => listener())
}

export function forgetLocalDeletionRecovery(ownerId: string, recovery: LocalDeletionRecovery): boolean {
  const owner = recoveries.get(ownerId)
  if (owner?.get(recovery.noteId) !== recovery) return false
  owner.delete(recovery.noteId)
  if (!owner.size) recoveries.delete(ownerId)
  listeners.forEach(listener => listener())
  return true
}

export function subscribeLocalDeletionRecovery(listener: () => void): () => void {
  listeners.add(listener)
  return () => { listeners.delete(listener) }
}
