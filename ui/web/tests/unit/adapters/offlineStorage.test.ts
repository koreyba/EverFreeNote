import type { CachedNote, MutationQueueItem } from '@core/types/offline'
import { OFFLINE_CACHE_LIMIT_BYTES } from '@core/constants/offline'

jest.mock('@core/constants/offline', () => ({
  OFFLINE_CACHE_LIMIT_BYTES: 200,
}))

Object.defineProperty(globalThis, 'indexedDB', {
  value: undefined,
  writable: true,
  configurable: true,
})
if (typeof window !== 'undefined') {
  Object.defineProperty(window, 'indexedDB', {
    value: undefined,
    writable: true,
    configurable: true,
  })
}

// eslint-disable-next-line @typescript-eslint/no-require-imports
const { webOfflineStorageAdapter } = require('@ui/web/adapters/offlineStorage')

const makeNote = (id: string, updatedAt: string, extra: Partial<CachedNote> = {}): CachedNote => ({
  id,
  title: id,
  description: `${id} description`,
  tags: [id],
  status: 'synced',
  updatedAt,
  ...extra,
})

const makeQueueItem = (id: string, status: MutationQueueItem['status'] = 'pending'): MutationQueueItem => ({
  id,
  noteId: `note-${id}`,
  operation: 'update',
  payload: { title: id },
  clientUpdatedAt: `2026-01-01T00:00:0${id.slice(-1)}Z`,
  status,
})

describe('webOfflineStorageAdapter localStorage fallback', () => {
  beforeEach(() => {
    localStorage.clear()
  })

  afterEach(() => {
    jest.restoreAllMocks()
  })

  it('saves, replaces, paginates, and deletes cached notes', async () => {
    const first = makeNote('note-1', '2026-01-01T00:00:00Z')
    const second = makeNote('note-2', '2026-01-02T00:00:00Z')

    await webOfflineStorageAdapter.saveNote(first)
    await webOfflineStorageAdapter.saveNote(second)
    await webOfflineStorageAdapter.saveNote({ ...first, title: 'Updated' })

    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([
      expect.objectContaining({ id: 'note-1', title: 'Updated' }),
      second,
    ])
    expect(await webOfflineStorageAdapter.loadNotes({ offset: 1, limit: 1 })).toEqual([second])

    await webOfflineStorageAdapter.saveNotes([second])
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([second])

    await webOfflineStorageAdapter.deleteNote('note-2')
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([])
  })

  it('refreshes only tags in an unchanged synced cache entry', async () => {
    const cached = makeNote('note-1', '2026-01-01T00:00:00Z', { user_id: 'user-1' })
    await webOfflineStorageAdapter.saveNote(cached)
    expect(await webOfflineStorageAdapter.patchSyncedTags([{ expected: cached, tags: ['renamed'] }])).toEqual(['note-1'])
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([{ ...cached, tags: ['renamed'] }])
  })

  it('does not overwrite a newer or queued cached draft during tag refresh', async () => {
    const expected = makeNote('note-1', '2026-01-01T00:00:00Z', { user_id: 'user-1' })
    const newer = { ...expected, updatedAt: '2026-01-02T00:00:00Z', description: 'New draft', status: 'pending' as const }
    await webOfflineStorageAdapter.saveNote(newer)
    expect(await webOfflineStorageAdapter.patchSyncedTags([{ expected, tags: ['renamed'] }])).toEqual([])
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([newer])

    const sameRevision = { ...expected, description: 'Newer text with the same revision' }
    await webOfflineStorageAdapter.saveNote(sameRevision)
    expect(await webOfflineStorageAdapter.patchSyncedTags([{ expected, tags: ['renamed'] }])).toEqual([])
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([sameRevision])

    await webOfflineStorageAdapter.saveNote(expected)
    await webOfflineStorageAdapter.upsertQueueItem({ ...makeQueueItem('q-1'), noteId: expected.id })
    expect(await webOfflineStorageAdapter.patchSyncedTags([{ expected, tags: ['renamed'] }])).toEqual([])
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([expected])
  })

  it('retains a changed or queued synced snapshot when removing remotely missing notes', async () => {
    const expected = makeNote('note-1', '2026-01-01T00:00:00Z', { user_id: 'user-1' })
    const changed = { ...expected, description: 'New local content with the same revision' }
    await webOfflineStorageAdapter.saveNote(changed)
    expect(await webOfflineStorageAdapter.removeSyncedNotes([expected])).toEqual([])
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([changed])

    await webOfflineStorageAdapter.saveNote(expected)
    await webOfflineStorageAdapter.upsertQueueItem({ ...makeQueueItem('q-1'), noteId: expected.id })
    expect(await webOfflineStorageAdapter.removeSyncedNotes([expected])).toEqual([])
    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([expected])
  })

  it('maintains the mutation queue and updates item status', async () => {
    const first = makeQueueItem('q-1')
    const second = makeQueueItem('q-2', 'failed')

    await webOfflineStorageAdapter.upsertQueueItem(first)
    await webOfflineStorageAdapter.upsertQueueItem(second)
    await webOfflineStorageAdapter.upsertQueueItem({ ...first, lastError: 'retry' })

    expect(await webOfflineStorageAdapter.getQueue()).toEqual([
      expect.objectContaining({ id: 'q-1', lastError: 'retry' }),
      second,
    ])
    expect(await webOfflineStorageAdapter.getPendingBatch(10)).toEqual([
      expect.objectContaining({ id: 'q-1' }),
    ])

    await webOfflineStorageAdapter.markQueueItemStatus('q-1', 'failed', 'network')
    expect(await webOfflineStorageAdapter.getQueue()).toEqual([
      expect.objectContaining({ id: 'q-1', status: 'failed', lastError: 'network' }),
      second,
    ])

    await webOfflineStorageAdapter.upsertQueue([first, second])
    expect(await webOfflineStorageAdapter.popQueueBatch(1)).toEqual([first])
    expect(await webOfflineStorageAdapter.getQueue()).toEqual([second])

    await webOfflineStorageAdapter.removeQueueItems([])
    await webOfflineStorageAdapter.removeQueueItems(['q-2'])
    expect(await webOfflineStorageAdapter.getQueue()).toEqual([])
  })

  it('appends a batch without replacing pending or failed queue items', async () => {
    const pending = makeQueueItem('q-1')
    const failed = makeQueueItem('q-2', 'failed')
    const added = makeQueueItem('q-3')
    await webOfflineStorageAdapter.upsertQueueItem(pending)
    await webOfflineStorageAdapter.upsertQueueItem(failed)

    await webOfflineStorageAdapter.appendQueueItems([added])

    expect(await webOfflineStorageAdapter.getQueue()).toEqual([pending, failed, added])
  })

  it('leaves the existing queue intact if the fallback batch write fails', async () => {
    const pending = makeQueueItem('q-1')
    await webOfflineStorageAdapter.upsertQueueItem(pending)
    jest.spyOn(Storage.prototype, 'setItem').mockImplementationOnce(() => { throw new Error('quota exceeded') })

    await expect(webOfflineStorageAdapter.appendQueueItems([makeQueueItem('q-2')])).rejects.toThrow('quota exceeded')
    expect(await webOfflineStorageAdapter.getQueue()).toEqual([pending])
  })

  it('marks an existing note as synced and clears its pending operations', async () => {
    await webOfflineStorageAdapter.saveNote(makeNote('note-1', '2026-01-01T00:00:00Z', {
      status: 'pending',
      pendingOps: ['update'],
    }))

    await webOfflineStorageAdapter.markSynced('note-1', '2026-02-01T00:00:00Z')

    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([
      expect.objectContaining({
        id: 'note-1',
        status: 'synced',
        updatedAt: '2026-02-01T00:00:00Z',
        pendingOps: [],
      }),
    ])

    await webOfflineStorageAdapter.markSynced('missing', '2026-02-01T00:00:00Z')
    await webOfflineStorageAdapter.markQueueItemStatus('missing', 'synced')
  })

  it('evicts the oldest notes when the configured cache limit is exceeded', async () => {
    expect(OFFLINE_CACHE_LIMIT_BYTES).toBe(200)
    const oldest = makeNote('old', '2020-01-01T00:00:00Z', { content: 'x'.repeat(200) })
    const newest = makeNote('new', '2026-01-01T00:00:00Z')
    await webOfflineStorageAdapter.saveNotes([oldest, newest])

    await webOfflineStorageAdapter.enforceLimit()

    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([
      expect.objectContaining({ id: 'new' }),
    ])
  })

  it('ignores malformed stored JSON and clears both stores', async () => {
    localStorage.setItem('offline_notes', '{not json')
    localStorage.setItem('offline_queue', '{not json')

    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([])
    expect(await webOfflineStorageAdapter.getQueue()).toEqual([])

    await webOfflineStorageAdapter.clearAll()

    expect(localStorage.getItem('offline_notes')).toBeNull()
    expect(localStorage.getItem('offline_queue')).toBeNull()
  })

  it('does not evict notes when total size is within limit', async () => {
    const note = makeNote('small-note', '2026-01-01T00:00:00Z', { description: 'tiny' })
    await webOfflineStorageAdapter.saveNotes([note])

    await webOfflineStorageAdapter.enforceLimit()

    expect(await webOfflineStorageAdapter.loadNotes()).toEqual([
      expect.objectContaining({ id: 'small-note' }),
    ])
  })
})


it('does not mark newer local text synced when an older write completes', async () => {
  localStorage.clear()
  const latest = makeNote('note-1', '2026-09-22T10:00:02Z', { status: 'pending', description: 'latest offline text' })
  await webOfflineStorageAdapter.saveNote(latest)
  await webOfflineStorageAdapter.markSynced(latest.id, '2026-09-22T10:00:01Z', '2026-09-22T10:00:01Z')
  expect(await webOfflineStorageAdapter.loadNotes()).toEqual([latest])
})
