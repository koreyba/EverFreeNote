import {
  act,
  createQueryWrapper,
  createTestQueryClient,
  renderHook,
  TEST_USER_ID,
} from '../testUtils'

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    markDeleted: jest.fn().mockResolvedValue(undefined),
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNotes: jest.fn().mockResolvedValue([]),
    getLocalNoteById: jest.fn().mockResolvedValue(null),
    hasPendingWrites: jest.fn().mockResolvedValue(false),
    searchNotes: jest.fn().mockResolvedValue([]),
  },
}))

let mockIsOnline = true
jest.mock('@ui/mobile/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => mockIsOnline),
}))

const mockEnqueue = jest.fn().mockResolvedValue(undefined)
jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    getManager: jest.fn().mockReturnValue({
      enqueue: mockEnqueue,
    }),
  },
}))

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {},
    user: { id: 'test-user-id' },
  })),
}))

jest.mock('@core/services/notes')

import { databaseService } from '@ui/mobile/services/database'
import { mobileSyncService } from '@ui/mobile/services/sync'
import { useUpdateNote } from '@ui/mobile/hooks/useNotesMutations'
import { NoteService } from '@core/services/notes'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>
const mockSaveNotes = databaseService.saveNotes as jest.Mock
const mockGetLocalNotes = databaseService.getLocalNotes as jest.Mock
const mockGetManager = mobileSyncService.getManager as jest.Mock

describe('useUpdateNote', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsOnline = true
    mockGetManager.mockReturnValue({
      enqueue: mockEnqueue,
    })
    mockSaveNotes.mockResolvedValue(undefined)
    mockGetLocalNotes.mockResolvedValue([
      {
        id: 'note-1',
        title: 'Existing title',
        description: '<p>Existing body</p>',
        tags: ['tag1'],
        created_at: '2026-03-01T10:00:00.000Z',
        updated_at: '2026-03-01T10:00:00.000Z',
        user_id: TEST_USER_ID,
      },
    ])
    mockNoteService.prototype.updateNote = jest.fn().mockResolvedValue({
      id: 'note-1',
      title: 'Existing title',
      description: '<p>Updated body</p>',
      tags: ['tag1'],
      created_at: '2026-03-01T10:00:00.000Z',
      updated_at: '2026-03-16T10:00:00.000Z',
      user_id: TEST_USER_ID,
    })
    mockNoteService.prototype.createNote = jest.fn().mockResolvedValue({
      id: 'note-1',
      title: 'Existing title',
      description: '<p>Updated body</p>',
      tags: ['tag1'],
      created_at: '2026-03-01T10:00:00.000Z',
      updated_at: '2026-03-16T10:00:00.000Z',
      user_id: TEST_USER_ID,
    })
  })

  it('updates the remote note directly when it still exists', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)

    const { result } = renderHook(() => useUpdateNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'note-1',
        updates: { description: '<p>Updated body</p>' },
      })
    })

    expect(mockNoteService.prototype.updateNote).toHaveBeenCalledWith('note-1', {
      description: '<p>Updated body</p>',
    })
    expect(mockNoteService.prototype.createNote).not.toHaveBeenCalled()
  })

  it('re-creates the note with the same id when remote update fails with PGRST116', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    const pgrst116 = Object.assign(new Error('PGRST116'), { code: 'PGRST116' })

    mockNoteService.prototype.updateNote = jest.fn().mockRejectedValue(pgrst116)

    const { result } = renderHook(() => useUpdateNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'note-1',
        updates: { description: '<p>Updated body</p>' },
      })
    })

    expect(mockNoteService.prototype.updateNote).toHaveBeenCalledWith('note-1', {
      description: '<p>Updated body</p>',
    })
    expect(mockNoteService.prototype.createNote).toHaveBeenCalledWith({
      id: 'note-1',
      title: 'Existing title',
      description: '<p>Updated body</p>',
      tags: ['tag1'],
      userId: TEST_USER_ID,
    })
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('stores a full merged payload in the queue when offline', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    mockIsOnline = false

    const { result } = renderHook(() => useUpdateNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync({
        id: 'note-1',
        updates: { description: '<p>Offline body</p>' },
      })
    })

    expect(mockNoteService.prototype.updateNote).not.toHaveBeenCalled()
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({
      noteId: 'note-1',
      operation: 'update',
      payload: {
        title: 'Existing title',
        description: '<p>Offline body</p>',
        tags: ['tag1'],
        user_id: TEST_USER_ID,
      },
    }))
  })
})
