import { NoteService } from '@core/services/notes'
import * as queue from '@core/utils/compactQueue'

const snapshot = {
  id: 'note',
  user_id: 'owner',
  title: 'Local',
  description: 'Unsynced',
  tags: ['work'],
  updated_at: '2026-01-01',
}

const query = (result: unknown) => {
  const chain: Record<string, jest.Mock> = {}
  for (const method of [
    'select',
    'eq',
    'order',
    'range',
    'limit',
    'or',
    'delete',
    'single',
  ])
    chain[method] = jest.fn(() => chain)
  chain.then = jest.fn((resolve: (value: unknown) => unknown) =>
    Promise.resolve(result).then(resolve),
  )
  return chain
}

describe('Trash service and durable deletion content', () => {
  it('sends a complete offline snapshot through the transactional Trash RPC', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({
        data: [{ id: 'note', status: 'trashed' }],
        error: null,
      })
    const from = jest.fn().mockReturnValue(query({ error: null }))
    const service = new NoteService({ from, rpc } as never)
    await expect(
      service.deleteNote('note', {
        snapshot,
        operationId: 'durable-operation',
      }),
    ).resolves.toBe('note')
    expect(rpc).toHaveBeenCalledWith('trash_notes', {
      p_notes: [{ id: 'note', snapshot, operation_id: 'durable-operation' }],
    })
    expect(from).not.toHaveBeenCalled()
  })

  it('does not acknowledge a conflict or an incomplete server reply', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({
        data: [{ id: 'note', status: 'conflict' }],
        error: null,
      })
    const service = new NoteService({
      rpc,
      from: jest.fn().mockReturnValue(query({ error: null })),
    } as never)
    await expect(service.deleteNote('note', { snapshot })).rejects.toThrow(
      /changed|conflict/i,
    )
    rpc.mockResolvedValue({ data: [], error: null })
    await expect(service.deleteNote('note', { snapshot })).rejects.toThrow(
      /confirm|incomplete/i,
    )
  })

  it('reads a page of owned card excerpts without downloading note bodies', async () => {
    const chain = query({
      data: [{ trash_id: 'entry', title: 'Deleted', preview_html: '<p>Excerpt</p>' }],
      count: 1,
      error: null,
    })
    const from = jest.fn().mockReturnValue(chain)
    const service = new NoteService({ from } as never)
    expect(await service.getTrash('owner')).toMatchObject({
      notes: [{ trash_id: 'entry', preview_html: '<p>Excerpt</p>' }],
      totalCount: 1,
    })
    expect(from).toHaveBeenCalledWith('notes_trash_list')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'owner')
    expect(
      chain.select.mock.calls[0][0].split(',').map((x: string) => x.trim()),
    ).not.toContain('description')
    expect(chain.select.mock.calls[0][0]).toContain('preview_html')
    expect(chain.range).toHaveBeenCalledWith(0, 49)
  })

  it('restores and purges only explicit Trash entry IDs', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({
        data: [{ trash_id: 'entry', status: 'restored' }],
        error: null,
      })
      .mockResolvedValueOnce({
        data: [{ trash_id: 'entry', status: 'purged' }],
        error: null,
      })
    const service = new NoteService({ rpc } as never)
    await service.restoreTrashedNotes(['entry'])
    expect(rpc).toHaveBeenCalledWith('restore_notes', { p_ids: ['entry'] })
    await service.purgeTrashedNotes(['entry'])
    expect(rpc).toHaveBeenCalledWith('purge_notes', { p_ids: ['entry'] })
  })

  it('keeps the latest queued draft in the durable delete payload', () => {
    const result = queue.buildTrashPayload(snapshot, 'owner', [
      {
        id: 'update',
        noteId: 'note',
        operation: 'update',
        payload: { user_id: 'owner', description: 'Newest' },
        status: 'pending',
        clientUpdatedAt: '2026-01-02',
      },
    ])
    expect(result).toMatchObject({
      user_id: 'owner',
      title: 'Local',
      description: 'Newest',
      tags: ['work'],
    })
  })

  it('refuses to lose an incomplete or foreign offline snapshot', () => {
    expect(() => queue.buildTrashPayload({ id: 'note' }, 'owner', [])).toThrow(
      /content|snapshot/i,
    )
    expect(() =>
      queue.buildTrashPayload(snapshot, 'another-owner', []),
    ).toThrow(/account|owner/i)
  })

  it('freezes all Trash IDs across keyset pages without reading bodies', async () => {
    const first = query({
      data: Array.from({ length: 500 }, (_, id) => ({
        trash_id: String(id),
        deleted_at: '2026-01-01',
      })),
      error: null,
    })
    const second = query({
      data: [{ trash_id: 'last', deleted_at: '2025-12-31' }],
      error: null,
    })
    const service = new NoteService({
      from: jest.fn().mockReturnValueOnce(first).mockReturnValueOnce(second),
    } as never)
    const ids = await service.getAllTrashIds('owner')
    expect(ids).toHaveLength(501)
    expect(ids[500]).toBe('last')
    expect(second.or).toHaveBeenCalledWith(
      expect.stringContaining('trash_id.lt.499'),
    )
  })

  it('fetches a full preview only for the selected owned entry', async () => {
    const chain = query({
      data: { trash_id: 'entry', description: '<p>Body</p>' },
      error: null,
    })
    const service = new NoteService({
      from: jest.fn().mockReturnValue(chain),
    } as never)
    expect(await service.getTrashedNote('entry', 'owner')).toMatchObject({
      description: '<p>Body</p>',
    })
    expect(chain.eq).toHaveBeenCalledWith('trash_id', 'entry')
    expect(chain.eq).toHaveBeenCalledWith('user_id', 'owner')
  })

  it('stops activity cleanup after the first incomplete batch', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValueOnce({ data: 100, error: null })
      .mockResolvedValueOnce({ data: 0, error: null })
    const service = new NoteService({ rpc } as never)
    expect(await service.cleanupExpiredTrash('run')).toBe(100)
    expect(rpc).toHaveBeenCalledTimes(2)
    expect(rpc).toHaveBeenCalledWith('cleanup_my_trash', { p_run: 'run' })
  })

  it('moves a batch with one server request and reports individual conflicts', async () => {
    const rpc = jest.fn().mockResolvedValue({
      data: [
        { id: 'one', status: 'trashed' },
        { id: 'two', status: 'conflict' },
      ],
      error: null,
    })
    const service = new NoteService({ rpc } as never)
    expect(await service.trashNotesBatch(['one', 'two'])).toEqual({
      succeeded: ['one'],
      failed: ['two'],
    })
    expect(rpc).toHaveBeenCalledWith('trash_notes', {
      p_notes: [{ id: 'one' }, { id: 'two' }],
    })
  })

  it('rejects a malformed or unrelated result before acknowledging a permanent action', async () => {
    const rpc = jest
      .fn()
      .mockResolvedValue({
        data: [{ trash_id: 'entry', status: 'unknown' }],
        error: null,
      })
    const service = new NoteService({ rpc } as never)
    await expect(service.purgeTrashedNotes(['entry'])).rejects.toThrow(
      /confirm/i,
    )
    rpc.mockResolvedValue({
      data: [
        { trash_id: 'entry', status: 'purged' },
        { trash_id: 'unrequested', status: 'purged' },
      ],
      error: null,
    })
    await expect(service.purgeTrashedNotes(['entry'])).rejects.toThrow(
      /confirm/i,
    )
  })
})
