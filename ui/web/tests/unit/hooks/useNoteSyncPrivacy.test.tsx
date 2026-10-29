import { act, renderHook, waitFor } from '@testing-library/react'
import type { CachedNote, MutationQueueItem, OfflineStorageAdapter } from '@core/types/offline'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { useNoteSync } from '@ui/web/hooks/useNoteSync'
import { webcrypto } from 'node:crypto'
import { TextEncoder } from 'node:util'

let mockScopedStorage: OfflineStorageAdapter
let mockPerformSync: (item: MutationQueueItem) => Promise<void>

jest.mock('@core/services/offlineSyncManager', () => ({
  OfflineSyncManager: jest.fn().mockImplementation((storage, performSync) => {
    mockScopedStorage = storage
    mockPerformSync = performSync
    return { enqueue: jest.fn(), drainQueue: jest.fn(), requestDrain: jest.fn().mockResolvedValue(undefined), dispose: jest.fn() }
  }),
}))

const legacy: CachedNote = {
  id: 'legacy-note', title: 'Private local text', description: 'Unassigned local edit',
  status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z', tags: [],
}
const foreignCreate: MutationQueueItem = {
  id: 'foreign-create', noteId: legacy.id, operation: 'create', status: 'pending',
  payload: { user_id: 'owner-a', title: legacy.title, description: legacy.description, tags: [] },
  clientUpdatedAt: legacy.updatedAt,
}
const unknownUpdate: MutationQueueItem = {
  id: 'unknown-update', noteId: 'unknown-note', operation: 'update', status: 'pending',
  payload: { title: 'Unknown local edit', description: 'Do not reveal', tags: [] },
  clientUpdatedAt: legacy.updatedAt,
}

beforeEach(async () => {
  await webOfflineStorageAdapter.clearAll()
})

beforeAll(() => {
  Object.defineProperty(globalThis.crypto, 'subtle', { configurable: true, value: webcrypto.subtle })
  if (!globalThis.TextEncoder) Object.defineProperty(globalThis, 'TextEncoder', { configurable: true, value: TextEncoder })
})

function renderFor(userId: string, options: { create?: jest.Mock; update?: jest.Mock; verify?: jest.Mock; getSession?: () => { userId: string | null; epoch: number } } = {}) {
  return renderHook(({ owner }) => useNoteSync({
    user: { id: owner } as never,
    createNoteMutation: { mutateAsync: options.create ?? jest.fn() },
    updateNoteMutation: { mutateAsync: options.update ?? jest.fn() },
    deleteNoteMutation: { mutateAsync: jest.fn() },
    verifyLegacyNotes: options.verify,
    getSessionSnapshot: options.getSession,
  }), { initialProps: { owner: userId } })
}

it('does not reveal an ownerless cached draft belonging to another account', async () => {
  await webOfflineStorageAdapter.saveNote(legacy)
  await webOfflineStorageAdapter.upsertQueueItem(foreignCreate)
  const load = jest.spyOn(webOfflineStorageAdapter, 'loadNotes')
  const hook = renderFor('owner-b')
  await waitFor(() => expect(load).toHaveBeenCalled())
  await act(async () => {})
  expect(hook.result.current.offlineOverlay).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: legacy.id })]))
  expect(await webOfflineStorageAdapter.loadNotes()).toEqual([legacy])
  load.mockRestore()
})

it('recovers an explicitly owned legacy create after A → B → A without revealing it to B', async () => {
  await webOfflineStorageAdapter.saveNote(legacy)
  await webOfflineStorageAdapter.upsertQueueItem(foreignCreate)
  const hook = renderFor('owner-a')
  await waitFor(() => expect(hook.result.current.offlineOverlay).toEqual(expect.arrayContaining([expect.objectContaining({ id: legacy.id })])))
  hook.rerender({ owner: 'owner-b' })
  expect(hook.result.current.offlineOverlay).not.toEqual(expect.arrayContaining([expect.objectContaining({ id: legacy.id })]))
  hook.rerender({ owner: 'owner-a' })
  await waitFor(() => expect(hook.result.current.offlineOverlay).toEqual(expect.arrayContaining([expect.objectContaining({ id: legacy.id })])))
  expect(await webOfflineStorageAdapter.loadNotes()).toEqual([legacy])
})

it('keeps the proven owner able to open an offline legacy copy after its create is acknowledged', async () => {
  await webOfflineStorageAdapter.saveNote(legacy)
  await webOfflineStorageAdapter.upsertQueueItem(foreignCreate)
  const first = renderFor('owner-a', { create: jest.fn().mockResolvedValue({}) })
  await waitFor(() => expect(first.result.current.offlineOverlay).toEqual(expect.arrayContaining([expect.objectContaining({ id: legacy.id })])))
  await act(async () => mockPerformSync(foreignCreate))
  first.unmount()
  await webOfflineStorageAdapter.removeQueueItems([foreignCreate.id])
  await webOfflineStorageAdapter.markSynced(legacy.id, legacy.updatedAt, legacy.updatedAt)
  const reopened = renderFor('owner-a')
  await waitFor(() => expect(reopened.result.current.offlineOverlay).toEqual(expect.arrayContaining([expect.objectContaining({ id: legacy.id })])))
  reopened.rerender({ owner: 'owner-b' })
  expect(reopened.result.current.offlineOverlay).toEqual([])
})

it('does not send a legacy create if storing its owner claim fails, and allows retry', async () => {
  await webOfflineStorageAdapter.saveNote(legacy)
  await webOfflineStorageAdapter.upsertQueueItem(foreignCreate)
  const create = jest.fn().mockResolvedValue({})
  renderFor('owner-a', { create })
  const claim = jest.spyOn(webOfflineStorageAdapter, 'claimLegacySnapshot').mockRejectedValueOnce(new DOMException('Storage full', 'QuotaExceededError'))
  await expect(mockPerformSync(foreignCreate)).rejects.toThrow('could not safely retain')
  expect(create).not.toHaveBeenCalled()
  expect(await webOfflineStorageAdapter.getQueue()).toEqual([foreignCreate])
  expect(await webOfflineStorageAdapter.loadNotes()).toEqual([legacy])
  await expect(mockPerformSync(foreignCreate)).resolves.toBeUndefined()
  expect(create).toHaveBeenCalledTimes(1)
  claim.mockRestore()
})

it('keeps legacy data unsent if secure hashing is unavailable', async () => {
  await webOfflineStorageAdapter.saveNote(legacy)
  await webOfflineStorageAdapter.upsertQueueItem(foreignCreate)
  const create = jest.fn().mockResolvedValue({})
  renderFor('owner-a', { create })
  Object.defineProperty(globalThis.crypto, 'subtle', { configurable: true, value: undefined })
  try {
    await expect(mockPerformSync(foreignCreate)).rejects.toThrow('could not safely retain')
    expect(create).not.toHaveBeenCalled()
    expect(await webOfflineStorageAdapter.getQueue()).toEqual([foreignCreate])
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([legacy])
  } finally {
    Object.defineProperty(globalThis.crypto, 'subtle', { configurable: true, value: webcrypto.subtle })
  }
})

it('does not reuse a fallback owner claim for a changed local snapshot', async () => {
  await webOfflineStorageAdapter.saveNote(legacy)
  await webOfflineStorageAdapter.upsertQueueItem(foreignCreate)
  renderFor('owner-a', { create: jest.fn().mockResolvedValue({}) })
  await act(async () => mockPerformSync(foreignCreate))
  const changed = { ...legacy, title: 'Changed even with the same timestamp' }
  await webOfflineStorageAdapter.saveNote(changed)
  expect(await webOfflineStorageAdapter.getLegacyClaims!('owner-a', [changed])).toEqual([])
  expect(await webOfflineStorageAdapter.getLegacyClaims!('owner-b', [legacy])).toEqual([])
})

it('keeps a changed ownerless draft hidden when a same-ID server row does not match', async () => {
  const local = { ...legacy, created_at: '2026-09-01T00:00:00Z' }
  await webOfflineStorageAdapter.saveNote(local)
  await webOfflineStorageAdapter.upsertQueueItem({ ...unknownUpdate, noteId: legacy.id })
  const verify = jest.fn().mockResolvedValue([{ ...local, user_id: 'owner-a', title: 'Different server version' }])
  const hook = renderFor('owner-a', { verify })
  await waitFor(() => expect(verify).toHaveBeenCalled())
  await waitFor(() => expect(hook.result.current.legacyUnverifiedCount).toBe(1))
  expect(hook.result.current.offlineOverlay).toEqual([])
  expect(await mockScopedStorage.getQueue()).toEqual([])
  expect(await webOfflineStorageAdapter.loadNotes()).toEqual([local])
})

it('allows only the unchanged server-matching copy and keeps a different ownerless queued update blocked', async () => {
  const local = { ...legacy, created_at: '2026-09-01T00:00:00Z' }
  await webOfflineStorageAdapter.saveNote(local)
  await webOfflineStorageAdapter.upsertQueueItem({ ...unknownUpdate, noteId: legacy.id })
  const verify = jest.fn().mockResolvedValue([{ ...local, user_id: 'owner-a' }])
  const hook = renderFor('owner-a', { verify })
  await waitFor(() => expect(hook.result.current.offlineOverlay).toEqual(expect.arrayContaining([expect.objectContaining({ id: legacy.id })])))
  expect(hook.result.current.legacyUnverifiedCount).toBe(1)
  expect(await mockScopedStorage.getQueue()).toEqual([])
})

it('rechecks a legacy snapshot on request and restores it only after a complete match', async () => {
  const local = { ...legacy, status: 'synced' as const, created_at: '2026-09-01T00:00:00Z' }
  await webOfflineStorageAdapter.saveNote(local)
  const verify = jest.fn()
    .mockResolvedValueOnce([{ ...local, user_id: 'owner-a', title: 'Changed server note' }])
    .mockResolvedValue([{ ...local, user_id: 'owner-a' }])
  const hook = renderFor('owner-a', { verify })
  await waitFor(() => expect(hook.result.current.legacyUnverifiedCount).toBe(1))
  expect(hook.result.current.offlineOverlay).toEqual([])
  await act(async () => hook.result.current.retryLocalVerification())
  expect(hook.result.current.offlineOverlay).toEqual(expect.arrayContaining([expect.objectContaining({ id: legacy.id, user_id: 'owner-a' })]))
  expect(hook.result.current.legacyUnverifiedCount).toBe(0)
})

it('shows unreadable local storage as an error without replacing its contents', async () => {
  localStorage.setItem('offline_notes', '{broken')
  const hook = renderFor('owner-a')
  await waitFor(() => expect(hook.result.current.storageReadError).toBe(true))
  expect(hook.result.current.syncStateReady).toBe(true)
  expect(localStorage.getItem('offline_notes')).toBe('{broken')
})

it('does not send a stale operation after an A → B → A session change during a queue read', async () => {
  const item: MutationQueueItem = { ...unknownUpdate, payload: { ...unknownUpdate.payload, user_id: 'owner-a' } }
  await webOfflineStorageAdapter.upsertQueueItem(item)
  let session = { userId: 'owner-a' as string | null, epoch: 1 }
  const update = jest.fn().mockResolvedValue({})
  renderFor('owner-a', { update, getSession: () => session })
  await act(async () => {})
  let release!: (queue: MutationQueueItem[]) => void
  const getQueue = jest.spyOn(webOfflineStorageAdapter, 'getQueue')
    .mockImplementationOnce(() => new Promise(resolve => { release = resolve }))
  const pending = mockPerformSync(item)
  session = { userId: 'owner-b', epoch: 2 }
  session = { userId: 'owner-a', epoch: 3 }
  release([item])
  await expect(pending).rejects.toThrow()
  expect(update).not.toHaveBeenCalled()
  getQueue.mockRestore()
  expect(await webOfflineStorageAdapter.getQueue()).toEqual([item])
})

it('does not give another account or an unassigned operation to the sync manager', async () => {
  await webOfflineStorageAdapter.saveNote(legacy)
  await webOfflineStorageAdapter.upsertQueueItem(foreignCreate)
  await webOfflineStorageAdapter.upsertQueueItem(unknownUpdate)
  renderFor('owner-b')
  expect(await mockScopedStorage.getQueue()).toEqual([])
  expect(await webOfflineStorageAdapter.getQueue()).toHaveLength(2)
})

it('rejects an unassigned queued update instead of writing it under the current user', async () => {
  await webOfflineStorageAdapter.saveNote({ ...legacy, id: 'unknown-note' })
  await webOfflineStorageAdapter.upsertQueueItem(unknownUpdate)
  const update = jest.fn().mockResolvedValue({})
  renderFor('owner-b', { update })
  await expect(mockPerformSync(unknownUpdate)).rejects.toThrow()
  expect(update).not.toHaveBeenCalled()
})

it('keeps a missing remote edit queued instead of recreating a deleted note', async () => {
  const item: MutationQueueItem = { ...unknownUpdate, payload: { ...unknownUpdate.payload, user_id: 'owner-a' } }
  const update = jest.fn().mockRejectedValue({ code: 'PGRST116' })
  const create = jest.fn().mockResolvedValue({})
  renderFor('owner-a', { update, create })
  await expect(mockPerformSync(item)).rejects.toThrow()
  expect(create).not.toHaveBeenCalled()
})
