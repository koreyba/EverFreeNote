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

