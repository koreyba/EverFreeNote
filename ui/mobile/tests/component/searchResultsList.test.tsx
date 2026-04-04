import { fireEvent, render, screen } from '../testUtils'
import type { ReactNode } from 'react'
import type { Note } from '@core/types/domain'
import type { SearchResultItem } from '@ui/mobile/components/search/types'
import type { RagNoteGroup } from '@core/types/ragSearch'
import { SearchResultsList } from '@ui/mobile/components/search/SearchResultsList'

const mockImpactAsync = jest.fn()
let lastFlashListProps: Record<string, unknown> | null = null

jest.mock('expo-haptics', () => ({
  impactAsync: (...args: unknown[]) => mockImpactAsync(...args),
  ImpactFeedbackStyle: { Medium: 'medium' },
}))

jest.mock('@ui/mobile/providers', () => ({
  useTheme: () => ({
    colors: {
      card: '#101820',
      border: '#2d3748',
      muted: '#1f2937',
      mutedForeground: '#94a3b8',
      primary: '#22c55e',
    },
  }),
}))

jest.mock('@shopify/flash-list', () => ({
  FlashList: (props: Record<string, unknown>) => {
    lastFlashListProps = props
    const { View, ScrollView, Pressable, Text } = require('react-native')
    const data = props.data as Array<{ key: string }>
    const renderItem = props.renderItem as ({ item }: { item: unknown }) => unknown
    const footer = props.ListFooterComponent as ReactNode

    return (
      <ScrollView testID="flash-list" onScrollBeginDrag={props.onScrollBeginDrag as never}>
        {data.map((item) => (
          <View key={item.key}>{renderItem({ item })}</View>
        ))}
        {footer}
        <Pressable testID="refresh-list" onPress={() => (props.onRefresh as (() => void) | undefined)?.()}>
          <Text>Refresh</Text>
        </Pressable>
        <Pressable testID="end-reached" onPress={() => (props.onEndReached as (() => void) | undefined)?.()}>
          <Text>End reached</Text>
        </Pressable>
      </ScrollView>
    )
  },
}))

jest.mock('@ui/mobile/components/SwipeableNoteCard', () => ({
  SwipeableNoteCard: ({
    note,
    onPress,
    onLongPress,
    isSelectionMode,
    isSelected,
  }: {
    note: SearchResultItem
    onPress: (note: SearchResultItem) => void
    onLongPress?: () => void
    isSelectionMode?: boolean
    isSelected?: boolean
  }) => {
    const { Pressable, Text } = require('react-native')
    return (
      <Pressable
        testID={`regular-card-${note.id}`}
        accessibilityRole={isSelectionMode ? 'checkbox' : 'button'}
        accessibilityState={isSelectionMode ? { checked: isSelected } : undefined}
        onPress={() => onPress(note)}
        onLongPress={onLongPress}
      >
        <Text>{note.title}</Text>
      </Pressable>
    )
  },
}))

jest.mock('@ui/mobile/components/search/AiSearchNoteCard', () => ({
  AiSearchNoteCard: ({
    group,
    onOpenInContext,
  }: {
    group: RagNoteGroup
    onOpenInContext: (
      note: Pick<Note, 'id'> & Partial<Pick<Note, 'title' | 'tags'>>,
      charOffset: number,
      chunkLength: number
    ) => void
  }) => {
    const { Pressable, Text } = require('react-native')
    const topChunk = group.chunks[0]
    const chunkText = topChunk.bodyContent
    return (
      <Pressable
        testID={`mock-ai-note-${group.noteId}`}
        onPress={() => onOpenInContext({
          id: group.noteId,
          title: group.noteTitle,
          tags: group.noteTags,
        }, topChunk.charOffset, chunkText.length)}
      >
        <Text>{group.noteTitle}</Text>
        <Text>{chunkText}</Text>
      </Pressable>
    )
  },
}))

jest.mock('@ui/mobile/components/search/AiSearchChunkCard', () => ({
  AiSearchChunkCard: ({
    chunk,
    onOpenInContext,
  }: {
    chunk: { noteId: string; chunkIndex: number; charOffset: number; bodyContent: string }
    onOpenInContext: (
      note: Pick<Note, 'id'> & Partial<Pick<Note, 'title' | 'tags'>>,
      charOffset: number,
      chunkLength: number
    ) => void
  }) => {
    const { Pressable, Text } = require('react-native')
    return (
      <Pressable
        testID={`mock-ai-chunk-${chunk.noteId}-${chunk.chunkIndex}`}
        onPress={() => onOpenInContext({ id: chunk.noteId }, chunk.charOffset, chunk.bodyContent.length)}
      >
        <Text>{chunk.bodyContent}</Text>
      </Pressable>
    )
  },
}))

const createRegularNote = (id: string): SearchResultItem => ({
  id,
  title: `Note ${id}`,
  description: 'Description',
  tags: ['tag'],
  created_at: '2026-03-13T10:00:00.000Z',
  updated_at: '2026-03-13T10:00:00.000Z',
  user_id: 'test-user-id',
})

const createAiGroup = (noteId: string, chunkCount = 3): RagNoteGroup => ({
  noteId,
  noteTitle: `AI ${noteId}`,
  noteTags: ['semantic'],
  topScore: 0.9,
  hiddenCount: 0,
  chunks: Array.from({ length: chunkCount }, (_, index) => ({
    noteId,
    noteTitle: `AI ${noteId}`,
    noteTags: ['semantic'],
    chunkIndex: index,
    charOffset: index * 100,
    bodyContent: `Chunk ${index}`,
    overlapPrefix: '',
    content: `Section: AI ${noteId}\n\nChunk ${index}\n\nTags: semantic`,
    similarity: 0.9 - index * 0.05,
  })),
})

const createLegacyAiGroup = (noteId: string): RagNoteGroup =>
  ({
    noteId,
    noteTitle: `Legacy ${noteId}`,
    noteTags: ['semantic'],
    topScore: 0.88,
    hiddenCount: 0,
    chunks: [
      {
        noteId,
        noteTitle: `Legacy ${noteId}`,
        noteTags: ['semantic'],
        chunkIndex: 0,
        charOffset: 40,
        content: 'Legacy chunk only content',
        similarity: 0.88,
      } as never,
    ],
  } as RagNoteGroup)

describe('SearchResultsList', () => {
  beforeEach(() => {
    jest.clearAllMocks()
    lastFlashListProps = null
  })

  it('renders an empty state when there are no rows and no loading footer', () => {
    render(
      <SearchResultsList
        mode="regular"
        regularResults={[]}
        aiNoteGroups={[]}
        aiChunks={[]}
        onRegularNotePress={jest.fn()}
        onDeleteRegularNote={jest.fn()}
        onOpenAiResult={jest.fn()}
      />
    )

    expect(screen.getByText('Nothing found')).toBeTruthy()
    expect(screen.queryByTestId('flash-list')).toBeNull()
  })

  it('uses regular selection behavior and triggers haptics on long press', async () => {
    const onActivateSelection = jest.fn()
    const onToggleSelect = jest.fn()
    const onRegularNotePress = jest.fn()

    const { unmount } = render(
      <SearchResultsList
        mode="regular"
        regularResults={[createRegularNote('note-1')]}
        aiNoteGroups={[]}
        aiChunks={[]}
        onRegularNotePress={onRegularNotePress}
        onDeleteRegularNote={jest.fn()}
        onOpenAiResult={jest.fn()}
        selectionMode={false}
        onActivateSelection={onActivateSelection}
        onToggleSelect={onToggleSelect}
      />
    )

    fireEvent(screen.getByTestId('regular-card-note-1'), 'longPress')

    expect(mockImpactAsync).toHaveBeenCalledWith('medium')
    expect(onActivateSelection).toHaveBeenCalledWith('note-1')

    unmount()

    render(
      <SearchResultsList
        mode="regular"
        regularResults={[createRegularNote('note-1')]}
        aiNoteGroups={[]}
        aiChunks={[]}
        onRegularNotePress={onRegularNotePress}
        onDeleteRegularNote={jest.fn()}
        onOpenAiResult={jest.fn()}
        selectionMode
        selectedIds={new Set(['note-1'])}
        onToggleSelect={onToggleSelect}
      />
    )

    const selectedCard = screen.getByTestId('regular-card-note-1')
    fireEvent.press(selectedCard)

    expect(onToggleSelect).toHaveBeenCalledWith('note-1')
    expect(onRegularNotePress).not.toHaveBeenCalled()
  })

  it('renders raw AI chunks and loads more when allowed', () => {
    const onOpenAiResult = jest.fn()
    const onLoadMore = jest.fn()
    const onScrollBeginDrag = jest.fn()
    const aiChunks = [
      ...createAiGroup('note-a', 3).chunks,
      ...createAiGroup('note-b', 1).chunks,
    ]

    render(
      <SearchResultsList
        mode="ai-chunk"
        regularResults={[]}
        aiNoteGroups={[]}
        aiChunks={aiChunks}
        onRegularNotePress={jest.fn()}
        onDeleteRegularNote={jest.fn()}
        onOpenAiResult={onOpenAiResult}
        hasMore
        onLoadMore={onLoadMore}
        onScrollBeginDrag={onScrollBeginDrag}
      />
    )

    expect(screen.getByTestId('mock-ai-chunk-note-a-0')).toBeTruthy()
    expect(screen.getByTestId('mock-ai-chunk-note-a-1')).toBeTruthy()
    expect(screen.getByTestId('mock-ai-chunk-note-a-2')).toBeTruthy()
    expect(screen.getByTestId('mock-ai-chunk-note-b-0')).toBeTruthy()

    fireEvent.press(screen.getByTestId('mock-ai-chunk-note-a-1'))
    fireEvent.press(screen.getByTestId('end-reached'))
    fireEvent(screen.getByTestId('flash-list'), 'scrollBeginDrag')

    expect(onOpenAiResult).toHaveBeenCalledWith({ id: 'note-a' }, 100, 'Chunk 1'.length)
    expect(onLoadMore).toHaveBeenCalled()
    expect(onScrollBeginDrag).toHaveBeenCalled()
    expect(lastFlashListProps?.estimatedItemSize).toBe(140)
  })

  it('does not load more while already loading', () => {
    const onLoadMore = jest.fn()
    const onOpenAiResult = jest.fn()

    render(
      <SearchResultsList
        mode="ai-note"
        regularResults={[]}
        aiNoteGroups={[createAiGroup('note-a', 2)]}
        aiChunks={[]}
        onRegularNotePress={jest.fn()}
        onDeleteRegularNote={jest.fn()}
        onOpenAiResult={onOpenAiResult}
        hasMore
        loadingMore
        onLoadMore={onLoadMore}
      />
    )

    fireEvent.press(screen.getByTestId('mock-ai-note-note-a'))
    fireEvent.press(screen.getByTestId('end-reached'))

    expect(onOpenAiResult).toHaveBeenCalledWith(
      { id: 'note-a', title: 'AI note-a', tags: ['semantic'] },
      0,
      'Chunk 0'.length
    )
    expect(onLoadMore).not.toHaveBeenCalled()
  })

  it('opens legacy ai-note rows using content when bodyContent is missing', () => {
    const onOpenAiResult = jest.fn()

    render(
      <SearchResultsList
        mode="ai-note"
        regularResults={[]}
        aiNoteGroups={[createLegacyAiGroup('note-legacy')]}
        aiChunks={[]}
        onRegularNotePress={jest.fn()}
        onDeleteRegularNote={jest.fn()}
        onOpenAiResult={onOpenAiResult}
      />
    )

    fireEvent.press(screen.getByTestId('mock-ai-note-note-legacy'))

    expect(screen.getByText('Legacy chunk only content')).toBeTruthy()
    expect(onOpenAiResult).toHaveBeenCalledWith(
      { id: 'note-legacy', title: 'Legacy note-legacy', tags: ['semantic'] },
      40,
      'Legacy chunk only content'.length
    )
  })

  it('forwards pull-to-refresh props to the list', () => {
    const onRefresh = jest.fn()

    render(
      <SearchResultsList
        mode="regular"
        regularResults={[createRegularNote('note-1')]}
        aiNoteGroups={[]}
        aiChunks={[]}
        onRegularNotePress={jest.fn()}
        onDeleteRegularNote={jest.fn()}
        onOpenAiResult={jest.fn()}
        refreshing
        onRefresh={onRefresh}
      />
    )

    expect(lastFlashListProps?.refreshing).toBe(true)

    fireEvent.press(screen.getByTestId('refresh-list'))

    expect(onRefresh).toHaveBeenCalled()
  })
})
