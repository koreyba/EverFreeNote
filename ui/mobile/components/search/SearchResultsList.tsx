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

function flattenChunks(groups: RagNoteGroup[]): RagChunk[] {
  return groups.flatMap((group) => group.chunks.slice(0, MAX_CHUNKS_PER_NOTE))
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
      return (
        <SwipeableNoteCard
          note={item.note}
          onPress={selectionMode ? (note: Note) => onToggleSelect?.(note.id) : onRegularNotePress}
          onLongPress={selectionMode ? undefined : () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onActivateSelection?.(item.note.id)
          }}
          onTagPress={selectionMode ? undefined : onTagPress}
          onDelete={onDeleteRegularNote}
          isSelectionMode={selectionMode}
          isSelected={selectedIds.has(item.note.id)}
          variant="search"
        />
      )
    }

    if (item.kind === 'ai-note') {
      return (
        <AiSearchNoteCard
          group={item.group}
          onOpenInContext={onOpenAiResult}
          onTagPress={onTagPress}
          selectionMode={selectionMode}
          isSelected={selectedIds.has(item.group.noteId)}
          onToggleSelect={onToggleSelect}
          onLongPress={selectionMode ? undefined : () => {
            void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
            onActivateSelection?.(item.group.noteId)
          }}
        />
      )
    }

    return (
      <AiSearchChunkCard
        chunk={item.chunk}
        onOpenInContext={onOpenAiResult}
        onTagPress={onTagPress}
      />
    )
  }, [
    onActivateSelection,
    onDeleteRegularNote,
    onOpenAiResult,
    onRegularNotePress,
    onTagPress,
    onToggleSelect,
    selectedIds,
    selectionMode,
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
        onLoadMore()
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
