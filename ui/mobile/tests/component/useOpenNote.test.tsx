import { createTestQueryClient, createQueryWrapper, renderHook, act } from '../testUtils'
import type { Note } from '@core/types/domain'
import { useOpenNote } from '@ui/mobile/hooks/useOpenNote'

const mockPush = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
  }),
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
  })

  it('opens a plain note route when chunk focus is not provided', () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    const note = createNote()

    const { result } = renderHook(() => useOpenNote(), { wrapper })

    act(() => {
      result.current(note)
    })

    expect(mockPush).toHaveBeenCalledWith('/note/note-1')
    expect(queryClient.getQueryData(['note', note.id])).toBeUndefined()
  })

  it('opens a focused chunk route without seeding the note query cache', () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    const note = createNote({
      id: 'note-42',
      title: 'Fallback title',
      updated_at: '2026-03-10T10:00:00.000Z',
    })

    const { result } = renderHook(() => useOpenNote(), { wrapper })

    act(() => {
      result.current(note, {
        chunkFocus: {
          charOffset: 128,
          chunkLength: 24,
          requestId: 'focus-request-1',
        },
      })
    })

    expect(queryClient.getQueryData(['note', 'note-42'])).toBeUndefined()
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

  it('generates a focus request id when one is not supplied', () => {
    const queryClient = createTestQueryClient()
    const wrapper = createQueryWrapper(queryClient)
    const note = createNote({ id: 'note-generated' })

    const { result } = renderHook(() => useOpenNote(), { wrapper })

    act(() => {
      result.current(note, {
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
})
