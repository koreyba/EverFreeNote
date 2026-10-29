import type { CachedNote } from '@core/types/offline'

// In-flight writes survive React remounts when the account session changes.
// This coordinator is limited to this JavaScript context, not other windows.
type PendingWrite = { ownerId: string; promise: Promise<CachedNote>; snapshot: CachedNote; hidden: boolean }
type Listener = (saved?: CachedNote) => void
const pendingWrites = new Map<string, PendingWrite>()
const listeners = new Map<string, Set<Listener>>()

const keyFor = (ownerId: string, noteId: string) => JSON.stringify([ownerId, noteId])

const notify = (ownerId: string, saved?: CachedNote) => {
  listeners.get(ownerId)?.forEach(listener => listener(saved))
}

export function getPendingOwnerNotes(ownerId: string): CachedNote[] {
  return Array.from(pendingWrites.values(), entry => entry.ownerId === ownerId && !entry.hidden ? entry.snapshot : null)
    .filter((note): note is CachedNote => note !== null)
}

export function subscribeOwnerNoteWrites(ownerId: string, listener: Listener): () => void {
  const ownerListeners = listeners.get(ownerId) ?? new Set<Listener>()
  ownerListeners.add(listener)
  listeners.set(ownerId, ownerListeners)
  return () => {
    ownerListeners.delete(listener)
    if (!ownerListeners.size) listeners.delete(ownerId)
  }
}

export function enqueueOwnerNoteWrite(ownerId: string, noteId: string, snapshot: CachedNote, write: () => Promise<CachedNote>, signal?: AbortSignal): Promise<CachedNote> {
  const key = keyFor(ownerId, noteId)
  const previous = pendingWrites.get(key)
  const current = previous ? previous.promise.catch(() => undefined).then(write) : write()
  const entry: PendingWrite = { ownerId, promise: current, snapshot, hidden: Boolean(signal?.aborted) }
  const hide = () => {
    entry.hidden = true
    if (pendingWrites.get(key) === entry) notify(ownerId)
  }
  signal?.addEventListener('abort', hide, { once: true })
  pendingWrites.set(key, entry)
  notify(ownerId)
  const cleanup = (saved?: CachedNote) => {
    signal?.removeEventListener('abort', hide)
    if (pendingWrites.get(key) !== entry) return
    pendingWrites.delete(key)
    notify(ownerId, saved)
  }
  void current.then(cleanup, () => cleanup())
  return current
}

export async function waitForOwnerNoteWrites(ownerId: string, noteId: string): Promise<void> {
  const key = keyFor(ownerId, noteId)
  let pending = pendingWrites.get(key)?.promise
  while (pending) {
    await pending
    const latest = pendingWrites.get(key)?.promise
    if (latest === pending) break
    pending = latest
  }
}
