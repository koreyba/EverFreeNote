import React from 'react'
import AsyncStorage from '@react-native-async-storage/async-storage'
import type { QueryClient } from '@tanstack/react-query'
import { act, fireEvent, render, renderHook, screen, waitFor, createQueryWrapper, createTestQueryClient } from '../testUtils'
import { resolveRagSearchSettings } from '@core/rag/searchSettings'

function createDeferred<T>() {
  let resolve!: (value: T) => void
  let reject!: (reason?: unknown) => void
  const promise = new Promise<T>((res, rej) => {
    resolve = res
    reject = rej
  })

  return { promise, resolve, reject }
}

const mockPush = jest.fn()
const mockSetParams = jest.fn()
const mockInvoke = jest.fn()
const mockSearchNotes = jest.fn()
const mockGetStatus = jest.fn()
const mockDeleteNote = jest.fn()
const mockRagSearchUpsert = jest.fn()

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
    hasPendingWrites: jest.fn().mockResolvedValue(false),
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

jest.mock('@core/services/ragSearchSettings', () => ({
  RagSearchSettingsService: jest.fn().mockImplementation(() => ({
    upsert: mockRagSearchUpsert,
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
  FlashList: ({ data, renderItem, keyExtractor, onRefresh }: {
    data: unknown[]
    renderItem: (info: { item: unknown }) => React.ReactElement
    keyExtractor: (item: unknown) => string
    onRefresh?: () => void
  }) => {
    const { ScrollView, View, Pressable, Text } = require('react-native')
    return (
      <ScrollView testID="search-results-list">
        {data.map((item) => (
          <View key={keyExtractor(item)}>
            {renderItem({ item })}
          </View>
        ))}
        <Pressable testID="search-results-refresh" onPress={onRefresh}>
          <Text>Refresh</Text>
        </Pressable>
      </ScrollView>
    )
  },
}))

jest.mock('@react-native-community/slider', () => ({
  __esModule: true,
  default: ({
    testID,
    value,
    onValueChange,
    onSlidingComplete,
  }: {
    testID?: string
    value?: number
    onValueChange?: (next: number) => void
    onSlidingComplete?: (next: number) => void
  }) => {
    const { View, Text, Pressable } = require('react-native')
    return (
      <View testID={testID ?? 'mock-slider'}>
        <Text>{value}</Text>
        <Pressable
          testID={`${testID ?? 'mock-slider'}-increase`}
          onPress={() => {
            const next = Number(((value ?? 0) + 0.05).toFixed(2))
            onValueChange?.(next)
            onSlidingComplete?.(next)
          }}
        >
          <Text>Increase</Text>
        </Pressable>
      </View>
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
      ragSearch: resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.55 }),
    })
    mockRagSearchUpsert.mockReset().mockResolvedValue(
      resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.6 })
    )
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
            bodyContent: 'This is the most relevant chunk for the query.',
            overlapPrefix: '',
            content: 'Section: AI Result Note\n\nThis is the most relevant chunk for the query.\n\nTags: ai, topic',
            similarity: 0.91,
          },
          {
            noteId: 'ai-note-1',
            noteTitle: 'AI Result Note',
            noteTags: ['ai', 'topic'],
            chunkIndex: 1,
            charOffset: 144,
            bodyContent: 'A secondary chunk provides a little more context.',
            overlapPrefix: '',
            content: 'Section: AI Result Note\n\nA secondary chunk provides a little more context.\n\nTags: ai, topic',
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
  }, 15000)

  it('uses persisted retrieval settings for topK and precision', async () => {
    mockGetStatus.mockResolvedValueOnce({
      gemini: { configured: true },
      ragSearch: resolveRagSearchSettings({ top_k: 30, similarity_threshold: 0.25 }),
    })

    await enableAISearch()

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'semantic query')

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledWith('rag-search', {
        body: expect.objectContaining({
          query: 'semantic query',
          topK: 30,
          threshold: 0.25,
        }),
      })
    })
  })

  it('waits for hydrated retrieval settings before auto-enabled AI search runs', async () => {
    const statusRequest = createDeferred<{
      gemini: { configured: boolean }
      ragSearch: ReturnType<typeof resolveRagSearchSettings>
    }>()

    mockAsyncStorage.getItem.mockResolvedValueOnce(JSON.stringify({
      isAIEnabled: true,
      viewMode: 'note',
    }))
    mockGetStatus.mockImplementationOnce(() => statusRequest.promise)

    render(<SearchScreen />, { wrapper })

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'semantic query')

    await waitFor(() => {
      expect(mockInvoke).not.toHaveBeenCalled()
    })

    await act(async () => {
      statusRequest.resolve({
        gemini: { configured: true },
        ragSearch: resolveRagSearchSettings({ top_k: 30, similarity_threshold: 0.25 }),
      })
      await statusRequest.promise
    })

    await waitFor(() => {
      expect(screen.getByTestId('ai-search-toggle').props.accessibilityState.checked).toBe(true)
      expect(mockInvoke).toHaveBeenCalledTimes(1)
      expect(mockInvoke).toHaveBeenCalledWith('rag-search', {
        body: expect.objectContaining({
          query: 'semantic query',
          topK: 30,
          threshold: 0.25,
        }),
      })
    })
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

  it('re-runs AI search when the results list is refreshed', async () => {
    await enableAISearch()

    fireEvent.changeText(screen.getByPlaceholderText('Search notes...'), 'semantic query')

    await screen.findByTestId('ai-note-card-ai-note-1')
    expect(mockInvoke).toHaveBeenCalledTimes(1)

    await act(async () => {
      fireEvent.press(screen.getByTestId('search-results-refresh'))
    })

    await waitFor(() => {
      expect(mockInvoke).toHaveBeenCalledTimes(2)
    })
  })

  it('rolls back failed precision saves to the latest confirmed value only', async () => {
    const firstSave = createDeferred<ReturnType<typeof resolveRagSearchSettings>>()
    const secondSave = createDeferred<ReturnType<typeof resolveRagSearchSettings>>()

    mockRagSearchUpsert
      .mockReset()
      .mockImplementationOnce(() => firstSave.promise)
      .mockImplementationOnce(() => secondSave.promise)
      .mockRejectedValueOnce(new Error('Save failed'))

    await enableAISearch()

    fireEvent.press(screen.getByTestId('ai-search-precision-slider-increase'))
    fireEvent.press(screen.getByTestId('ai-search-precision-slider-increase'))

    await act(async () => {
      secondSave.resolve(resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.65 }))
      await secondSave.promise
    })

    await act(async () => {
      firstSave.resolve(resolveRagSearchSettings({ top_k: 15, similarity_threshold: 0.6 }))
      await firstSave.promise
    })

    fireEvent.press(screen.getByTestId('ai-search-precision-slider-increase'))

    await waitFor(() => {
      expect(screen.getByText('Save failed')).toBeTruthy()
      expect(screen.getAllByText('0.65').length).toBeGreaterThan(0)
      expect(screen.queryByText('0.60')).toBeNull()
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
