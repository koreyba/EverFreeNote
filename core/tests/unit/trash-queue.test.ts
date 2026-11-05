import { compactQueue } from '@core/utils/compactQueue'
import type { MutationQueueItem } from '@core/types/offline'

describe('Trash queue content preservation', () => {
  it('retains the final content when a never-synced create is deleted', () => {
    const ops: MutationQueueItem[] = [
      {
        id: 'create',
        noteId: 'note',
        operation: 'create',
        payload: {
          user_id: 'owner',
          title: 'Title',
          description: 'Initial',
          tags: ['tag'],
        },
        clientUpdatedAt: '2026-01-01T00:00:00Z',
        status: 'pending',
      },
      {
        id: 'update',
        noteId: 'note',
        operation: 'update',
        payload: { user_id: 'owner', description: 'Latest unsynced text' },
        clientUpdatedAt: '2026-01-01T00:00:01Z',
        status: 'pending',
      },
      {
        id: 'delete',
        noteId: 'note',
        operation: 'delete',
        payload: { user_id: 'owner' },
        clientUpdatedAt: '2026-01-01T00:00:02Z',
        status: 'pending',
      },
    ]
    expect(compactQueue(ops)).toMatchObject([
      {
        id: 'delete',
        operation: 'delete',
        payload: {
          user_id: 'owner',
          title: 'Title',
          description: 'Latest unsynced text',
          tags: ['tag'],
        },
      },
    ])
  })
})
