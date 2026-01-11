/**
 * Integration tests for SearchScreen with delete functionality
 * Tests swipe-to-delete from search results, error handling, and list updates
 */
import React from 'react'
import type { QueryClient } from '@tanstack/react-query'
import {
  createQueryWrapper,
  createTestQueryClient,
  act,
  fireEvent,
  render,
  renderHook,
  screen,
  waitFor,
} from '../testUtils'
import { Alert } from 'react-native'

// Mock Alert
jest.spyOn(Alert, 'alert').mockImplementation(jest.fn())

// Mock expo-router
const mockPush = jest.fn()
const mockSetParams = jest.fn()
let mockLocalSearchParams: { tag?: string } = {}

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => mockLocalSearchParams,
}))

// Mock useNetworkStatus
jest.mock('@ui/mobile/hooks/useNetworkStatus', () => ({
  useNetworkStatus: jest.fn(() => true),
}))

// Mock providers
jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        delete: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order: jest.fn().mockResolvedValue({ data: [], error: null }),
      })),
      rpc: jest.fn(() =>
        Promise.resolve({
          data: [],
          error: null,
          count: null,
          status: 200,
          statusText: 'OK',
        })
      ),
    },
    user: { id: 'test-user-id' },
  })),
  useTheme: () => ({
    colors: {
      background: '#ffffff',
      foreground: '#111111',
      card: '#ffffff',
      border: '#e0e0e0',
      accent: '#f2f2f2',
      primary: '#00aa00',
      muted: '#f0f0f0',
      secondary: '#f7f7f7',
      mutedForeground: '#666666',
      secondaryForeground: '#222222',
      destructive: '#ff0000',
      destructiveForeground: '#ffffff',
    },
  }),
  useSwipeContext: () => ({
    register: jest.fn(),
    unregister: jest.fn(),
    closeAll: jest.fn(),
    onSwipeStart: jest.fn(),
  }),
}))

// Mock services
jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    markDeleted: jest.fn().mockResolvedValue(undefined),
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNotes: jest.fn().mockResolvedValue([]),
    searchNotes: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock('@ui/mobile/services/searchHistory', () => ({
  getSearchHistory: jest.fn().mockResolvedValue([]),
  addSearchHistoryItem: jest.fn().mockResolvedValue([]),
  clearSearchHistory: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@core/services/notes')
jest.mock('@core/services/search')
jest.mock('@ui/mobile/adapters/networkStatus', () => ({
  mobileNetworkStatusProvider: {
    isOnline: jest.fn().mockReturnValue(true),
  },
}))

jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    getManager: jest.fn().mockReturnValue({
      enqueue: jest.fn().mockResolvedValue(undefined),
    }),
  },
}))

// Mock SwipeableNoteCard with simplified implementation
jest.mock('@ui/mobile/components/SwipeableNoteCard', () => ({
  SwipeableNoteCard: ({ note, onPress, onDelete }: {
    note: { id: string; title: string };
    onPress: (note: { id: string; title: string }) => void;
    onDelete: (id: string) => void;
  }) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID={`search-result-${note.id}`}>
        <Pressable onPress={() => onPress(note)} testID={`note-press-${note.id}`}>
          <Text>{note.title}</Text>
        </Pressable>
        <Pressable
          testID={`delete-button-${note.id}`}
          onPress={() => onDelete(note.id)}
          accessibilityLabel={`Delete ${note.title}`}
        >
          <Text>Delete</Text>
        </Pressable>
      </View>
    )
  },
}))

// Mock TagFilterBar
jest.mock('@ui/mobile/components/tags', () => ({
  TagFilterBar: ({ tag, onClear }: { tag: string | null; onClear: () => void }) => {
    const { View, Text, Pressable } = require('react-native')
    if (!tag) return null
    return (
      <View testID="tag-filter-bar">
        <Text>Filter: {tag}</Text>
        <Pressable testID="clear-tag-filter" onPress={onClear}>
          <Text>Clear</Text>
        </Pressable>
      </View>
    )
  },
}))

// Mock FlashList
jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, keyExtractor, onScrollBeginDrag }: {
    data: unknown[];
    renderItem: (info: { item: unknown }) => React.ReactElement;
    keyExtractor: (item: unknown) => string;
    onScrollBeginDrag?: () => void;
  }) => {
    const { View, ScrollView } = require('react-native')
    return (
      <ScrollView
        testID="search-results-list"
        onScrollBeginDrag={onScrollBeginDrag}
      >
        {data?.map((item: unknown) => (
          <View key={keyExtractor(item)}>
            {renderItem({ item })}
          </View>
        ))}
      </ScrollView>
    )
  },
}))

import SearchScreen from '@ui/mobile/app/(tabs)/search'
import { NoteService } from '@core/services/notes'
import { SearchService } from '@core/services/search'
import { useOpenNote, useUpdateNote } from '@ui/mobile/hooks'

const mockNoteService = NoteService as jest.MockedClass<typeof NoteService>
const mockSearchService = SearchService as jest.MockedClass<typeof SearchService>

describe('SearchScreen - Delete Functionality', () => {
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  const mockSearchResults = [
    {
      id: 'search-note-1',
      title: 'Search Result 1',
      description: 'Content with keyword',
      tags: ['tag1'],
      created_at: '2025-01-01T10:00:00.000Z',
      updated_at: '2025-01-01T10:00:00.000Z',
      user_id: 'test-user-id',
      snippet: 'Content with <mark>keyword</mark>',
      headline: 'Search Result 1',
    },
    {
      id: 'search-note-2',
      title: 'Search Result 2',
      description: 'Another matching content',
      tags: ['tag2'],
      created_at: '2025-01-02T10:00:00.000Z',
      updated_at: '2025-01-02T10:00:00.000Z',
      user_id: 'test-user-id',
      snippet: 'Another <mark>matching</mark> content',
      headline: 'Search Result 2',
    },
    {
      id: 'search-note-3',
      title: 'Search Result 3',
      description: 'Third result',
      tags: ['tag1', 'tag2'],
      created_at: '2025-01-03T10:00:00.000Z',
      updated_at: '2025-01-03T10:00:00.000Z',
      user_id: 'test-user-id',
      snippet: 'Third <mark>result</mark>',
      headline: 'Search Result 3',
    },
  ]

  beforeEach(() => {
    // Reset params before each test
    mockLocalSearchParams = {}

    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)

    // Mock SearchService.searchNotes (used by useSearch hook)
    mockSearchService.prototype.searchNotes = jest.fn().mockResolvedValue({
      results: mockSearchResults,
      total: mockSearchResults.length,
      hasMore: false,
      method: 'fts',
    })

    mockNoteService.prototype.deleteNote = jest.fn().mockResolvedValue('deleted-note-id')
    mockNoteService.prototype.updateNote = jest.fn().mockResolvedValue({
      id: 'search-note-1',
      title: 'Updated Title',
      description: 'Updated content',
    })
    mockNoteService.prototype.getNotes = jest.fn().mockResolvedValue({
      notes: mockSearchResults,
      totalCount: mockSearchResults.length,
      hasMore: false,
    })

    jest.clearAllMocks()
  })

  afterEach(() => {
    queryClient.clear()
    mockLocalSearchParams = {}
  })

  describe('Delete from search results', () => {
    it('renders delete buttons for each search result', async () => {
      render(<SearchScreen />, { wrapper })

      // Type search query to trigger search
      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      expect(screen.getByTestId('delete-button-search-note-1')).toBeTruthy()
      expect(screen.getByTestId('delete-button-search-note-2')).toBeTruthy()
      expect(screen.getByTestId('delete-button-search-note-3')).toBeTruthy()
    })

    it('deletes note when swipe delete is triggered in search results', async () => {
      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-search-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('search-note-1')
      })
    })

    it('removes deleted note from search results', async () => {
      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-search-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(screen.queryByText('Search Result 1')).toBeNull()
      })

      // Other results should still be visible
      expect(screen.getByText('Search Result 2')).toBeTruthy()
      expect(screen.getByText('Search Result 3')).toBeTruthy()
    })

    it('preserves search query after deletion', async () => {
      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-search-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // Search input should still have the query
      expect(searchInput.props.value).toBe('keyword')
    })
  })

  describe('Delete error handling in search', () => {
    it('falls back to queue when API deletion fails (no alert shown)', async () => {
      const error = new Error('Network error')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-search-note-1')
      fireEvent.press(deleteButton)

      // Wait for API call
      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // No alert should be shown - fallback to queue succeeded
      expect(Alert.alert).not.toHaveBeenCalled()

      // Note should be removed (optimistic update stays)
      await waitFor(() => {
        expect(screen.queryByText('Search Result 1')).toBeNull()
      })
    })

    it('keeps note deleted in search results when API fails but fallback succeeds', async () => {
      const error = new Error('Deletion failed')
      mockNoteService.prototype.deleteNote = jest.fn().mockRejectedValue(error)

      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-search-note-1')
      fireEvent.press(deleteButton)

      // Wait for API call and fallback
      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // Note should be deleted (fallback succeeded, optimistic update stays)
      await waitFor(() => {
        expect(screen.queryByText('Search Result 1')).toBeNull()
      })
    })
  })

  describe('Navigation from search results', () => {
    it('navigates to note editor when search result is pressed', async () => {
      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      fireEvent.press(screen.getByTestId('note-press-search-note-1'))

      expect(mockPush).toHaveBeenCalledWith('/note/search-note-1')
    })

    it('does not navigate when delete button is pressed', async () => {
      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-search-note-1')
      fireEvent.press(deleteButton)

      // Navigation should not be triggered by delete
      expect(mockPush).not.toHaveBeenCalled()
    })
  })

  describe('Search results stay in sync after edit', () => {
    it('reflects updated title after note edit', async () => {
      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const { result } = renderHook(() => useUpdateNote(), { wrapper })

      await act(async () => {
        await result.current.mutateAsync({
          id: 'search-note-1',
          updates: { title: 'Updated Title' },
        })
      })

      await waitFor(() => {
        const noteCache = queryClient.getQueryData(['note', 'search-note-1']) as { title?: string } | undefined
        expect(noteCache?.title).toBe('Updated Title')
      })

      await act(async () => {
        queryClient.setQueryData([
          'search',
          'test-user-id',
          'keyword',
          null,
        ], {
          pages: [{
            results: mockSearchResults,
            total: mockSearchResults.length,
            hasMore: false,
          }],
          pageParams: [0],
        })
      })

      const { result: openNote } = renderHook(() => useOpenNote(), { wrapper })

      await act(async () => {
        openNote.current(mockSearchResults[0])
      })
      const cached = queryClient.getQueryData(['note', 'search-note-1'])
      expect(cached).toEqual(expect.objectContaining({ title: 'Updated Title' }))
    })
  })

  describe('Empty state after deletion', () => {
    it('shows empty state when all search results are deleted', async () => {
      mockSearchService.prototype.searchNotes = jest.fn().mockResolvedValue({
        results: [mockSearchResults[0]],
        total: 1,
        hasMore: false,
        method: 'fts',
      })

      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const deleteButton = screen.getByTestId('delete-button-search-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(screen.queryByText('Search Result 1')).toBeNull()
      })

      // Should show "Nothing found" message
      await waitFor(() => {
        expect(screen.getByText('Nothing found')).toBeTruthy()
      })
    })
  })

  describe('Delete with tag filter', () => {
    it('preserves tag filter after deletion', async () => {
      // Set tag filter via params
      Object.assign(mockLocalSearchParams, { tag: 'tag1' })

      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText(/Search in "tag1" notes/)
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      // Verify tag filter is shown
      expect(screen.getByTestId('tag-filter-bar')).toBeTruthy()

      const deleteButton = screen.getByTestId('delete-button-search-note-1')
      fireEvent.press(deleteButton)

      await waitFor(() => {
        expect(mockNoteService.prototype.deleteNote).toHaveBeenCalled()
      })

      // Tag filter should still be visible
      expect(screen.getByTestId('tag-filter-bar')).toBeTruthy()

      // Reset params
      Object.assign(mockLocalSearchParams, { tag: '' })
    })
  })

  describe('Accessibility', () => {
    it('has correct accessibility labels for delete buttons in search results', async () => {
      // Reset params to ensure clean state
      mockLocalSearchParams = {}

      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      const deleteButton1 = screen.getByLabelText('Delete Search Result 1')
      const deleteButton2 = screen.getByLabelText('Delete Search Result 2')

      expect(deleteButton1).toBeTruthy()
      expect(deleteButton2).toBeTruthy()
    })
  })

  describe('Multiple deletions', () => {
    it('handles multiple sequential deletions in search results', async () => {
      // Reset params to ensure clean state
      mockLocalSearchParams = {}
      // Fresh mocks for this test
      mockSearchService.prototype.searchNotes = jest.fn().mockResolvedValue({
        results: mockSearchResults,
        total: mockSearchResults.length,
        hasMore: false,
        method: 'fts',
      })

      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByText('Search Result 1')).toBeTruthy()
      })

      // Delete first note
      fireEvent.press(screen.getByTestId('delete-button-search-note-1'))

      await waitFor(() => {
        expect(screen.queryByText('Search Result 1')).toBeNull()
      })

      // Delete second note
      fireEvent.press(screen.getByTestId('delete-button-search-note-2'))

      await waitFor(() => {
        expect(screen.queryByText('Search Result 2')).toBeNull()
      })

      // Third note should still be visible
      expect(screen.getByText('Search Result 3')).toBeTruthy()

      // Verify both deletions were called
      expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('search-note-1')
      expect(mockNoteService.prototype.deleteNote).toHaveBeenCalledWith('search-note-2')
    }, 15000) // Increased timeout for sequential operations
  })

  describe('Swipe context integration', () => {
    it('renders SwipeableNoteCard for each search result', async () => {
      // Reset params to ensure clean state
      mockLocalSearchParams = {}

      render(<SearchScreen />, { wrapper })

      const searchInput = screen.getByPlaceholderText('Search notes...')
      fireEvent.changeText(searchInput, 'keyword')

      await waitFor(() => {
        expect(screen.getByTestId('search-result-search-note-1')).toBeTruthy()
        expect(screen.getByTestId('search-result-search-note-2')).toBeTruthy()
        expect(screen.getByTestId('search-result-search-note-3')).toBeTruthy()
      })
    })
  })
})
