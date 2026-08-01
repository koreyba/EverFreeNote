import { renderHook, waitFor } from '@testing-library/react-native'
import type { Note } from '@core/types/domain'
import { useTagManagementData } from '@ui/mobile/hooks/useTagManagement'
import { createQueryWrapper, createTestQueryClient } from '../testUtils'

const mockUseSupabase = jest.fn()
const mockUseNetworkStatus = jest.fn()
const mockGetAllNotes = jest.fn()
const mockSaveNotes = jest.fn()
const mockGetLocalNotes = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: () => mockUseSupabase(),
}))

jest.mock('@ui/mobile/hooks/useNetworkStatus', () => ({
  useNetworkStatus: () => mockUseNetworkStatus(),
}))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    getAllNotes: mockGetAllNotes,
  })),
}))

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    saveNotes: (...args: unknown[]) => mockSaveNotes(...args),
    getLocalNotes: (...args: unknown[]) => mockGetLocalNotes(...args),
  },
}))

const createNote = (id: string, tags: string[]): Note => ({
  id,
  title: id,
  description: '',
  tags,
  created_at: '2026-01-01T00:00:00.000Z',
  updated_at: '2026-01-01T00:00:00.000Z',
  user_id: 'user-1',
})

describe('useTagManagementData', () => {
  beforeEach(() => {
    jest.clearAllMocks()
  })

  it('loads the complete online note set, caches it, and derives tag summaries', async () => {
    const notes = [createNote('one', ['Work', 'work']), createNote('two', ['Personal'])]
    mockUseSupabase.mockReturnValue({ client: {}, user: { id: 'user-1' } })
    mockUseNetworkStatus.mockReturnValue(true)
    mockGetAllNotes.mockResolvedValue(notes)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useTagManagementData(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetAllNotes).toHaveBeenCalledWith('user-1')
    expect(mockSaveNotes).toHaveBeenCalledWith(notes)
    expect(result.current.allTags).toEqual([
      { name: 'Personal', count: 1, letter: 'P' },
      { name: 'Work', count: 1, letter: 'W' },
    ])
  })

  it('uses local notes while offline and keeps the same derivation contract', async () => {
    const localNotes = [createNote('local', ['Offline'])]
    mockUseSupabase.mockReturnValue({ client: {}, user: { id: 'user-1' } })
    mockUseNetworkStatus.mockReturnValue(false)
    mockGetLocalNotes.mockResolvedValue(localNotes)

    const queryClient = createTestQueryClient()
    const { result } = renderHook(() => useTagManagementData(), {
      wrapper: createQueryWrapper(queryClient),
    })

    await waitFor(() => expect(result.current.isSuccess).toBe(true))

    expect(mockGetLocalNotes).toHaveBeenCalledWith('user-1')
    expect(mockGetAllNotes).not.toHaveBeenCalled()
    expect(result.current.data?.usedLocalFallback).toBe(true)
    expect(result.current.allTags).toEqual([{ name: 'Offline', count: 1, letter: 'O' }])
  })
})
