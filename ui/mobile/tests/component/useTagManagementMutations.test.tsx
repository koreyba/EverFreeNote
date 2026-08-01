import { act, createMockNote, createQueryWrapper, createTestQueryClient, renderHook } from '../testUtils'
import { useDeleteTag, useRenameTag } from '@ui/mobile/hooks/useTagManagementMutations'
import { getTagManagementQueryKey } from '@ui/mobile/hooks/useTagManagement'
const mockEnqueue = jest.fn().mockResolvedValue(undefined)
const mockSaveNotes = jest.fn().mockResolvedValue(undefined)
const mockGetLocalNotes = jest.fn()
const mockIsOnline = jest.fn(() => false)
const mockRenameTag = jest.fn()
const mockDeleteTag = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: () => ({
    client: {},
    user: { id: 'user-1' },
  }),
}))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    renameTag: mockRenameTag,
    deleteTag: mockDeleteTag,
  })),
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
    mockGetLocalNotes.mockResolvedValue([])
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

  it('persists a successful online rename and does not enqueue it', async () => {
    const localNote = createMockNote({ id: 'note-1', tags: ['Old'] })
    const persistedNote = createMockNote({ id: 'note-1', tags: ['New'] })
    mockGetLocalNotes.mockResolvedValue([localNote])
    mockIsOnline.mockReturnValue(true)
    mockRenameTag.mockResolvedValue([persistedNote])

    const { result } = renderHook(() => useRenameTag(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    let mutationResult
    await act(async () => {
      mutationResult = await result.current.mutateAsync({ tag: ' Old ', replacement: ' New ' })
    })

    expect(mutationResult).toEqual({ queued: false, changedNotes: [persistedNote] })
    expect(mockRenameTag).toHaveBeenCalledWith('user-1', 'Old', 'New')
    expect(mockEnqueue).not.toHaveBeenCalled()
    expect(mockSaveNotes).toHaveBeenLastCalledWith([
      expect.objectContaining({ id: 'note-1', tags: ['New'], is_synced: 1, is_deleted: 0 }),
    ])
  })

  it('uses the delete operation for an online mutation with no persisted changes', async () => {
    mockIsOnline.mockReturnValue(true)
    mockDeleteTag.mockResolvedValue([])

    const { result } = renderHook(() => useDeleteTag(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await act(async () => {
      await result.current.mutateAsync({ tag: ' Old ' })
    })

    expect(mockDeleteTag).toHaveBeenCalledWith('user-1', 'Old')
    expect(mockSaveNotes).not.toHaveBeenCalled()
    expect(mockEnqueue).not.toHaveBeenCalled()
  })

  it('queues an online mutation when the remote service fails', async () => {
    mockIsOnline.mockReturnValue(true)
    mockRenameTag.mockRejectedValue(new Error('remote failure'))

    const { result } = renderHook(() => useRenameTag(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await act(async () => {
      await result.current.mutateAsync({ tag: 'Old', replacement: 'New' })
    })

    expect(mockEnqueue).toHaveBeenCalledWith(expect.objectContaining({
      operation: 'renameTag',
      payload: { tag: 'old', replacement: 'New', user_id: 'user-1' },
    }))
  })

  it('rejects invalid tag inputs before touching local storage', async () => {
    const { result } = renderHook(() => useRenameTag(), {
      wrapper: createQueryWrapper(createTestQueryClient()),
    })

    await act(async () => {
      await expect(result.current.mutateAsync({ tag: ' ', replacement: 'New' }))
        .rejects.toThrow('Tag cannot be empty')
    })
    await act(async () => {
      await expect(result.current.mutateAsync({ tag: 'Old', replacement: ' ' }))
        .rejects.toThrow('Replacement tag cannot be empty')
    })
    expect(mockGetLocalNotes).not.toHaveBeenCalled()
  })

  it('restores the previous cache when mutation setup fails', async () => {
    const localNote = createMockNote({ id: 'note-1', tags: ['Old'] })
    const queryClient = createTestQueryClient()
    queryClient.setQueryData(getTagManagementQueryKey('user-1'), {
      notes: [localNote],
      usedLocalFallback: true,
    })
    mockGetLocalNotes.mockRejectedValue(new Error('storage failure'))

    const { result } = renderHook(() => useRenameTag(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await act(async () => {
      await expect(result.current.mutateAsync({ tag: 'Old', replacement: 'New' }))
        .rejects.toThrow('storage failure')
    })
    expect(queryClient.getQueryData(getTagManagementQueryKey('user-1'))).toEqual({
      notes: [localNote],
      usedLocalFallback: true,
    })
    expect(mockSaveNotes).toHaveBeenCalledWith([localNote])
  })
})
