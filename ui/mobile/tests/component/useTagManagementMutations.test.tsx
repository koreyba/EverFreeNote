import { act, createMockNote, createQueryWrapper, createTestQueryClient, renderHook } from '../testUtils'
import { useRenameTag } from '@ui/mobile/hooks/useTagManagementMutations'
import { getTagManagementQueryKey } from '@ui/mobile/hooks/useTagManagement'
const mockEnqueue = jest.fn().mockResolvedValue(undefined)
const mockSaveNotes = jest.fn().mockResolvedValue(undefined)
const mockGetLocalNotes = jest.fn()
const mockIsOnline = jest.fn(() => false)

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: () => ({
    client: {},
    user: { id: 'user-1' },
  }),
}))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn(),
}))

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    getLocalNotes: (...args: unknown[]) => mockGetLocalNotes(...args),
    saveNotes: (...args: unknown[]) => mockSaveNotes(...args),
  },
}))

jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    getManager: () => ({ enqueue: mockEnqueue }),
  },
}))

jest.mock('@ui/mobile/adapters/networkStatus', () => ({
  mobileNetworkStatusProvider: {
    isOnline: () => mockIsOnline(),
  },
}))

describe('useTagManagementMutations', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockIsOnline.mockReturnValue(false)
  })

  it('persists the original local notes with renamed tags before queuing offline replay', async () => {
    const localNote = createMockNote({ id: 'note-1', tags: ['Old', 'keep'] })
    mockGetLocalNotes.mockResolvedValue([localNote])
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(getTagManagementQueryKey('user-1'), {
      notes: [localNote],
      usedLocalFallback: true,
    })

    const { result } = renderHook(() => useRenameTag(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await act(async () => {
      await result.current.mutateAsync({ tag: 'old', replacement: 'New' })
    })

    expect(mockSaveNotes).toHaveBeenCalledWith([
      expect.objectContaining({
        id: 'note-1',
        tags: ['New', 'keep'],
        is_synced: 0,
      }),
    ])
    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({
      noteId: 'tag:user-1:renameTag:old',
      operation: 'renameTag',
      payload: {
        tag: 'old',
        replacement: 'New',
        user_id: 'user-1',
      },
    }))
    expect(queryClient.getQueryData(getTagManagementQueryKey('user-1'))).toEqual({
      notes: [{ ...localNote, tags: ['New', 'keep'] }],
      usedLocalFallback: true,
    })
  })
})
