import React from 'react'
import { render, screen, fireEvent } from '@testing-library/react-native'
import { AIIndexPanel } from '@ui/mobile/components/settings/AIIndexPanel'
import type { AIIndexNoteRow } from '@core/types/aiIndex'

const mockRefetch = jest.fn()
const mockFetchNextPage = jest.fn()
const mockInvalidateQueries = jest.fn()

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

const mockUseAIIndexNotes = jest.fn()
const mockUseFlattenedAIIndexNotes = jest.fn()

jest.mock('@ui/mobile/hooks/useAIIndexNotes', () => ({
  useAIIndexNotes: (...args: unknown[]) => mockUseAIIndexNotes(...args),
  useFlattenedAIIndexNotes: (...args: unknown[]) => mockUseFlattenedAIIndexNotes(...args),
  getAIIndexNotesQueryKey: jest.fn((...args: unknown[]) => ['ai-index-notes', ...args]),
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
    ...overrides,
  })
  mockUseFlattenedAIIndexNotes.mockReturnValue(notes)
}

describe('AIIndexPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    setupMocks()
  })

  it('renders filter chips', () => {
    render(<AIIndexPanel />)
    expect(screen.getByText('All')).toBeTruthy()
    expect(screen.getAllByText('Indexed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getAllByText('Not indexed').length).toBeGreaterThanOrEqual(1)
    expect(screen.getByText('Outdated')).toBeTruthy()
  })

  it('renders search input', () => {
    render(<AIIndexPanel />)
    expect(screen.getByPlaceholderText('Search notes…')).toBeTruthy()
  })

  it('renders note cards', () => {
    render(<AIIndexPanel />)
    expect(screen.getByText('Note One')).toBeTruthy()
    expect(screen.getByText('Note Two')).toBeTruthy()
  })

  it('shows summary text', () => {
    render(<AIIndexPanel />)
    expect(screen.getByText('2 notes')).toBeTruthy()
  })

  it('shows loading state', () => {
    setupMocks({ isLoading: true }, [])
    render(<AIIndexPanel />)
    expect(screen.getByText('Loading notes…')).toBeTruthy()
  })

  it('shows empty state', () => {
    setupMocks({}, [])
    render(<AIIndexPanel />)
    expect(screen.getByText('No notes found yet.')).toBeTruthy()
  })

  it('shows error state with retry', () => {
    setupMocks({ isError: true }, [])
    render(<AIIndexPanel />)
    expect(screen.getByText('Failed to load notes.')).toBeTruthy()
    expect(screen.getByText('Retry')).toBeTruthy()

    fireEvent.press(screen.getByText('Retry'))
    expect(mockRefetch).toHaveBeenCalled()
  })
})
