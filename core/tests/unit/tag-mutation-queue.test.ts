import { compactQueue } from '@core/utils/compactQueue'
import type { MutationQueueItem } from '@core/types/offline'

const item = (overrides: Partial<MutationQueueItem>): MutationQueueItem => ({
  id: 'queue-id',
  noteId: 'tag:user-1:renameTag:react',
  operation: 'renameTag',
  payload: {
    tag: 'react',
    replacement: 'ReactJS',
    user_id: 'user-1',
  },
  clientUpdatedAt: '2026-01-01T00:00:01Z',
  status: 'failed',
  attempts: 2,
  ...overrides,
})
describe('compactQueue bulk tag operations', () => {
  it('resets retry metadata when compacting a failed bulk operation', () => {
    const result = compactQueue([
      item({ id: 'failed', attempts: 4, lastError: 'previous failure' }),
    ])

    expect(result[0]).toMatchObject({ status: 'pending', attempts: 0 })
    expect(result[0]).toHaveProperty('lastError', undefined)
  })

  it('preserves bulk operations and resets them to pending for retry', () => {
    const result = compactQueue([
      item({ id: 'first', clientUpdatedAt: '2026-01-01T00:00:01Z' }),
      item({ id: 'latest', clientUpdatedAt: '2026-01-01T00:00:02Z', payload: {
        tag: 'react',
        replacement: 'React Native',
        user_id: 'user-1',
      } }),
    ])

    expect(result).toEqual([
      item({
        id: 'latest',
        clientUpdatedAt: '2026-01-01T00:00:02Z',
        status: 'pending',
        attempts: 0,
        payload: {
          tag: 'react',
          replacement: 'React Native',
          user_id: 'user-1',
        },
      }),
    ])
  })
})
