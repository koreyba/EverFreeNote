import { compactQueue } from '@core/utils/compactQueue'
import type { MutationOperation, MutationQueueItem } from '@core/types/offline'

const item = (
  id: string,
  noteId: string,
  operation: MutationOperation,
  clientUpdatedAt: string,
  payload: Record<string, unknown> = {},
  overrides: Partial<MutationQueueItem> = {},
): MutationQueueItem => ({
  id,
  noteId,
  operation,
  payload: payload as MutationQueueItem['payload'],
  clientUpdatedAt,
  status: 'failed',
  attempts: 1,
  ...overrides,
})

describe('compactQueue additional branch behavior', () => {
  it('compacts create plus multiple updates into one create with the final payload and metadata', () => {
    const result = compactQueue([
      item('update-late', 'new-note', 'update', '2026-01-01T00:00:03Z', { title: 'final' }),
      item('create', 'new-note', 'create', '2026-01-01T00:00:01Z', { title: 'initial' }, { attempts: 2 }),
      item('update-middle', 'new-note', 'update', '2026-01-01T00:00:02Z', { title: 'middle' }),
    ])

    expect(result).toEqual([
      item('update-late', 'new-note', 'create', '2026-01-01T00:00:03Z', { title: 'final' }, { attempts: 2, status: 'pending' }),
    ])
  })

  it('collapses create-update-delete chains to a real no-op', () => {
    const result = compactQueue([
      item('create', 'temporary-note', 'create', '2026-01-01T00:00:01Z', { title: 'initial' }),
      item('update-one', 'temporary-note', 'update', '2026-01-01T00:00:02Z', { title: 'edited' }),
      item('update-two', 'temporary-note', 'update', '2026-01-01T00:00:03Z', { title: 'edited again' }),
      item('delete', 'temporary-note', 'delete', '2026-01-01T00:00:04Z'),
    ])

    expect(result).toEqual([])
  })

  it('keeps a final delete, but drops update-after-delete chains as implemented', () => {
    const result = compactQueue([
      item('update-delete', 'deleted-note', 'update', '2026-01-01T00:00:01Z', { title: 'before delete' }),
      item('final-update', 'updated-note', 'update', '2026-01-01T00:00:05Z', { title: 'final update' }),
      item('delete', 'deleted-note', 'delete', '2026-01-01T00:00:02Z', { reason: 'removed' }),
      item('update-again', 'updated-note', 'update', '2026-01-01T00:00:03Z', { title: 'intermediate' }),
      item('delete-then-update', 'updated-note', 'delete', '2026-01-01T00:00:04Z'),
    ])

    expect(result).toEqual([
      item('delete', 'deleted-note', 'delete', '2026-01-01T00:00:02Z', { reason: 'removed' }, { status: 'pending' }),
    ])

    expect(compactQueue([
      item('update-one', 'updated-only', 'update', '2026-01-01T00:00:01Z', { title: 'initial' }),
      item('update-two', 'updated-only', 'update', '2026-01-01T00:00:02Z', { title: 'final' }),
    ])).toEqual([
      item('update-two', 'updated-only', 'update', '2026-01-01T00:00:02Z', { title: 'final' }, { status: 'pending' }),
    ])
  })

  it('orders the final compacted queue by the surviving operation timestamps', () => {
    const result = compactQueue([
      item('late-update', 'late-note', 'update', '2026-01-01T00:00:10Z', { title: 'late' }),
      item('early-create', 'early-note', 'create', '2026-01-01T00:00:01Z', { title: 'initial' }),
      item('early-update', 'early-note', 'update', '2026-01-01T00:00:02Z', { title: 'final' }),
      item('middle-delete', 'middle-note', 'delete', '2026-01-01T00:00:05Z'),
    ])

    expect(result.map(({ noteId, operation, clientUpdatedAt, status }) => ({ noteId, operation, clientUpdatedAt, status }))).toEqual([
      { noteId: 'early-note', operation: 'create', clientUpdatedAt: '2026-01-01T00:00:02Z', status: 'pending' },
      { noteId: 'middle-note', operation: 'delete', clientUpdatedAt: '2026-01-01T00:00:05Z', status: 'pending' },
      { noteId: 'late-note', operation: 'update', clientUpdatedAt: '2026-01-01T00:00:10Z', status: 'pending' },
    ])
  })

  it('drops an unsupported runtime operation instead of emitting an invalid queue item', () => {
    const unsupported = item(
      'unsupported',
      'note',
      'archive' as MutationOperation,
      '2026-01-01T00:00:01Z',
    )

    expect(compactQueue([unsupported])).toEqual([])
  })
})
