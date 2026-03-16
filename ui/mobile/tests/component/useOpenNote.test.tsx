import { createTestQueryClient, createQueryWrapper, renderHook, act } from '../testUtils'
import type { Note } from '@core/types/domain'
import { useOpenNote } from '@ui/mobile/hooks/useOpenNote'

const mockPush = jest.fn()
const mockGetLocalNoteById = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
}))

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    getLocalNoteById: (...args: unknown[]) => mockGetLocalNoteById(...args),
  },
}))

const createNote = (overrides: Partial<Note> = {}): Note => ({
  id: overrides.id ?? 'note-1',
  title: overrides.title ?? 'Original title',
  description: overrides.description ?? 'Original description',
  tags: overrides.tags ?? ['focus'],
  created_at: overrides.created_at ?? '2026-03-10T10:00:00.000Z',
  updated_at: overrides.updated_at ?? '2026-03-10T10:00:00.000Z',
  user_id: overrides.user_id ?? 'test-user-id',
})

describe('useOpenNote', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    mockGetLocalNoteById.mockResolvedValue(null)
  })

  it('opens a plain note route and seeds the detail cache when chunk focus is not provided', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    const note = createNote()

    const { result } = renderHook(() => useOpenNote(), { wrapper })

    await act(async () => {
      await result.current(note)
    })

    expect(mockPush).toHaveBeenCalledWith('/note/note-1')
    expect(queryClient.getQueryData(['note', note.id])).toEqual({
      note,
      status: 'found',
    })
  })

  it('opens a focused chunk route and seeds the note detail cache', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    const note = createNote({
      id: 'note-42',
      title: 'Fallback title',
      updated_at: '2026-03-10T10:00:00.000Z',
    })

    const { result } = renderHook(() => useOpenNote(), { wrapper })

    await act(async () => {
      await result.current(note, {
        chunkFocus: {
          charOffset: 128,
          chunkLength: 24,
          requestId: 'focus-request-1',
        },
      })
    })

    expect(queryClient.getQueryData(['note', 'note-42'])).toEqual({
      note,
      status: 'found',
    })
    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/note/[id]',
      params: {
        id: 'note-42',
        focusOffset: '128',
        focusLength: '24',
        focusRequestId: 'focus-request-1',
      },
    })
  })

  it('generates a focus request id when one is not supplied', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    const note = createNote({ id: 'note-generated' })

    const { result } = renderHook(() => useOpenNote(), { wrapper })

    await act(async () => {
      await result.current(note, {
        chunkFocus: {
          charOffset: 42,
          chunkLength: 9,
        },
      })
    })

    expect(mockPush).toHaveBeenCalledWith({
      pathname: '/note/[id]',
      params: expect.objectContaining({
        id: 'note-generated',
        focusOffset: '42',
        focusLength: '9',
        focusRequestId: expect.stringMatching(/^note-generated:42:9:.+$/),
      }),
    })
  })

  it('falls back to the local database when only the note id is available', async () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    const localNote = createNote({
      id: 'note-local',
      title: 'Local title',
      description: 'Local description',
    })

    mockGetLocalNoteById.mockResolvedValue(localNote)

    const { result } = renderHook(() => useOpenNote(), { wrapper })

    await act(async () => {
      await result.current({ id: 'note-local' })
    })

    expect(mockGetLocalNoteById).toHaveBeenCalledWith('note-local')
    expect(queryClient.getQueryData(['note', 'note-local'])).toEqual({
      note: localNote,
      status: 'found',
    })
    expect(mockPush).toHaveBeenCalledWith('/note/note-local')
  })
})
