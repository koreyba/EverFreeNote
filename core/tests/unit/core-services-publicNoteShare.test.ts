import { PublicNoteShareService, buildPublicNoteUrl } from '@core/services/publicNoteShare'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('core/services/publicNoteShare', () => {
  let mockSupabase: jest.Mocked<SupabaseClient>
  let service: PublicNoteShareService

  const shareLink = {
    id: 'share-1',
    note_id: 'note-1',
    user_id: 'user-1',
    token: 'abc123',
    permission: 'view',
    is_active: true,
    created_at: '2026-04-28T10:00:00.000Z',
    updated_at: '2026-04-28T10:00:00.000Z',
  }

  beforeEach(() => {
    mockSupabase = {
      from: jest.fn(),
      rpc: jest.fn(),
    } as unknown as jest.Mocked<SupabaseClient>
    service = new PublicNoteShareService(mockSupabase)
  })

  function mockFindExisting(result: { data: typeof shareLink | null; error: unknown }) {
    const maybeSingle = jest.fn().mockResolvedValue(result)
    const eqIsActive = jest.fn().mockReturnValue({ maybeSingle })
    const eqPermission = jest.fn().mockReturnValue({ eq: eqIsActive })
    const eqUserId = jest.fn().mockReturnValue({ eq: eqPermission })
    const eqNoteId = jest.fn().mockReturnValue({ eq: eqUserId })
    const select = jest.fn().mockReturnValue({ eq: eqNoteId })

    mockSupabase.from.mockReturnValueOnce({
      select,
    } as unknown as ReturnType<typeof mockSupabase.from>)

    return { select, eqNoteId, eqUserId, eqPermission, eqIsActive, maybeSingle }
  }

  function mockInsert(result: { data: typeof shareLink | null; error: unknown }) {
    const single = jest.fn().mockResolvedValue(result)
    const select = jest.fn().mockReturnValue({ single })
    const insert = jest.fn().mockReturnValue({ select })

    mockSupabase.from.mockReturnValueOnce({
      insert,
    } as unknown as ReturnType<typeof mockSupabase.from>)

    return { insert, select, single }
  }

  it('builds encoded public note URLs from an injected origin', () => {
    expect(buildPublicNoteUrl('https://notes.example.com/', 'token value')).toBe(
      'https://notes.example.com/share/?token=token%20value'
    )
  })

  it('reuses an existing active view link', async () => {
    const chain = mockFindExisting({ data: shareLink, error: null })

    await expect(service.getOrCreateViewLink('note-1', 'user-1')).resolves.toEqual(shareLink)

    expect(mockSupabase.from).toHaveBeenCalledWith('note_share_links')
    expect(chain.eqNoteId).toHaveBeenCalledWith('note_id', 'note-1')
    expect(chain.eqUserId).toHaveBeenCalledWith('user_id', 'user-1')
    expect(chain.eqPermission).toHaveBeenCalledWith('permission', 'view')
    expect(chain.eqIsActive).toHaveBeenCalledWith('is_active', true)
  })

  it('creates a view link when no active link exists', async () => {
    mockFindExisting({ data: null, error: null })
    const insertChain = mockInsert({ data: shareLink, error: null })

    await expect(service.getOrCreateViewLink('note-1', 'user-1')).resolves.toEqual(shareLink)

    expect(insertChain.insert).toHaveBeenCalledWith([
      {
        note_id: 'note-1',
        user_id: 'user-1',
        permission: 'view',
      },
    ])
  })

  it('retries lookup after an insert conflict and returns the existing link', async () => {
    mockFindExisting({ data: null, error: null })
    mockInsert({ data: null, error: { message: 'duplicate key value violates unique constraint' } })
    mockFindExisting({ data: shareLink, error: null })

    await expect(service.getOrCreateViewLink('note-1', 'user-1')).resolves.toEqual(shareLink)
  })

  it('throws actionable errors when link creation fails', async () => {
    mockFindExisting({ data: null, error: null })
    mockInsert({ data: null, error: { message: 'RLS denied' } })
    mockFindExisting({ data: null, error: null })

    await expect(service.getOrCreateViewLink('note-1', 'user-1')).rejects.toThrow('RLS denied')
  })

  it('uses fallback messages for non-standard lookup and insert errors', async () => {
    mockFindExisting({ data: null, error: {} })

    await expect(service.getOrCreateViewLink('note-1', 'user-1')).rejects.toThrow('Failed to load share link')

    mockFindExisting({ data: null, error: null })
    mockInsert({ data: null, error: {} })
    mockFindExisting({ data: null, error: null })

    await expect(service.getOrCreateViewLink('note-1', 'user-1')).rejects.toThrow('Failed to create share link')
  })

  it('loads public note projection by token', async () => {
    const publicNote = {
      token: 'abc123',
      title: 'Shared',
      description: '<p>Body</p>',
      tags: ['one'],
      created_at: '2026-04-28T10:00:00.000Z',
      updated_at: '2026-04-28T10:00:00.000Z',
    }
    const maybeSingle = jest.fn().mockResolvedValue({ data: publicNote, error: null })
    mockSupabase.rpc.mockReturnValue({
      maybeSingle,
    } as unknown as ReturnType<typeof mockSupabase.rpc>)

    await expect(service.getPublicNoteByToken(' abc123 ')).resolves.toEqual(publicNote)

    expect(mockSupabase.rpc).toHaveBeenCalledWith('get_public_note_by_token', { share_token: 'abc123' })
    expect(maybeSingle).toHaveBeenCalled()
  })

  it('returns null for blank or missing public tokens', async () => {
    await expect(service.getPublicNoteByToken('   ')).resolves.toBeNull()
    expect(mockSupabase.rpc).not.toHaveBeenCalled()

    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: null })
    mockSupabase.rpc.mockReturnValue({
      maybeSingle,
    } as unknown as ReturnType<typeof mockSupabase.rpc>)

    await expect(service.getPublicNoteByToken('missing')).resolves.toBeNull()
  })

  it('throws fallback errors for failed public token lookups', async () => {
    const maybeSingle = jest.fn().mockResolvedValue({ data: null, error: {} })
    mockSupabase.rpc.mockReturnValue({
      maybeSingle,
    } as unknown as ReturnType<typeof mockSupabase.rpc>)

    await expect(service.getPublicNoteByToken('abc123')).rejects.toThrow('Failed to load public note')
  })
})
