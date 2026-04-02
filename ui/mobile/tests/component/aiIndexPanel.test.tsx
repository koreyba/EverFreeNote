import React from 'react'
import { fireEvent, render, screen, waitFor, act } from '@testing-library/react-native'
import { AIIndexPanel } from '@ui/mobile/components/settings/AIIndexPanel'
import type { AIIndexNoteRow } from '@core/types/aiIndex'

const mockRefetch = jest.fn()
const mockFetchNextPage = jest.fn()
const mockInvalidateQueries = jest.fn()
const mockUseAIIndexNotes = jest.fn()
const mockUseFlattenedAIIndexNotes = jest.fn()
const mockNoteCard = jest.fn()

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      mutedForeground: '#666666',
      destructive: '#ff0000',
      selectionBackground: '#f2fff2',
      selectionBorder: '#00aa00',
      selectionForeground: '#006600',
      primary: '#00aa00',
      primaryForeground: '#ffffff',
      secondary: '#f7f7f7',
      secondaryForeground: '#222222',
      destructiveForeground: '#ffffff',
      accent: '#f2f2f2',
      ring: '#00aa00',
    },
  }),
  useSupabase: () => ({
    client: { functions: { invoke: jest.fn() } },
    user: { id: 'test-user-id' },
  }),
}))

jest.mock('@tanstack/react-query', () => {
  const actual = jest.requireActual('@tanstack/react-query')
  return {
    ...actual,
    useQueryClient: () => ({ invalidateQueries: mockInvalidateQueries }),
  }
})

jest.mock('@ui/mobile/hooks/useAIIndexNotes', () => ({
  useAIIndexNotes: (...args: unknown[]) => mockUseAIIndexNotes(...args),
  useFlattenedAIIndexNotes: (...args: unknown[]) => mockUseFlattenedAIIndexNotes(...args),
  getAIIndexNotesQueryPrefix: jest.fn((userId: string | undefined) => ['ai-index-notes', userId ?? null]),
}))

jest.mock('@ui/mobile/components/settings/AIIndexNoteCard', () => ({
  AIIndexNoteCard: (props: unknown) => {
    mockNoteCard(props)
    const typedProps = props as {
      note: AIIndexNoteRow
      onMutated: (result: { noteId: string; previousStatus: string; nextStatus: string }) => void
    }

    return (
      <>
        <>{typedProps.note.title}</>
      </>
    )
  },
}))

const sampleNotes: AIIndexNoteRow[] = [
  { id: 'n1', title: 'Note One', updatedAt: '2025-06-01', lastIndexedAt: '2025-06-01', status: 'indexed' },
  { id: 'n2', title: 'Note Two', updatedAt: '2025-06-01', lastIndexedAt: null, status: 'not_indexed' },
]

function setupMocks(overrides: Record<string, unknown> = {}, notes: AIIndexNoteRow[] = sampleNotes) {
  mockUseAIIndexNotes.mockReturnValue({
    data: { pages: [{ notes, totalCount: notes.length, hasMore: false }] },
    isLoading: false,
    isError: false,
    isRefetching: false,
    isFetchingNextPage: false,
    hasNextPage: false,
    fetchNextPage: mockFetchNextPage,
    refetch: mockRefetch,
    error: null,
    ...overrides,
  })
  mockUseFlattenedAIIndexNotes.mockReturnValue(notes)
}

describe('AIIndexPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    jest.useFakeTimers()
    setupMocks()
  })

  afterEach(() => {
    act(() => {
      jest.runOnlyPendingTimers()
    })
    jest.useRealTimers()
  })

  it('renders filter chips and summary text', () => {
    render(<AIIndexPanel />)

    expect(screen.getAllByText('All notes').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Indexed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Not indexed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Outdated')).toBeTruthy()
    expect(screen.getByText('2 visible')).toBeTruthy()
    expect(screen.getByText('2 notes')).toBeTruthy()
    expect(screen.getAllByRole('tab')).toHaveLength(4)
    expect(mockNoteCard).toHaveBeenCalledTimes(2)
    expect(
      mockNoteCard.mock.calls.map((call) => (call[0] as { note: AIIndexNoteRow }).note.title)
    ).toEqual(['Note One', 'Note Two'])
  })

  it('renders search input with ASCII placeholder', () => {
    render(<AIIndexPanel />)
    expect(screen.getByPlaceholderText('Search notes...')).toBeTruthy()
  })

  it('passes selected filter into the hook', () => {
    render(<AIIndexPanel />)

    fireEvent.press(screen.getByText('Outdated'))

    expect(mockUseAIIndexNotes).toHaveBeenLastCalledWith('outdated', '')
  })

  it('debounces the search query with the shared minimum length rule', async () => {
    render(<AIIndexPanel />)

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'he')

    act(() => {
      jest.advanceTimersByTime(300)
    })

    expect(mockUseAIIndexNotes).toHaveBeenLastCalledWith('all', '')
    expect(screen.getByText('Search starts after 3 characters.')).toBeTruthy()

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'hello')

    act(() => {
      jest.advanceTimersByTime(300)
    })

    await waitFor(() => {
      expect(mockUseAIIndexNotes).toHaveBeenLastCalledWith('all', 'hello')
    })
  })

  it('shows loading state', () => {
    setupMocks({ isLoading: true }, [])
    render(<AIIndexPanel />)
    expect(screen.getByText('Loading AI index notes...')).toBeTruthy()
  })

  it('shows empty state recovery actions', () => {
    setupMocks({}, [])
    render(<AIIndexPanel />)
    expect(screen.getByText('No notes found yet.')).toBeTruthy()
  })

  it('shows detailed error state with retry', () => {
    setupMocks({ isError: true, error: new Error('RPC unavailable') }, [])
    render(<AIIndexPanel />)

    expect(screen.getByText('AI Index is unavailable')).toBeTruthy()
    expect(screen.getByText('RPC unavailable')).toBeTruthy()

    fireEvent.press(screen.getByText('Retry'))
    expect(mockRefetch).toHaveBeenCalled()
  })

  it('loads the next page when the list reaches the threshold', () => {
    setupMocks({ hasNextPage: true })
    render(<AIIndexPanel />)

    fireEvent(screen.getByTestId('ai-index-list'), 'onEndReached')

    expect(mockFetchNextPage).toHaveBeenCalled()
  })

  it('invalidates the AI Index query prefix after a card mutation', () => {
    render(<AIIndexPanel />)

    const cardProps = mockNoteCard.mock.calls.at(-1)?.[0] as {
      onMutated: (result: { noteId: string; previousStatus: string; nextStatus: string }) => void
    }

    act(() => {
      cardProps.onMutated({
        noteId: 'n1',
        previousStatus: 'indexed',
        nextStatus: 'not_indexed',
      })
    })

    expect(mockInvalidateQueries).toHaveBeenCalledWith({
      queryKey: ['ai-index-notes', 'test-user-id'],
    })
  })
})
