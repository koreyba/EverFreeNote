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
  const [history, setHistory] = useState<string[]>([])

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
    refetch: refetchRegularSearch,
  } = useSearch(query, { tag: activeTag, enabled: !aiModeEnabled })

  const {
    noteGroups,
    isLoading: isAILoading,
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
  const showHistory = queryTrimmed.length === 0 && history.length > 0 && !activeTag
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

  const previousQueryRef = useRef(query)

  useEffect(() => {
    if (!user?.id) return
    void getSearchHistory(user.id).then(setHistory)
  }, [user?.id])

  useEffect(() => {
    if (typeof params.tag === 'string' && params.tag.trim().length > 0) {
      setActiveTag(params.tag)
      return
    }
    setActiveTag(null)
  }, [params.tag])

  useEffect(() => {
    if (!user?.id) return
    if (queryTrimmed.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) return

    const timeout = setTimeout(() => {
      void addSearchHistoryItem(user.id, queryTrimmed).then(setHistory)
    }, 500)

    return () => clearTimeout(timeout)
  }, [queryTrimmed, user?.id])

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
    const visibleIds = new Set(selectableResultIds)
    if (selectedIds.size === 0) return
    const hasInvisibleSelection = [...selectedIds].some((id) => !visibleIds.has(id))
    if (!hasInvisibleSelection) return
    deactivate()
  }, [deactivate, isActive, selectableResultIds, selectedIds])

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
    openNote(note)
  }, [openNote])

  const handleOpenAiResult = useCallback((noteId: string, charOffset: number, chunkLength: number) => {
    router.push({
      pathname: '/note/[id]',
      params: {
        id: noteId,
        focusOffset: String(charOffset),
        focusLength: String(chunkLength),
        focusRequestId: `${noteId}:${charOffset}:${chunkLength}:${Date.now()}`,
      },
    })
  }, [router])

  const handleBulkDelete = useCallback(() => {
    const count = selectedIds.size
    Alert.alert(
      'Delete notes',
      `Delete ${count} note${count === 1 ? '' : 's'}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            void (async () => {
              await bulkDelete([...selectedIds])
              if (aiModeEnabled) {
                resetAIResults()
                refetchAISearch()
              } else {
                void refetchRegularSearch()
              }
              deactivate()
            })()
          },
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

  const listBottomInset = isActive ? 88 : 16

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

      {showHistory && (
        <View style={styles.historyContainer}>
          <View style={styles.historyHeader}>
            <Text style={styles.historyTitle}>Search History</Text>
            <Pressable
              onPress={() => {
                if (!user?.id) return
                void clearSearchHistory(user.id).then(() => setHistory([]))
              }}
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
              onPress={() => setQuery(item)}
              accessibilityRole="button"
              accessibilityLabel={`Search again for ${item}`}
            >
              <Text style={styles.historyText} numberOfLines={1}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      )}

      {!showHistory && isRegularLoading && regularResults.length === 0 && !aiModeEnabled && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {!showHistory && isAILoading && noteGroups.length === 0 && aiModeEnabled && aiQueryReady && (
        <View style={styles.center}>
          <ActivityIndicator color={colors.primary} />
        </View>
      )}

      {!showHistory && aiError && aiModeEnabled && (
        <View style={styles.messageCard}>
          <Text style={styles.messageTitle}>AI Search unavailable</Text>
          <Text style={styles.messageBody}>{aiError}</Text>
          <Pressable
            onPress={refetchAISearch}
            accessibilityRole="button"
            style={({ pressed }) => [styles.retryButton, pressed && styles.retryButtonPressed]}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </Pressable>
        </View>
      )}

      {!showHistory && shouldShowResultsList && (
        <SearchResultsList
          mode={activeMode}
          regularResults={regularResults as SearchResultItem[]}
          aiNoteGroups={noteGroups}
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
          onLoadMore={aiModeEnabled ? loadMoreAI : () => void fetchNextPage()}
          bottomInset={listBottomInset}
        />
      )}

      {!showHistory &&
        !shouldShowResultsList &&
        !isRegularLoading &&
        !isAILoading &&
        !aiError &&
        ((!aiModeEnabled && (queryTrimmed.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH || !!activeTag)) ||
          (aiModeEnabled && aiQueryReady)) && (
        <SearchResultsList
          mode={activeMode}
          regularResults={[]}
          aiNoteGroups={[]}
          onRegularNotePress={handleRegularNotePress}
          onDeleteRegularNote={handleDeleteNote}
          onOpenAiResult={handleOpenAiResult}
          onTagPress={handleTagPress}
          selectionMode={false}
          bottomInset={listBottomInset}
        />
      )}

      {shouldShowIdleState && (
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
      )}

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
