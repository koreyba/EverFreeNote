import { compactQueue } from '../../../../core/utils/compactQueue'
import type { MutationQueueItem } from '../../../../core/types/offline'

describe('compactQueue', () => {
  const baseItem: Omit<MutationQueueItem, 'id' | 'operation' | 'clientUpdatedAt' | 'payload'> = {
    noteId: 'note-1',
    status: 'pending',
    attempts: 0,
  }

  const createItem = (
    id: string,
    operation: 'create' | 'update' | 'delete',
    clientUpdatedAt: string,
    payload: Record<string, unknown> = {}
  ): MutationQueueItem => ({
    ...baseItem,
    id,
    operation,
    clientUpdatedAt,
    payload,
  })

  it('should return empty array for empty input', () => {
    const result = compactQueue([])
    expect(result).to.have.length(0)
  })

  it('should preserve single operation', () => {
    const items = [createItem('1', 'create', '2023-01-01T10:00:00Z', { title: 'A' })]
    const result = compactQueue(items)
    expect(result).to.have.length(1)
    expect(result[0].operation).to.equal('create')
    expect(result[0].payload).to.deep.equal({ title: 'A' })
  })

  it('should compact create + delete to noop', () => {
    const items = [
      createItem('1', 'create', '2023-01-01T10:00:00Z'),
      createItem('2', 'update', '2023-01-01T10:05:00Z'),
      createItem('3', 'delete', '2023-01-01T10:10:00Z'),
    ]
    const result = compactQueue(items)
    expect(result).to.have.length(0)
  })

  it('should compact create + updates to single create with final payload', () => {
    const items = [
      createItem('1', 'create', '2023-01-01T10:00:00Z', { title: 'Initial' }),
      createItem('2', 'update', '2023-01-01T10:05:00Z', { title: 'Updated' }),
      createItem('3', 'update', '2023-01-01T10:10:00Z', { content: 'New Content' }),
    ]
    const result = compactQueue(items)
    expect(result).to.have.length(1)
    expect(result[0].operation).to.equal('create')
    // Note: The current implementation takes the payload from the LAST item. 
    // It does NOT merge payloads. This is consistent with the requirement "create с payload из последнего элемента".
    expect(result[0].payload).to.deep.equal({ content: 'New Content' })
    expect(result[0].clientUpdatedAt).to.equal('2023-01-01T10:10:00Z')
    expect(result[0].status).to.equal('pending')
  })

  it('should compact updates to single update with final payload', () => {
    const items = [
      createItem('1', 'update', '2023-01-01T10:00:00Z', { title: 'Update 1' }),
      createItem('2', 'update', '2023-01-01T10:05:00Z', { title: 'Update 2' }),
    ]
    const result = compactQueue(items)
    expect(result).to.have.length(1)
    expect(result[0].operation).to.equal('update')
    expect(result[0].payload).to.deep.equal({ title: 'Update 2' })
    expect(result[0].clientUpdatedAt).to.equal('2023-01-01T10:05:00Z')
  })

  it('should compact update + delete to single delete', () => {
    const items = [
      createItem('1', 'update', '2023-01-01T10:00:00Z'),
      createItem('2', 'delete', '2023-01-01T10:05:00Z'),
    ]
    const result = compactQueue(items)
    expect(result).to.have.length(1)
    expect(result[0].operation).to.equal('delete')
    expect(result[0].clientUpdatedAt).to.equal('2023-01-01T10:05:00Z')
  })

  it('should handle delete without create (keep delete)', () => {
    const items = [
      createItem('1', 'delete', '2023-01-01T10:00:00Z'),
    ]
    const result = compactQueue(items)
    expect(result).to.have.length(1)
    expect(result[0].operation).to.equal('delete')
  })

  it('should handle multiple notes independently', () => {
    const items = [
      createItem('1', 'create', '2023-01-01T10:00:00Z', { id: 'note-1' }), // Note 1
      createItem('2', 'create', '2023-01-01T10:00:00Z', { id: 'note-2' }), // Note 2
      createItem('3', 'delete', '2023-01-01T10:05:00Z', { id: 'note-1' }), // Note 1 delete
    ]
    // Fix noteIds
    items[0].noteId = 'note-1'
    items[1].noteId = 'note-2'
    items[2].noteId = 'note-1'

    const result = compactQueue(items)
    
    // Note 1: create + delete -> noop
    // Note 2: create -> create
    expect(result).to.have.length(1)
    expect(result[0].noteId).to.equal('note-2')
    expect(result[0].operation).to.equal('create')
  })

  it('should sort result by clientUpdatedAt', () => {
    const items = [
      { ...createItem('1', 'update', '2023-01-01T12:00:00Z'), noteId: 'note-B' },
      { ...createItem('2', 'update', '2023-01-01T10:00:00Z'), noteId: 'note-A' },
    ]
    const result = compactQueue(items)
    expect(result).to.have.length(2)
    expect(result[0].noteId).to.equal('note-A')
    expect(result[1].noteId).to.equal('note-B')
  })

  it('should reset status to pending for all output items', () => {
    const items = [
      { ...createItem('1', 'update', '2023-01-01T10:00:00Z'), status: 'failed' as const },
    ]
    const result = compactQueue(items)
    expect(result[0].status).to.equal('pending')
  })
})
