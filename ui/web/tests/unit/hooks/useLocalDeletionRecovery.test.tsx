import { act, renderHook } from '@testing-library/react'
import { useLocalDeletionRecovery } from '@ui/web/hooks/useLocalDeletionRecovery'
import { canCloseRecoveredTabs, forgetLocalDeletionRecovery, getLocalDeletionRecoveries } from '@ui/web/lib/localDeletionRecovery'
import type { CachedNote } from '@core/types/offline'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'

const owner = 'recovery-unit-owner'
const other = 'recovery-unit-other'
const snapshot: CachedNote = { id: 'note-1', user_id: owner, title: 'Original', status: 'synced', updatedAt: '2026-10-01T00:00:00Z' }

afterEach(() => {
  for (const userId of [owner, other]) getLocalDeletionRecoveries(userId).forEach(entry => forgetLocalDeletionRecovery(userId, entry))
  jest.restoreAllMocks()
})

it('retains a changed local copy and only clears recovery after a safe retry', async () => {
  let local: CachedNote | null = { ...snapshot }
  const cache = {
    loadNotes: jest.fn(async () => local ? [local] : []),
    removeSyncedNotes: jest.fn(async ([expected]: CachedNote[]) => {
      if (JSON.stringify(expected) !== JSON.stringify(local)) return []
      local = null
      return [expected.id]
    }),
  }
  const session = { userId: owner, epoch: 1 }
  const { result } = renderHook(() => useLocalDeletionRecovery(owner, cache, () => session))
  const plan = await result.current.prepare([snapshot.id])
  local = { ...snapshot, title: 'Newer edit' }
  await act(async () => { await expect(result.current.complete(snapshot.id, plan)).resolves.toBe(false) })
  expect(result.current.recoveries).toHaveLength(1)
  await act(async () => { expect((await result.current.retry()).remaining).toBe(1) })
  expect(local?.title).toBe('Newer edit')
  local = { ...snapshot }
  await act(async () => { expect((await result.current.retry()).cleaned.map(entry => entry.noteId)).toEqual([snapshot.id]) })
  expect(result.current.recoveries).toHaveLength(0)
})

it('does not clean under another account when the server response arrives late', async () => {
  const cache = { loadNotes: jest.fn().mockResolvedValue([snapshot]), removeSyncedNotes: jest.fn().mockResolvedValue([snapshot.id]) }
  let session = { userId: owner, epoch: 1 }
  const { result, rerender } = renderHook(({ userId }) => useLocalDeletionRecovery(userId, cache, () => session), { initialProps: { userId: owner } })
  const plan = await result.current.prepare([snapshot.id])
  session = { userId: other, epoch: 2 }
  rerender({ userId: other })
  await act(async () => { await expect(result.current.complete(snapshot.id, plan)).resolves.toBe(false) })
  expect(cache.removeSyncedNotes).not.toHaveBeenCalled()
  expect(result.current.recoveries).toHaveLength(0)
  expect(getLocalDeletionRecoveries(owner)).toHaveLength(1)
  session = { userId: owner, epoch: 3 }
  rerender({ userId: owner })
  expect(result.current.recoveries).toHaveLength(1)
  await act(async () => { expect((await result.current.retry()).remaining).toBe(0) })
  expect(cache.removeSyncedNotes).toHaveBeenCalledTimes(1)
})

it('never automatically removes an unsynced local copy', async () => {
  const pending = { ...snapshot, status: 'pending' as const }
  const cache = { loadNotes: jest.fn().mockResolvedValue([pending]), removeSyncedNotes: jest.fn() }
  const { result } = renderHook(() => useLocalDeletionRecovery(owner, cache))
  const plan = await result.current.prepare([snapshot.id])
  await act(async () => { await expect(result.current.complete(snapshot.id, plan)).resolves.toBe(false) })
  await act(async () => { expect((await result.current.retry()).remaining).toBe(1) })
  expect(cache.removeSyncedNotes).not.toHaveBeenCalled()
})

it('does not remove a foreign copy or a new copy that appeared after the snapshot', async () => {
  const foreign = { ...snapshot, user_id: other }
  let cached: CachedNote[] = [foreign]
  const cache = { loadNotes: jest.fn(async () => cached), removeSyncedNotes: jest.fn() }
  const { result } = renderHook(() => useLocalDeletionRecovery(owner, cache))
  const foreignPlan = await result.current.prepare([snapshot.id])
  await expect(result.current.complete(snapshot.id, foreignPlan)).resolves.toBe(true)
  expect(cache.removeSyncedNotes).not.toHaveBeenCalled()
  cached = []
  const emptyPlan = await result.current.prepare([snapshot.id])
  cached = [{ ...snapshot, title: 'Created later' }]
  await expect(result.current.complete(snapshot.id, emptyPlan)).resolves.toBe(true)
  expect(cache.removeSyncedNotes).not.toHaveBeenCalled()
  expect(cached[0].title).toBe('Created later')
})

it('keeps an open editor or a changed note after local cleanup', () => {
  const tab: NoteWorkspaceTab = {
    id: 'tab-1', noteId: snapshot.id,
    note: { id: snapshot.id, user_id: owner, title: 'Original', description: '', tags: [], created_at: snapshot.updatedAt, updated_at: snapshot.updatedAt },
    mode: 'reading', draft: { title: 'Original', description: '', tags: '' }, view: { scrollTop: 0 }, saveState: 'saved', saveError: null,
  }
  const recovery = { noteId: snapshot.id, snapshot }
  expect(canCloseRecoveredTabs([tab], recovery)).toBe(true)
  expect(canCloseRecoveredTabs([{ ...tab, mode: 'editing' }], recovery)).toBe(false)
  expect(canCloseRecoveredTabs([{ ...tab, saveState: 'dirty' }], recovery)).toBe(false)
  expect(canCloseRecoveredTabs([{ ...tab, note: { ...tab.note!, title: 'Newer edit' } }], recovery)).toBe(false)
})
