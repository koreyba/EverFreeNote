import { View, StyleSheet, ActivityIndicator, Text, Pressable, Alert, BackHandler } from 'react-native'
import { useEffect, useMemo, useState, useCallback, useRef } from 'react'
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { useQuery } from '@tanstack/react-query'
import type { Note } from '@core/types/domain'
import { ApiKeysSettingsService } from '@core/services/apiKeysSettings'
import { AI_SEARCH_MIN_QUERY_LENGTH } from '@core/constants/aiSearch'
import { SEARCH_CONFIG } from '@core/constants/search'
import { shouldUpdateTagFilter } from '@core/utils/search'
import {
  useSearch,
  useDeleteNote,
  useOpenNote,
  useBulkSelection,
  useBulkDeleteNotes,
  useMobileSearchMode,
  useMobileAIPaginatedSearch,
} from '@ui/mobile/hooks'
import { useSupabase, useTheme, useSwipeContext } from '@ui/mobile/providers'
import { addSearchHistoryItem, clearSearchHistory, getSearchHistory } from '@ui/mobile/services/searchHistory'
import { TagFilterBar } from '@ui/mobile/components/tags'
import { BulkActionBar } from '@ui/mobile/components/BulkActionBar'
import {
  SearchControls,
  SearchResultsList,
  type SearchResultItem,
} from '@ui/mobile/components/search'

function runAsyncSafely(task: PromiseLike<unknown> | void, onError?: () => void) {
  if (!task || typeof task.then !== 'function') return
  task.then(undefined, () => {
    onError?.()
  })
}

function useSearchHistoryState(userId: string | undefined, queryTrimmed: string, activeTag: string | null) {
  const [history, setHistory] = useState<string[]>([])
  const showHistory = queryTrimmed.length === 0 && history.length > 0 && !activeTag

  useEffect(() => {
    if (!userId) return
    runAsyncSafely(getSearchHistory(userId).then(setHistory))
  }, [userId])

  useEffect(() => {
    if (!userId) return
    if (queryTrimmed.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) return

    const timeout = setTimeout(() => {
      runAsyncSafely(addSearchHistoryItem(userId, queryTrimmed).then(setHistory))
    }, 500)

    return () => clearTimeout(timeout)
  }, [queryTrimmed, userId])

  const clearHistoryItems = useCallback(() => {
    if (!userId) return
    runAsyncSafely(clearSearchHistory(userId).then(() => setHistory([])))
  }, [userId])

  const applyHistoryItem = useCallback((item: string) => item, [])

  return {
    history,
    showHistory,
    clearHistoryItems,
    applyHistoryItem,
  }
}

function useSelectionLifecycle({
  isActive,
  deactivate,
  navigation,
  selectedIds,
  selectableResultIds,
  selectionCapable,
  query,
  styles,
}: {
  isActive: boolean
  deactivate: () => void
  navigation: {
    setOptions: (options: { title?: string; headerLeft?: (() => unknown) | undefined }) => void
  }
  selectedIds: Set<string>
  selectableResultIds: string[]
  selectionCapable: boolean
  query: string
  styles: ReturnType<typeof createStyles>
}) {
  const previousQueryRef = useRef(query)

  useEffect(() => {
    if (previousQueryRef.current === query) return
    previousQueryRef.current = query
    if (isActive) deactivate()
  }, [deactivate, isActive, query])

  useEffect(() => {
    if (!selectionCapable && isActive) {
      deactivate()
    }
  }, [deactivate, isActive, selectionCapable])

  useEffect(() => {
    if (!isActive) return
    navigation.setOptions({
      title: `${selectedIds.size} selected`,
      headerLeft: () => (
        <Pressable
          onPress={deactivate}
          style={styles.headerCancel}
          accessibilityRole="button"
          accessibilityLabel="Cancel selection"
        >
          <Text style={styles.headerCancelText}>Cancel</Text>
        </Pressable>
      ),
    })

    return () => {
      navigation.setOptions({
        title: undefined,
        headerLeft: undefined,
      })
    }
  }, [deactivate, isActive, navigation, selectedIds.size, styles.headerCancel, styles.headerCancelText])

  useEffect(() => {
    if (!isActive) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      deactivate()
      return true
    })
    return () => sub.remove()
  }, [deactivate, isActive])

  useEffect(() => {
    if (!isActive) return
    if (selectedIds.size === 0) return

    const visibleIds = new Set(selectableResultIds)
    const hasInvisibleSelection = [...selectedIds].some((id) => !visibleIds.has(id))
    if (!hasInvisibleSelection) return
    deactivate()
  }, [deactivate, isActive, selectableResultIds, selectedIds])
}

type SearchScreenBodyProps = {
  styles: ReturnType<typeof createStyles>
  colors: ReturnType<typeof useTheme>['colors']
  showHistory: boolean
  history: string[]
  onClearHistory: () => void
  onHistoryItemPress: (item: string) => void
  isRegularLoading: boolean
  regularResults: SearchResultItem[]
  aiModeEnabled: boolean
  isAILoading: boolean
  isResultsRefreshing: boolean
  noteGroups: ReturnType<typeof useMobileAIPaginatedSearch>['noteGroups']
  aiQueryReady: boolean
  aiError: string | null
  onRetryAiSearch: () => void
  shouldShowResultsList: boolean
  activeMode: 'regular' | 'ai-note' | 'ai-chunk'
  onRegularNotePress: (note: Note) => void
  onDeleteRegularNote: (id: string) => void
  onOpenAiResult: (
    note: Pick<Note, 'id'> & Partial<Pick<Note, 'title' | 'tags'>>,
    charOffset: number,
    chunkLength: number
  ) => void
  onTagPress: (tag: string) => void
  onScrollBeginDrag: () => void
  selectionMode: boolean
  selectedIds: Set<string>
  onActivateSelection: (id: string) => void
  onToggleSelect: (id: string) => void
  hasMore: boolean
  loadingMore: boolean
  onLoadMore: () => void
  onRefreshResults: () => void
  bottomInset: number
  shouldShowEmptyResults: boolean
  shouldShowIdleState: boolean
  hasGeminiApiKey: boolean
  geminiConfigured: boolean | null
}

function SearchScreenBody({
  styles,
  colors,
  showHistory,
  history,
  onClearHistory,
  onHistoryItemPress,
  isRegularLoading,
  regularResults,
  aiModeEnabled,
  isAILoading,
  isResultsRefreshing,
  noteGroups,
  aiQueryReady,
  aiError,
  onRetryAiSearch,
  shouldShowResultsList,
  activeMode,
  onRegularNotePress,
  onDeleteRegularNote,
  onOpenAiResult,
  onTagPress,
  onScrollBeginDrag,
  selectionMode,
  selectedIds,
  onActivateSelection,
  onToggleSelect,
  hasMore,
  loadingMore,
  onLoadMore,
  onRefreshResults,
  bottomInset,
  shouldShowEmptyResults,
  shouldShowIdleState,
  hasGeminiApiKey,
  geminiConfigured,
}: SearchScreenBodyProps) {
  if (showHistory) {
    return (
      <View style={styles.historyContainer}>
        <View style={styles.historyHeader}>
          <Text style={styles.historyTitle}>Search History</Text>
          <Pressable
            onPress={onClearHistory}
            accessibilityRole="button"
            accessibilityLabel="Clear search history"
          >
            <Text style={styles.historyClear}>Clear</Text>
          </Pressable>
        </View>
        {history.map((item) => (
          <Pressable
            key={item}
            style={({ pressed }) => [
              styles.historyItem,
              pressed && styles.historyItemPressed,
            ]}
            onPress={() => onHistoryItemPress(item)}
            accessibilityRole="button"
            accessibilityLabel={`Search again for ${item}`}
          >
            <Text style={styles.historyText} numberOfLines={1}>
              {item}
            </Text>
          </Pressable>
        ))}
      </View>
    )
  }

  if (isRegularLoading && regularResults.length === 0 && !aiModeEnabled) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (isAILoading && noteGroups.length === 0 && aiModeEnabled && aiQueryReady) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color={colors.primary} />
      </View>
    )
  }

  if (aiError && aiModeEnabled) {
    return (
      <View style={styles.messageCard}>
        <Text style={styles.messageTitle}>AI Search unavailable</Text>
        <Text style={styles.messageBody}>{aiError}</Text>
        <Pressable
          onPress={onRetryAiSearch}
          accessibilityRole="button"
          style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
        >
          <Text style={styles.retryButtonText}>Retry</Text>
        </Pressable>
      </View>
    )
  }

  if (shouldShowResultsList) {
    return (
      <SearchResultsList
        mode={activeMode}
        regularResults={regularResults}
        aiNoteGroups={noteGroups}
        onRegularNotePress={onRegularNotePress}
        onDeleteRegularNote={onDeleteRegularNote}
        onOpenAiResult={onOpenAiResult}
        onTagPress={onTagPress}
        onScrollBeginDrag={onScrollBeginDrag}
        selectionMode={selectionMode}
        selectedIds={selectedIds}
        onActivateSelection={onActivateSelection}
        onToggleSelect={onToggleSelect}
        hasMore={hasMore}
        loadingMore={loadingMore}
        onLoadMore={onLoadMore}
        refreshing={isResultsRefreshing}
        onRefresh={onRefreshResults}
        bottomInset={bottomInset}
      />
    )
  }

  if (shouldShowEmptyResults) {
    return (
      <SearchResultsList
        mode={activeMode}
        regularResults={[]}
        aiNoteGroups={[]}
        onRegularNotePress={onRegularNotePress}
        onDeleteRegularNote={onDeleteRegularNote}
        onOpenAiResult={onOpenAiResult}
        onTagPress={onTagPress}
        selectionMode={false}
        bottomInset={bottomInset}
      />
    )
  }

  if (!shouldShowIdleState) {
    return null
  }

  return (
    <View style={styles.messageCard}>
      <Text style={styles.messageTitle}>Search your notes</Text>
      <Text style={styles.messageBody}>
        {hasGeminiApiKey
          ? 'Switch on AI Search for semantic matching, or keep typing for regular search.'
          : geminiConfigured === false
            ? 'Type a query to search your notes. AI Search unlocks after you add a Gemini API key in Settings.'
            : 'Type a query to search your notes. AI Search will be available once key status finishes loading.'}
      </Text>
    </View>
  )
}

export default function SearchScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { client, user } = useSupabase()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { closeAll } = useSwipeContext()
  const params = useLocalSearchParams<{ tag?: string }>()

  const apiKeysSettingsService = useMemo(() => new ApiKeysSettingsService(client), [client])
  const { data: apiKeysStatus } = useQuery({
    queryKey: ['apiKeysStatus', user?.id],
    queryFn: () => apiKeysSettingsService.getStatus(),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(user?.id),
  })

  const geminiConfigured = apiKeysStatus?.gemini?.configured ?? null
  const hasGeminiApiKey = geminiConfigured === true

  const [query, setQuery] = useState('')
  const [activeTag, setActiveTag] = useState<string | null>(null)

  const {
    isAIEnabled,
    preset,
    viewMode,
    setIsAIEnabled,
    setPreset,
    setViewMode,
  } = useMobileSearchMode()

  const aiModeEnabled = isAIEnabled && hasGeminiApiKey
  const {
    data,
    isLoading: isRegularLoading,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching: isRegularFetching,
    refetch: refetchRegularSearch,
  } = useSearch(query, { tag: activeTag, enabled: !aiModeEnabled })

  const {
    noteGroups,
    isLoading: isAILoading,
    isRefreshing: isAIRefreshing,
    error: aiError,
    refetch: refetchAISearch,
    aiHasMore,
    aiLoadingMore,
    loadMoreAI,
    resetAIResults,
  } = useMobileAIPaginatedSearch({
    query,
    preset,
    filterTag: activeTag,
    isEnabled: aiModeEnabled,
  })

  const { mutate: deleteNote } = useDeleteNote()
  const openNote = useOpenNote()
  const { isActive, selectedIds, activate, toggle, selectAll, clear, deactivate } = useBulkSelection()
  const { bulkDelete, isPending: isBulkDeleting } = useBulkDeleteNotes()

  const regularResults = data?.pages.flatMap((page) => page.results) ?? []
  const selectionCapable = !aiModeEnabled || viewMode === 'note'
  const selectionLockActive = isActive
  const queryTrimmed = query.trim()
  const { history, showHistory, clearHistoryItems, applyHistoryItem } = useSearchHistoryState(
    user?.id,
    queryTrimmed,
    activeTag
  )
  const aiQueryReady = aiModeEnabled && queryTrimmed.length >= AI_SEARCH_MIN_QUERY_LENGTH
  const shouldShowIdleState =
    !showHistory &&
    !isRegularLoading &&
    !isAILoading &&
    !aiError &&
    !regularResults.length &&
    !noteGroups.length &&
    !activeTag &&
    queryTrimmed.length === 0

  const selectableResultIds = useMemo(() => {
    if (aiModeEnabled && viewMode === 'note') {
      return noteGroups.map((group) => group.noteId)
    }
    if (aiModeEnabled && viewMode === 'chunk') {
      return []
    }
    return regularResults.map((note) => note.id)
  }, [aiModeEnabled, noteGroups, regularResults, viewMode])

  useEffect(() => {
    if (typeof params.tag === 'string' && params.tag.trim().length > 0) {
      setActiveTag(params.tag)
      return
    }
    setActiveTag(null)
  }, [params.tag])
  useSelectionLifecycle({
    isActive,
    deactivate,
    navigation,
    selectedIds,
    selectableResultIds,
    selectionCapable,
    query,
    styles,
  })

  const handleTagPress = useCallback((tag: string) => {
    if (!shouldUpdateTagFilter(activeTag, tag)) return
    setActiveTag(tag)
    router.setParams({ tag })
  }, [activeTag, router])

  const handleClearTagFilter = useCallback(() => {
    setActiveTag(null)
    router.setParams({ tag: '' })
  }, [router])

  const handleDeleteNote = useCallback((id: string) => {
    deleteNote(id, {
      onError: () => {
        Alert.alert('Error', 'Failed to delete note. Please try again.')
      },
    })
  }, [deleteNote])

  const handleRegularNotePress = useCallback((note: Note) => {
    runAsyncSafely(
      openNote(note),
      () => Alert.alert('Error', 'Unable to open note. Please try again.')
    )
  }, [openNote])

  const handleOpenAiResult = useCallback((
    note: Pick<Note, 'id'> & Partial<Pick<Note, 'title' | 'tags'>>,
    charOffset: number,
    chunkLength: number
  ) => {
    runAsyncSafely(
      openNote(note, {
        chunkFocus: {
          charOffset,
          chunkLength,
        },
      }),
      () => Alert.alert('Error', 'Unable to open note. Please try again.')
    )
  }, [openNote])

  const handleBulkDelete = useCallback(() => {
    const count = selectedIds.size
    const handleConfirmedDelete = () => {
      runAsyncSafely(
        bulkDelete([...selectedIds]).then(() => {
          if (aiModeEnabled) {
            resetAIResults()
            runAsyncSafely(refetchAISearch())
          } else {
            runAsyncSafely(refetchRegularSearch())
          }
          deactivate()
        }),
        () => {
          Alert.alert('Error', 'Failed to delete selected notes. Please try again.')
        }
      )
    }

    Alert.alert(
      'Delete notes',
      `Delete ${count} note${count === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: handleConfirmedDelete,
        },
      ]
    )
  }, [
    aiModeEnabled,
    bulkDelete,
    deactivate,
    refetchAISearch,
    refetchRegularSearch,
    resetAIResults,
    selectedIds,
  ])

  const controlsHelperText = useMemo(() => {
    if (geminiConfigured === false) {
      return 'Add a Gemini API key in Settings to enable AI search.'
    }
    if (selectionLockActive) {
      return 'Finish selection to switch search mode or result view.'
    }
    if (aiModeEnabled && queryTrimmed.length > 0 && queryTrimmed.length < AI_SEARCH_MIN_QUERY_LENGTH) {
      return `Type at least ${AI_SEARCH_MIN_QUERY_LENGTH} characters for AI search.`
    }
    return null
  }, [aiModeEnabled, geminiConfigured, queryTrimmed.length, selectionLockActive])

  const activeMode = aiModeEnabled ? (viewMode === 'chunk' ? 'ai-chunk' : 'ai-note') : 'regular'
  const shouldShowResultsList =
    (!aiModeEnabled && regularResults.length > 0) ||
    (aiModeEnabled && noteGroups.length > 0)
  const shouldShowEmptyResults =
    !showHistory &&
    !shouldShowResultsList &&
    !isRegularLoading &&
    !isAILoading &&
    !aiError &&
    ((!aiModeEnabled && (queryTrimmed.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH || !!activeTag)) ||
      (aiModeEnabled && aiQueryReady))

  const listBottomInset = isActive ? 88 : 16
  const handleLoadMore = useCallback(() => {
    if (aiModeEnabled) {
      loadMoreAI()
      return
    }
    runAsyncSafely(fetchNextPage())
  }, [aiModeEnabled, fetchNextPage, loadMoreAI])
  const handleRefreshResults = useCallback(() => {
    if (aiModeEnabled) {
      resetAIResults()
      runAsyncSafely(refetchAISearch())
      return
    }
    runAsyncSafely(refetchRegularSearch())
  }, [aiModeEnabled, refetchAISearch, refetchRegularSearch, resetAIResults])
  const handleHistoryItemPress = useCallback((item: string) => {
    setQuery(applyHistoryItem(item))
  }, [applyHistoryItem])
  const isResultsRefreshing = aiModeEnabled
    ? isAIRefreshing
    : isRegularFetching && !isFetchingNextPage && regularResults.length > 0

  return (
    <View style={styles.container}>
      <TagFilterBar tag={activeTag} onClear={handleClearTagFilter} style={styles.tagFilter} />

      <SearchControls
        query={query}
        placeholder={activeTag ? `Search in "${activeTag}" notes...` : 'Search notes...'}
        onChangeQuery={setQuery}
        onClearQuery={() => {
          setQuery('')
          if (isActive) deactivate()
          resetAIResults()
        }}
        isAIEnabled={aiModeEnabled}
        onToggleAI={(enabled) => {
          if (selectionLockActive || geminiConfigured !== true) return
          setIsAIEnabled(enabled)
        }}
        aiToggleDisabled={selectionLockActive || geminiConfigured !== true}
        viewMode={viewMode}
        onChangeViewMode={(mode) => {
          if (selectionLockActive) return
          setViewMode(mode)
        }}
        viewModeDisabled={selectionLockActive}
        preset={preset}
        onChangePreset={setPreset}
        helperText={controlsHelperText}
      />

      <SearchScreenBody
        styles={styles}
        colors={colors}
        showHistory={showHistory}
        history={history}
        onClearHistory={clearHistoryItems}
        onHistoryItemPress={handleHistoryItemPress}
        isRegularLoading={isRegularLoading}
        regularResults={regularResults as SearchResultItem[]}
        aiModeEnabled={aiModeEnabled}
        isAILoading={isAILoading}
        isResultsRefreshing={isResultsRefreshing}
        noteGroups={noteGroups}
        aiQueryReady={aiQueryReady}
        aiError={aiError}
        onRetryAiSearch={refetchAISearch}
        shouldShowResultsList={shouldShowResultsList}
        activeMode={activeMode}
        onRegularNotePress={handleRegularNotePress}
        onDeleteRegularNote={handleDeleteNote}
        onOpenAiResult={handleOpenAiResult}
        onTagPress={handleTagPress}
        onScrollBeginDrag={closeAll}
        selectionMode={isActive && selectionCapable}
        selectedIds={selectedIds}
        onActivateSelection={activate}
        onToggleSelect={toggle}
        hasMore={aiModeEnabled ? aiHasMore : hasNextPage}
        loadingMore={aiModeEnabled ? aiLoadingMore : isFetchingNextPage}
        onLoadMore={handleLoadMore}
        onRefreshResults={handleRefreshResults}
        bottomInset={listBottomInset}
        shouldShowEmptyResults={shouldShowEmptyResults}
        shouldShowIdleState={shouldShowIdleState}
        hasGeminiApiKey={hasGeminiApiKey}
        geminiConfigured={geminiConfigured}
      />

      {isActive && selectionCapable && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={selectableResultIds.length}
          onSelectAll={() => selectAll(selectableResultIds)}
          onDeselectAll={clear}
          onDelete={handleBulkDelete}
          isPending={isBulkDeleting}
        />
      )}
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  tagFilter: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 4,
  },
  center: {
    marginTop: 32,
    alignItems: 'center',
  },
  messageCard: {
    marginHorizontal: 16,
    marginTop: 24,
    padding: 20,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.card,
  },
  messageTitle: {
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 6,
  },
  messageBody: {
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
  retryButton: {
    marginTop: 12,
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: colors.secondary,
    borderWidth: 1,
    borderColor: colors.border,
  },
  retryButtonPressed: {
    opacity: 0.8,
  },
  retryButtonText: {
    fontSize: 12,
    fontFamily: 'Inter_600SemiBold',
    color: colors.foreground,
  },
  historyContainer: {
    marginHorizontal: 16,
    marginBottom: 8,
    backgroundColor: colors.card,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    overflow: 'hidden',
  },
  historyHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  historyTitle: {
    fontSize: 14,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
  },
  historyClear: {
    fontSize: 13,
    fontFamily: 'Inter_600SemiBold',
    color: colors.primary,
  },
  historyItem: {
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.muted,
  },
  historyItemPressed: {
    backgroundColor: colors.accent,
  },
  historyText: {
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
    fontSize: 14,
  },
  headerCancel: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  headerCancelText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.primary,
  },
})
