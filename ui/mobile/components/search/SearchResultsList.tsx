import { memo, useCallback, useMemo } from 'react'
import { ActivityIndicator, StyleSheet, Text, View } from 'react-native'
import { FlashList, type ListRenderItem } from '@shopify/flash-list'
import { Search } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import type { RagChunk, RagNoteGroup } from '@core/types/ragSearch'
import type { Note } from '@core/types/domain'
import { useTheme } from '@ui/mobile/providers'
import { SwipeableNoteCard } from '@ui/mobile/components/SwipeableNoteCard'
import { AiSearchChunkCard } from './AiSearchChunkCard'
import { AiSearchNoteCard } from './AiSearchNoteCard'
import type { SearchResultItem } from './types'

const MAX_CHUNKS_PER_NOTE = 2

type SearchListMode = 'regular' | 'ai-note' | 'ai-chunk'

type SearchResultsListProps = {
  mode: SearchListMode
  regularResults: SearchResultItem[]
  aiNoteGroups: RagNoteGroup[]
  onRegularNotePress: (note: Note) => void
  onDeleteRegularNote: (id: string) => void
  onOpenAiResult: (noteId: string, charOffset: number, chunkLength: number) => void
  onTagPress?: (tag: string) => void
  onScrollBeginDrag?: () => void
  selectionMode?: boolean
  selectedIds?: Set<string>
  onActivateSelection?: (id: string) => void
  onToggleSelect?: (id: string) => void
  hasMore?: boolean
  loadingMore?: boolean
  onLoadMore?: () => void
  bottomInset?: number
}

type SearchListRow =
  | { key: string; kind: 'regular'; note: SearchResultItem }
  | { key: string; kind: 'ai-note'; group: RagNoteGroup }
  | { key: string; kind: 'ai-chunk'; chunk: RagChunk }

type SelectionProps = {
  selectionMode: boolean
  selectedIds: Set<string>
  onActivateSelection?: (id: string) => void
  onToggleSelect?: (id: string) => void
}

function flattenChunks(groups: RagNoteGroup[]): RagChunk[] {
  return groups.flatMap((group) => group.chunks.slice(0, MAX_CHUNKS_PER_NOTE))
}

function triggerSelectionHaptics() {
  Promise.resolve(Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)).catch(() => undefined)
}

function buildSelectionLongPressHandler(
  noteId: string,
  selectionMode: boolean,
  onActivateSelection?: (id: string) => void
) {
  if (selectionMode) return undefined

  return () => {
    triggerSelectionHaptics()
    onActivateSelection?.(noteId)
  }
}

function renderRegularRow(
  note: SearchResultItem,
  selection: SelectionProps,
  onRegularNotePress: (note: Note) => void,
  onDeleteRegularNote: (id: string) => void,
  onTagPress?: (tag: string) => void
) {
  return (
    <SwipeableNoteCard
      note={note}
      onPress={selection.selectionMode ? (nextNote: Note) => selection.onToggleSelect?.(nextNote.id) : onRegularNotePress}
      onLongPress={buildSelectionLongPressHandler(note.id, selection.selectionMode, selection.onActivateSelection)}
      onTagPress={selection.selectionMode ? undefined : onTagPress}
      onDelete={onDeleteRegularNote}
      isSelectionMode={selection.selectionMode}
      isSelected={selection.selectedIds.has(note.id)}
      variant="search"
    />
  )
}

function renderAiNoteRow(
  group: RagNoteGroup,
  selection: SelectionProps,
  onOpenAiResult: (noteId: string, charOffset: number, chunkLength: number) => void,
  onTagPress?: (tag: string) => void
) {
  return (
    <AiSearchNoteCard
      group={group}
      onOpenInContext={onOpenAiResult}
      onTagPress={onTagPress}
      selectionMode={selection.selectionMode}
      isSelected={selection.selectedIds.has(group.noteId)}
      onToggleSelect={selection.onToggleSelect}
      onLongPress={buildSelectionLongPressHandler(group.noteId, selection.selectionMode, selection.onActivateSelection)}
    />
  )
}

function renderAiChunkRow(
  chunk: RagChunk,
  onOpenAiResult: (noteId: string, charOffset: number, chunkLength: number) => void,
  onTagPress?: (tag: string) => void
) {
  return (
    <AiSearchChunkCard
      chunk={chunk}
      onOpenInContext={onOpenAiResult}
      onTagPress={onTagPress}
    />
  )
}

export const SearchResultsList = memo(function SearchResultsList({
  mode,
  regularResults,
  aiNoteGroups,
  onRegularNotePress,
  onDeleteRegularNote,
  onOpenAiResult,
  onTagPress,
  onScrollBeginDrag,
  selectionMode = false,
  selectedIds = new Set<string>(),
  onActivateSelection,
  onToggleSelect,
  hasMore = false,
  loadingMore = false,
  onLoadMore,
  bottomInset = 16,
}: SearchResultsListProps) {
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const contentContainerStyle = useMemo(
    () => [styles.contentContainer, { paddingBottom: bottomInset }],
    [bottomInset, styles.contentContainer]
  )
  const selection = useMemo<SelectionProps>(() => ({
    selectionMode,
    selectedIds,
    onActivateSelection,
    onToggleSelect,
  }), [onActivateSelection, onToggleSelect, selectedIds, selectionMode])

  const rows = useMemo<SearchListRow[]>(() => {
    if (mode === 'regular') {
      return regularResults.map((note) => ({
        key: `regular-${note.id}`,
        kind: 'regular',
        note,
      }))
    }

    if (mode === 'ai-note') {
      return aiNoteGroups.map((group) => ({
        key: `ai-note-${group.noteId}`,
        kind: 'ai-note',
        group,
      }))
    }

    return flattenChunks(aiNoteGroups).map((chunk) => ({
      key: `ai-chunk-${chunk.noteId}-${chunk.chunkIndex}`,
      kind: 'ai-chunk',
      chunk,
    }))
  }, [aiNoteGroups, mode, regularResults])

  const renderItem = useCallback<ListRenderItem<SearchListRow>>(({ item }) => {
    if (item.kind === 'regular') {
      return renderRegularRow(item.note, selection, onRegularNotePress, onDeleteRegularNote, onTagPress)
    }

    if (item.kind === 'ai-note') {
      return renderAiNoteRow(item.group, selection, onOpenAiResult, onTagPress)
    }

    return renderAiChunkRow(item.chunk, onOpenAiResult, onTagPress)
  }, [
    onDeleteRegularNote,
    onOpenAiResult,
    onRegularNotePress,
    onTagPress,
    selection,
  ])

  if (rows.length === 0 && !loadingMore) {
    return (
      <View style={styles.emptyState}>
        <View style={styles.emptyIcon}>
          <Search size={18} color={colors.mutedForeground} />
        </View>
        <Text style={styles.emptyText}>Nothing found</Text>
      </View>
    )
  }

  return (
    <FlashList
      data={rows}
      renderItem={renderItem}
      keyExtractor={(item) => item.key}
      // @ts-expect-error FlashList types mismatch in some versions
      estimatedItemSize={mode === 'ai-chunk' ? 140 : 180}
      contentContainerStyle={contentContainerStyle}
      extraData={{ mode, selectionMode, selectedIds }}
      onScrollBeginDrag={onScrollBeginDrag}
      onEndReached={() => {
        if (!hasMore || loadingMore || !onLoadMore) return
        try {
          const maybePromise = onLoadMore()
          Promise.resolve(maybePromise).catch(() => undefined)
        } catch {
          return
        }
      }}
      onEndReachedThreshold={0.4}
      ListFooterComponent={
        loadingMore ? (
          <View style={styles.footerLoader}>
            <ActivityIndicator size="small" color={colors.primary} />
          </View>
        ) : null
      }
    />
  )
})

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  contentContainer: {
    paddingHorizontal: 16,
  },
  footerLoader: {
    paddingVertical: 16,
    alignItems: 'center',
  },
  emptyState: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
    alignItems: 'center',
    gap: 10,
  },
  emptyIcon: {
    width: 36,
    height: 36,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: colors.muted,
  },
  emptyText: {
    fontSize: 14,
    fontFamily: 'Inter_600SemiBold',
    color: colors.mutedForeground,
  },
})
