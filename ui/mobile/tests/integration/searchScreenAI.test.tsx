import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, renderHook, screen, waitFor, createQueryWrapper, createTestQueryClient } from '../testUtils'

const mockPush = jest.fn()
const mockSetParams = jest.fn()
const mockInvoke = jest.fn()
const mockSearchNotes = jest.fn()
const mockGetStatus = jest.fn()
const mockDeleteNote = jest.fn()

jest.mock('expo-router', () => ({
  useRouter: () => ({
    push: mockPush,
    setParams: mockSetParams,
  }),
  useLocalSearchParams: () => ({}),
  useNavigation: () => ({ setOptions: jest.fn() }),
}))

jest.mock('@ui/mobile/providers', () => ({
  useSupabase: jest.fn(() => ({
    client: {
      functions: {
        invoke: mockInvoke,
      },
      from: jest.fn(() => ({
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockResolvedValue({ error: null }),
      })),
      rpc: jest.fn(),
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
      primaryForeground: '#ffffff',
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

jest.mock('@ui/mobile/services/searchHistory', () => ({
  getSearchHistory: jest.fn().mockResolvedValue([]),
  addSearchHistoryItem: jest.fn().mockResolvedValue([]),
  clearSearchHistory: jest.fn().mockResolvedValue(undefined),
}))

jest.mock('@ui/mobile/services/database', () => ({
  databaseService: {
    markDeleted: jest.fn().mockResolvedValue(undefined),
    saveNotes: jest.fn().mockResolvedValue(undefined),
    getLocalNotes: jest.fn().mockResolvedValue([]),
    searchNotes: jest.fn().mockResolvedValue([]),
  },
}))

jest.mock('@ui/mobile/adapters/networkStatus', () => ({
  mobileNetworkStatusProvider: {
    isOnline: jest.fn().mockReturnValue(true),
    subscribe: jest.fn().mockReturnValue(jest.fn()),
  },
}))

jest.mock('@ui/mobile/services/sync', () => ({
  mobileSyncService: {
    getManager: jest.fn().mockReturnValue({
      enqueue: jest.fn().mockResolvedValue(undefined),
    }),
  },
}))

jest.mock('@core/services/search', () => ({
  SearchService: jest.fn().mockImplementation(() => ({
    searchNotes: mockSearchNotes,
  })),
}))

jest.mock('@core/services/notes', () => ({
  NoteService: jest.fn().mockImplementation(() => ({
    getNotes: jest.fn().mockResolvedValue({
      notes: [],
      totalCount: 0,
      hasMore: false,
    }),
    deleteNote: mockDeleteNote,
  })),
}))

jest.mock('@core/services/apiKeysSettings', () => ({
  ApiKeysSettingsService: jest.fn().mockImplementation(() => ({
    getStatus: mockGetStatus,
  })),
}))

jest.mock('@ui/mobile/components/BulkActionBar', () => ({
  BulkActionBar: ({ selectedCount }: { selectedCount: number }) => {
    const { View, Text } = require('react-native')
    return (
      <View testID="bulk-action-bar">
        <Text>{selectedCount} selected</Text>
      </View>
    )
  },
}))

jest.mock('@ui/mobile/components/SwipeableNoteCard', () => ({
  SwipeableNoteCard: () => null,
}))

jest.mock('@ui/mobile/components/tags', () => ({
  TagFilterBar: () => null,
}))

jest.mock('@shopify/flash-list', () => ({
  FlashList: ({ data, renderItem, keyExtractor }: {
    data: unknown[]
    renderItem: (info: { item: unknown }) => React.ReactElement
    keyExtractor: (item: unknown) => string
  }) => {
    const { ScrollView, View } = require('react-native')
    return (
      <ScrollView testID="search-results-list">
        {data.map((item) => (
          <View key={keyExtractor(item)}>
            {renderItem({ item })}
          </View>
        ))}
      </ScrollView>
    )
  },
}))

import SearchScreen from '@ui/mobile/app/(tabs)/search'
import { useDeleteNote } from '@ui/mobile/hooks/useNotesMutations'

describe('SearchScreen - AI search', () => {
  const mockAsyncStorage = AsyncStorage as jest.Mocked<typeof AsyncStorage>
  let queryClient: QueryClient
  let wrapper: ReturnType<typeof createQueryWrapper>

  beforeEach(() => {
    queryClient = createTestQueryClient()
    wrapper = createQueryWrapper(queryClient)
    mockPush.mockReset()
    mockSetParams.mockReset()
    mockInvoke.mockReset()
    mockSearchNotes.mockReset()
    mockGetStatus.mockReset()
    mockAsyncStorage.getItem.mockResolvedValue(null)
    mockAsyncStorage.setItem.mockResolvedValue(undefined)

    mockGetStatus.mockResolvedValue({
      gemini: { configured: true },
    })
    mockDeleteNote.mockReset().mockResolvedValue('ai-note-1')

    mockSearchNotes.mockResolvedValue({
      results: [],
      total: 0,
      method: 'fts',
    })

    mockInvoke.mockResolvedValue({
      data: {
        chunks: [
          {
            noteId: 'ai-note-1',
            noteTitle: 'AI Result Note',
            noteTags: ['ai', 'topic'],
            chunkIndex: 0,
            charOffset: 24,
            content: 'This is the most relevant chunk for the query.',
            similarity: 0.91,
          },
          {
            noteId: 'ai-note-1',
            noteTitle: 'AI Result Note',
            noteTags: ['ai', 'topic'],
            chunkIndex: 1,
            charOffset: 144,
            content: 'A secondary chunk provides a little more context.',
            similarity: 0.82,
          },
        ],
      },
      error: null,
    })
  })

  afterEach(() => {
    queryClient.clear()
  })

  async function enableAISearch() {
    render(<SearchScreen />, { wrapper })
    await waitFor(() => {
      expect(mockGetStatus).toHaveBeenCalled()
      expect(screen.getByTestId('ai-search-toggle').props.accessibilityState.disabled).toBe(false)
    })

    const toggle = screen.getByTestId('ai-search-toggle')
    if (!toggle.props.accessibilityState.checked) {
      fireEvent.press(toggle)
    }

    await waitFor(() => {
      expect(screen.getByTestId('ai-search-toggle').props.accessibilityState.checked).toBe(true)
    })
  }

  it('runs AI search without regular FTS when AI mode is enabled', async () => {
    await enableAISearch()

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'semantic query')

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('rag-search', {
        body: expect.objectContaining({
          query: 'semantic query',
        }),
      })
    })

    expect(mockSearchNotes).not.toHaveBeenCalled()
    expect(await screen.findByTestId('ai-note-card-ai-note-1')).toBeTruthy()
  })

  it('opens AI note results in context with chunk focus params', async () => {
    await enableAISearch()

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'semantic query')

    const topChunk = await screen.findByTestId('ai-note-top-chunk-ai-note-1')
    fireEvent.press(topChunk)

    await waitFor(() => {
      expect(mockPush).toHaveBeenCalledWith({
        pathname: '/note/[id]',
        params: expect.objectContaining({
          id: 'ai-note-1',
          focusOffset: '24',
          focusLength: String('This is the most relevant chunk for the query.'.length),
        }),
      })
    })
  })

  it('removes deleted notes from visible AI search results without rerunning the search', async () => {
    await enableAISearch()

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'semantic query')

    await screen.findByTestId('ai-note-card-ai-note-1')
    const invokeCallsBeforeDelete = mockInvoke.mock.calls.length

    const { result } = renderHook(() => useDeleteNote(), { wrapper })

    await act(async () => {
      await result.current.mutateAsync('ai-note-1')
    })

    await waitFor(() => {
      expect(screen.queryByTestId('ai-note-card-ai-note-1')).toBeNull()
    })

    expect(mockDeleteNote).toHaveBeenCalledWith('ai-note-1')
    expect(mockInvoke).toHaveBeenCalledTimes(invokeCallsBeforeDelete)
  })

  it('blocks mode and view switching while selection mode is active in AI notes view', async () => {
    await enableAISearch()

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'semantic query')

    const noteCard = await screen.findByTestId('ai-note-card-ai-note-1')
    fireEvent(noteCard, 'longPress')

    await waitFor(() => {
      expect(screen.getByTestId('bulk-action-bar')).toBeTruthy()
    })

    fireEvent.press(screen.getByTestId('ai-search-view-tab-chunk'))
    fireEvent.press(screen.getByTestId('ai-search-toggle'))

    expect(screen.getByTestId('ai-note-card-ai-note-1')).toBeTruthy()
    expect(screen.queryByTestId('ai-chunk-card-ai-note-1-0')).toBeNull()
    expect(screen.getByTestId('ai-search-toggle').props.accessibilityState.checked).toBe(true)
  })

  it('does not enter selection mode in chunk view', async () => {
    await enableAISearch()

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'semantic query')
    await screen.findByTestId('ai-note-card-ai-note-1')

    fireEvent.press(screen.getByTestId('ai-search-view-tab-chunk'))

    const chunkCard = await screen.findByTestId('ai-chunk-card-ai-note-1-0')
    fireEvent(chunkCard, 'longPress')

    expect(screen.queryByTestId('bulk-action-bar')).toBeNull()
  })
})
