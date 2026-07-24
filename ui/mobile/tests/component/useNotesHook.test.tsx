import { renderHook, waitFor } from '@testing-library/react-native'
import { createQueryWrapper, createTestQueryClient } from '../testUtils'
import { useNotes, useNote } from '../../hooks/useNotes'
import type { Note } from '@core/types/domain'

const mockUseSupabase = jest.fn()
const mockUseNetworkStatus = jest.fn()
const mockGetNotes = jest.fn()
const mockGetNoteStatus = jest.fn()
const mockSaveNotes = jest.fn()
const mockGetLocalNotes = jest.fn()
const mockHasPendingWrites = jest.fn()
const mockMarkDeleted = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: () => mockUseSupabase(),
}))

jest.mock('../../hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    getNotes: mockGetNotes,
    getNoteStatus: mockGetNoteStatus,
  })),
}))

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    saveNotes: (...args: unknown[]) => mockSaveNotes(...args),
    getLocalNotes: (...args: unknown[]) => mockGetLocalNotes(...args),
    hasPendingWrites: (...args: unknown[]) => mockHasPendingWrites(...args),
    markDeleted: (...args: unknown[]) => mockMarkDeleted(...args),
  },
}))

describe('useNotes & useNote hooks', () => {
  const mockNote: Note = {
    id: 'note-1',
    title: 'Test Note 1',
    description: 'Content',
    tags: [],
    created_at: '2026-01-01T00:00:00Z',
    updated_at: '2026-01-01T00:00:00Z',
    user_id: 'user-123',
  }

  beforeEach(() => {
    jest.clearAllMocks()
    jest.spyOn(console, 'warn').mockImplementation(() => {})
  })

  describe('useNotes', () => {
    it('throws error if user is unauthenticated when queryFn runs', async () => {
      mockUseSupabase.mockReturnValue({ user: null, client: {} })
      mockUseNetworkStatus.mockReturnValue(true)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useNotes(), {
        wrapper: createQueryWrapper(queryClient),
      })

      expect(result.current.isFetching).toBe(false)
      const refetchResult = await result.current.refetch()
      expect(refetchResult.isError).toBe(true)
      expect(refetchResult.error?.message).toBe('User not authenticated')
    })

    it('when online, fetches notes via NoteService and caches in local DB via databaseService.saveNotes', async () => {
      mockUseSupabase.mockReturnValue({ user: { id: 'user-123' }, client: {} })
      mockUseNetworkStatus.mockReturnValue(true)
      mockGetNotes.mockResolvedValue({ notes: [mockNote], totalCount: 1, hasMore: false })
      mockSaveNotes.mockResolvedValue(undefined)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useNotes(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockGetNotes).toHaveBeenCalledWith('user-123', {
        page: 0,
        pageSize: 50,
        tag: undefined,
        searchQuery: undefined,
      })
      expect(mockSaveNotes).toHaveBeenCalledWith([mockNote])
      expect(result.current.data?.pages[0].notes).toEqual([mockNote])
    })

    it('when offline or when fetch throws error, falls back to databaseService.getLocalNotes', async () => {
      mockUseSupabase.mockReturnValue({ user: { id: 'user-123' }, client: {} })
      mockUseNetworkStatus.mockReturnValue(false)
      mockGetLocalNotes.mockResolvedValue([mockNote])

      const queryClient = createTestQueryClient()
      const { result: offlineResult } = renderHook(() => useNotes(), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => {
        expect(offlineResult.current.isSuccess).toBe(true)
      })

      expect(mockGetNotes).not.toHaveBeenCalled()
      expect(mockGetLocalNotes).toHaveBeenCalledWith('user-123')
      expect(offlineResult.current.data?.pages[0].notes).toEqual([mockNote])

      // Error fallback case
      mockUseNetworkStatus.mockReturnValue(true)
      mockGetNotes.mockRejectedValue(new Error('Network error'))

      const queryClient2 = createTestQueryClient()
      const { result: errorResult } = renderHook(() => useNotes(), {
        wrapper: createQueryWrapper(queryClient2),
      })

      await waitFor(() => {
        expect(errorResult.current.isSuccess).toBe(true)
      })

      expect(errorResult.current.data?.pages[0].notes).toEqual([mockNote])
    })
  })

  describe('useNote', () => {
    it('returns local note when databaseService.hasPendingWrites is true', async () => {
      mockUseSupabase.mockReturnValue({ user: { id: 'user-123' }, client: {} })
      mockUseNetworkStatus.mockReturnValue(true)
      mockHasPendingWrites.mockResolvedValue(true)
      mockGetLocalNotes.mockResolvedValue([mockNote])

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useNote('note-1'), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockHasPendingWrites).toHaveBeenCalledWith('note-1')
      expect(mockGetNoteStatus).not.toHaveBeenCalled()
      expect(result.current.data).toEqual({ note: mockNote, status: 'found' })
    })

    it('when online, fetches remote status via NoteService and caches if found', async () => {
      mockUseSupabase.mockReturnValue({ user: { id: 'user-123' }, client: {} })
      mockUseNetworkStatus.mockReturnValue(true)
      mockHasPendingWrites.mockResolvedValue(false)
      mockGetNoteStatus.mockResolvedValue({ status: 'found', note: mockNote })
      mockSaveNotes.mockResolvedValue(undefined)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useNote('note-1'), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockGetNoteStatus).toHaveBeenCalledWith('note-1')
      expect(mockSaveNotes).toHaveBeenCalledWith([mockNote])
      expect(result.current.data).toEqual({ note: mockNote, status: 'found' })
    })

    it("if remote status is 'not_found', calls databaseService.markDeleted and invalidates query", async () => {
      mockUseSupabase.mockReturnValue({ user: { id: 'user-123' }, client: {} })
      mockUseNetworkStatus.mockReturnValue(true)
      mockHasPendingWrites.mockResolvedValue(false)
      mockGetNoteStatus.mockResolvedValue({ status: 'not_found' })
      mockMarkDeleted.mockResolvedValue(undefined)

      const queryClient = createTestQueryClient()
      const { result } = renderHook(() => useNote('note-1'), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => {
        expect(result.current.isSuccess).toBe(true)
      })

      expect(mockMarkDeleted).toHaveBeenCalledWith('note-1', 'user-123')
      expect(result.current.data).toEqual({ note: null, status: 'deleted' })
    })

    it('when offline or on fetch error, falls back to databaseService.getLocalNotes', async () => {
      mockUseSupabase.mockReturnValue({ user: { id: 'user-123' }, client: {} })
      mockUseNetworkStatus.mockReturnValue(false)
      mockGetLocalNotes.mockResolvedValue([mockNote])

      const queryClient = createTestQueryClient()
      const { result: offlineResult } = renderHook(() => useNote('note-1'), {
        wrapper: createQueryWrapper(queryClient),
      })

      await waitFor(() => {
        expect(offlineResult.current.isSuccess).toBe(true)
      })

      expect(mockGetNoteStatus).not.toHaveBeenCalled()
      expect(mockGetLocalNotes).toHaveBeenCalledWith('user-123')
      expect(offlineResult.current.data).toEqual({ note: mockNote, status: 'found' })

      // Fetch error case
      mockUseNetworkStatus.mockReturnValue(true)
      mockHasPendingWrites.mockResolvedValue(false)
      mockGetNoteStatus.mockResolvedValue({ status: 'error', error: new Error('Remote error') })

      const queryClient2 = createTestQueryClient()
      const { result: errorResult } = renderHook(() => useNote('note-1'), {
        wrapper: createQueryWrapper(queryClient2),
      })

      await waitFor(() => {
        expect(errorResult.current.isSuccess).toBe(true)
      })

      expect(errorResult.current.data).toEqual({ note: mockNote, status: 'found' })
    })
  })
})
