import { compactQueue } from '../../utils/compactQueue'
import type { MutationQueueItem } from '../../types/offline'

const item = (id: string, noteId: string, operation: 'create' | 'update' | 'delete', time: string, payload = {}) : MutationQueueItem => ({
  id, noteId, operation, payload, clientUpdatedAt: time, status: 'failed', attempts: 1,
})

describe('compactQueue state transitions', () => {
  it('removes create/delete pairs and keeps a standalone delete pending', () => {
    expect(compactQueue([
      item('1', 'n1', 'create', '2026-01-01T00:00:00Z'), item('2', 'n1', 'delete', '2026-01-01T00:00:01Z'),
    ])).toEqual([])
    const result = compactQueue([item('3', 'n2', 'delete', '2026-01-01T00:00:00Z')])
    expect(result).toHaveLength(1)
    expect(result[0]).toMatchObject({ operation: 'delete', status: 'pending' })
  })

  it('collapses create/update and update/update to the latest payload', () => {
    const created = compactQueue([
      item('1', 'n1', 'create', '2026-01-01T00:00:00Z', { title: 'old' }),
      item('2', 'n1', 'update', '2026-01-01T00:00:01Z', { title: 'new' }),
    ])
    expect(created).toMatchObject([{ operation: 'create', payload: { title: 'new' }, status: 'pending', id: '2' }])
    const updated = compactQueue([
      item('1', 'n2', 'update', '2026-01-01T00:00:00Z', { title: 'old' }),
      item('2', 'n2', 'update', '2026-01-01T00:00:01Z', { title: 'new' }),
    ])
    expect(updated).toMatchObject([{ operation: 'update', payload: { title: 'new' }, status: 'pending' }])
  })
})
