import type { MutableRefObject, ReactElement } from 'react'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { Database, Search, X } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'

import { getAIIndexActionPresentation, getAIIndexActionableNotes } from '@core/constants/aiIndex'
import { SEARCH_CONFIG } from '@core/constants/search'
import { parseRagIndexResult } from '@core/rag/indexResult'
import type { AIIndexFilter, AIIndexMutationResult, AIIndexNoteRow, AIIndexNotesPage } from '@core/types/aiIndex'
import { Button } from '@ui/mobile/components/ui/Button'
import { AIIndexNoteCard } from '@ui/mobile/components/settings/AIIndexNoteCard'
import {
  getAIIndexNotesQueryKey,
  getAIIndexNotesQueryPrefix,
  useAIIndexNotes,
  useFlattenedAIIndexNotes,
} from '@ui/mobile/hooks/useAIIndexNotes'
import { useSupabase, useTheme } from '@ui/mobile/providers'

type FilterOption = Readonly<{
  value: AIIndexFilter
  label: string
}>

type BulkIndexProgress = {
  completed: number
  total: number
}

type BulkIndexOutcome = 'indexed' | 'skipped' | 'failed'

type BulkIndexInvoke = (
  name: string,
  options: { body: { noteId: string; action: 'index' | 'reindex' } }
) => Promise<{ data: unknown; error: unknown }>

const FILTER_OPTIONS: readonly FilterOption[] = [
  { value: 'all', label: 'All notes' },
  { value: 'indexed', label: 'Indexed' },
  { value: 'not_indexed', label: 'Not indexed' },
  { value: 'outdated', label: 'Outdated' },
]

const FILTER_EMPTY_MESSAGES: Record<AIIndexFilter, string> = {
  all: 'No notes found yet.',
  indexed: 'No indexed notes match this filter.',
  not_indexed: 'Every visible note is already indexed.',
  outdated: 'No outdated notes right now.',
}

const DEBOUNCE_MS = 300

function runAsyncTask(task: Promise<unknown> | unknown) {
  Promise.resolve(task).catch(() => {
    // Best-effort background work should not break the settings UI.
  })
}

function getEmptyMessage(filter: AIIndexFilter, searchQuery: string) {
  if (searchQuery.length > 0) return `No notes match "${searchQuery}".`
  return FILTER_EMPTY_MESSAGES[filter]
}

function getSummaryText(loadedCount: number, totalCount: number) {
  if (loadedCount === 0) return null
  if (loadedCount < totalCount) return `Showing ${loadedCount} of ${totalCount} notes`
  return `${totalCount} note${totalCount === 1 ? '' : 's'}`
}

function getBulkSummaryText(successCount: number, skippedCount: number, errorCount: number) {
  return [
    successCount > 0 ? `${successCount} indexed` : null,
    skippedCount > 0 ? `${skippedCount} skipped` : null,
    errorCount > 0 ? `${errorCount} failed` : null,
  ].filter(Boolean).join(' • ')
}

function patchNoteStatus(note: AIIndexNoteRow, result: AIIndexMutationResult): AIIndexNoteRow {
  if (note.id !== result.noteId) return note
  return {
    ...note,
    status: result.nextStatus,
    lastIndexedAt: result.nextStatus === 'not_indexed' ? null : new Date().toISOString(),
  }
}

function shouldKeepNote(note: AIIndexNoteRow, result: AIIndexMutationResult, filter: AIIndexFilter): boolean {
  if (filter === 'all') return true
  return note.id !== result.noteId || note.status === filter
}

function getFilterFromAIIndexQueryKey(queryKey: readonly unknown[]): AIIndexFilter {
  const rawFilter = Array.isArray(queryKey) ? queryKey[2] : null
  return rawFilter === 'indexed'
    || rawFilter === 'not_indexed'
    || rawFilter === 'outdated'
    || rawFilter === 'all'
    ? rawFilter
    : 'all'
}

function incrementBulkCounts(
  counts: Readonly<{ successCount: number; skippedCount: number; errorCount: number }>,
  outcome: BulkIndexOutcome,
) {
  if (outcome === 'indexed') {
    return { ...counts, successCount: counts.successCount + 1 }
  }
  if (outcome === 'skipped') {
    return { ...counts, skippedCount: counts.skippedCount + 1 }
  }
  return { ...counts, errorCount: counts.errorCount + 1 }
}

function showBulkIndexToast(successCount: number, skippedCount: number, errorCount: number) {
  const summary = getBulkSummaryText(successCount, skippedCount, errorCount)

  if (successCount > 0 && errorCount === 0) {
    Toast.show({ type: 'success', text1: summary || 'Loaded notes indexed' })
    return
  }

  if (successCount > 0 || skippedCount > 0 || errorCount > 0) {
    Toast.show({ type: 'info', text1: summary || 'Bulk indexing finished' })
  }
}

function updateBulkProgress(
  index: number,
  total: number,
  setBulkIndexProgress: (progress: BulkIndexProgress) => void,
) {
  setBulkIndexProgress({
    completed: index + 1,
    total,
  })
}

async function processBulkIndexNote({
  applyMutationResult,
  invoke,
  note,
}: Readonly<{
  applyMutationResult: (result: AIIndexMutationResult) => void
  invoke: BulkIndexInvoke
  note: AIIndexNoteRow
}>): Promise<BulkIndexOutcome> {
  const actionPresentation = getAIIndexActionPresentation(note.status)

  try {
    const { data, error } = await invoke('rag-index', {
      body: { noteId: note.id, action: actionPresentation.action },
    })
    if (error) throw error

    const result = parseRagIndexResult(data)
    if (result.outcome === 'indexed') {
      applyMutationResult({
        noteId: note.id,
        previousStatus: note.status,
        nextStatus: actionPresentation.successStatus,
      })
      return 'indexed'
    }

    if (result.outcome === 'skipped') {
      if (result.reason === 'too_short') {
        applyMutationResult({
          noteId: note.id,
          previousStatus: note.status,
          nextStatus: 'not_indexed',
        })
      }
      return 'skipped'
    }

    return 'failed'
  } catch {
    return 'failed'
  }
}

function AIIndexSummary({
  bulkAction,
  filterLabel,
  hasActiveSearch,
  isFetching,
  isFetchingNextPage,
  styles,
  summaryText,
}: Readonly<{
  bulkAction?: ReactElement | null
  filterLabel: string
  hasActiveSearch: boolean
  isFetching: boolean
  isFetchingNextPage: boolean
  styles: ReturnType<typeof createStyles>
  summaryText: string | null
}>) {
  if (!summaryText) return null

  const showSummaryActions = Boolean(bulkAction)

  return (
    <View style={styles.summaryRow}>
      <Text style={styles.summaryText}>{summaryText}</Text>
      <View style={styles.summaryMeta}>
        <View style={styles.summaryBadge}>
          <Text style={styles.summaryBadgeLabel}>{filterLabel}</Text>
        </View>
        {hasActiveSearch ? (
          <View style={styles.summaryBadge}>
            <Text style={styles.summaryBadgeLabel}>Search active</Text>
          </View>
        ) : null}
        {isFetching && !isFetchingNextPage ? (
          <Text style={styles.summaryMetaText}>Refreshing...</Text>
        ) : null}
        {isFetchingNextPage ? (
          <Text style={styles.summaryMetaText}>Loading more</Text>
        ) : null}
      </View>
      {showSummaryActions ? (
        <View style={styles.summaryActions}>
          {bulkAction}
        </View>
      ) : null}
    </View>
  )
}

function AIIndexContent({
  colors,
  emptyMessage,
  errorMessage,
  hasActiveFilter,
  hasActiveSearch,
  keyExtractor,
  listRef,
  notes,
  onClearSearch,
  onLoadMore,
  onRefresh,
  onResetFilter,
  queryResult,
  renderItem,
  styles,
}: Readonly<{
  colors: ReturnType<typeof useTheme>['colors']
  emptyMessage: string
  errorMessage: string
  hasActiveFilter: boolean
  hasActiveSearch: boolean
  keyExtractor: (item: AIIndexNoteRow) => string
  listRef: MutableRefObject<FlatList<AIIndexNoteRow> | null>
  notes: AIIndexNoteRow[]
  onClearSearch: () => void
  onLoadMore: () => void
  onRefresh: () => void
  onResetFilter: () => void
  queryResult: ReturnType<typeof useAIIndexNotes>
  renderItem: ({ item }: { item: AIIndexNoteRow }) => ReactElement
  styles: ReturnType<typeof createStyles>
}>) {
  if (queryResult.isLoading) {
    return (
      <View style={styles.centerState}>
        <ActivityIndicator color={colors.foreground} />
        <Text style={styles.statusText}>Loading AI index notes...</Text>
      </View>
    )
  }

  if (queryResult.isError) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.errorTitle}>AI Index is unavailable</Text>
        <Text style={styles.errorText}>{errorMessage}</Text>
        <Button variant="outline" size="sm" onPress={onRefresh}>
          Retry
        </Button>
      </View>
    )
  }

  if (notes.length === 0) {
    return (
      <View style={styles.centerState}>
        <Text style={styles.statusText}>{emptyMessage}</Text>
        {(hasActiveSearch || hasActiveFilter) ? (
          <View style={styles.emptyActions}>
            {hasActiveSearch ? (
              <Button variant="ghost" size="sm" onPress={onClearSearch}>
                Clear search
              </Button>
            ) : null}
            {hasActiveFilter ? (
              <Button variant="ghost" size="sm" onPress={onResetFilter}>
                Show all notes
              </Button>
            ) : null}
          </View>
        ) : null}
      </View>
    )
  }

  return (
    <FlatList
      ref={listRef}
      testID="ai-index-list"
      data={notes}
      renderItem={renderItem}
      keyExtractor={keyExtractor}
      style={styles.list}
      contentContainerStyle={styles.listContent}
      onEndReached={onLoadMore}
      onEndReachedThreshold={0.4}
      refreshing={queryResult.isRefetching && !queryResult.isFetchingNextPage}
      onRefresh={onRefresh}
      keyboardShouldPersistTaps="handled"
      ListFooterComponent={
        queryResult.isFetchingNextPage ? (
          <ActivityIndicator style={styles.footer} color={colors.foreground} />
        ) : null
      }
    />
  )
}

export function AIIndexPanel() {
  const { colors } = useTheme()
  const { client: supabase, user } = useSupabase()
  const queryClient = useQueryClient()
  const styles = useMemo(() => createStyles(colors), [colors])
  const listRef = useRef<FlatList<AIIndexNoteRow> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [filter, setFilter] = useState<AIIndexFilter>('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const [bulkIndexProgress, setBulkIndexProgress] = useState<BulkIndexProgress | null>(null)

  const normalizedSearchDraft = searchDraft.trim()
  const isSearchHintVisible =
    normalizedSearchDraft.length > 0 && normalizedSearchDraft.length < SEARCH_CONFIG.MIN_QUERY_LENGTH

  useEffect(() => () => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
  }, [])

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)

    if (normalizedSearchDraft.length === 0) {
      setSearchQuery('')
      return
    }

    debounceRef.current = setTimeout(() => {
      setSearchQuery(
        normalizedSearchDraft.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH ? normalizedSearchDraft : ''
      )
    }, DEBOUNCE_MS)
  }, [normalizedSearchDraft])

  useEffect(() => {
    listRef.current?.scrollToOffset({ offset: 0, animated: false })
  }, [filter, searchQuery])

  const queryResult = useAIIndexNotes(filter, searchQuery)
  const notes = useFlattenedAIIndexNotes(queryResult)
  const activeQueryKey = useMemo(
    () => getAIIndexNotesQueryKey(user?.id, filter, searchQuery),
    [filter, searchQuery, user?.id],
  )
  const totalCount = queryResult.data?.pages[0]?.totalCount ?? 0
  const summaryText = getSummaryText(notes.length, totalCount)
  const emptyMessage = getEmptyMessage(filter, searchQuery)
  const actionableLoadedNotes = useMemo(() => getAIIndexActionableNotes(notes), [notes])

  const applyMutationResultToQuery = useCallback((
    queryKey: readonly unknown[],
    result: AIIndexMutationResult,
  ) => {
    queryClient.setQueryData<InfiniteData<AIIndexNotesPage>>(queryKey, (old) => {
      if (!old) return old
      return {
        ...old,
        pages: old.pages.map((page) => ({
          ...page,
          notes: page.notes
            .map((note) => patchNoteStatus(note, result))
            .filter((note) => shouldKeepNote(note, result, filter)),
        })),
      }
    })
  }, [filter, queryClient])

  const applyMutationResult = useCallback((result: AIIndexMutationResult) => {
    const cachedQueries = queryClient.getQueriesData<InfiniteData<AIIndexNotesPage>>({
      queryKey: getAIIndexNotesQueryPrefix(user?.id),
    })

    for (const [queryKey, queryData] of cachedQueries) {
      if (!queryData) continue

      const queryFilter = getFilterFromAIIndexQueryKey(queryKey)
      queryClient.setQueryData<InfiniteData<AIIndexNotesPage>>(queryKey, {
        ...queryData,
        pages: queryData.pages.map((page) => ({
          ...page,
          notes: page.notes
            .map((note) => patchNoteStatus(note, result))
            .filter((note) => shouldKeepNote(note, result, queryFilter)),
        })),
      })
    }
  }, [queryClient, user?.id])

  const handleMutated = useCallback((result: AIIndexMutationResult) => {
    applyMutationResult(result)
    runAsyncTask(queryClient.invalidateQueries({
      queryKey: getAIIndexNotesQueryPrefix(user?.id),
    }))
  }, [applyMutationResult, queryClient, user?.id])

  const handleLoadMore = useCallback(() => {
    if (!queryResult.hasNextPage || queryResult.isFetchingNextPage) return
    runAsyncTask(queryResult.fetchNextPage())
  }, [queryResult])

  const handleRefresh = useCallback(() => {
    runAsyncTask(queryResult.refetch())
  }, [queryResult])

  const invokeBulkIndex = useCallback<BulkIndexInvoke>((name, options) => {
    return supabase.functions.invoke(name, options)
  }, [supabase.functions])

  const handleClearSearch = useCallback(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    setSearchDraft('')
    setSearchQuery('')
  }, [])

  const handleResetFilter = useCallback(() => {
    setFilter('all')
  }, [])

  const handleBulkIndexLoaded = useCallback(async () => {
    if (bulkIndexProgress || actionableLoadedNotes.length === 0) return

    let counts = { successCount: 0, skippedCount: 0, errorCount: 0 }
    setBulkIndexProgress({ completed: 0, total: actionableLoadedNotes.length })

    try {
      for (const [index, note] of actionableLoadedNotes.entries()) {
        const outcome = await processBulkIndexNote({
          applyMutationResult: (result) => applyMutationResultToQuery(activeQueryKey, result),
          invoke: invokeBulkIndex,
          note,
        })
        counts = incrementBulkCounts(counts, outcome)
        updateBulkProgress(index, actionableLoadedNotes.length, setBulkIndexProgress)
      }

      showBulkIndexToast(counts.successCount, counts.skippedCount, counts.errorCount)
    } finally {
      setBulkIndexProgress(null)
      await queryClient.invalidateQueries({
        queryKey: getAIIndexNotesQueryPrefix(user?.id),
      })
    }
  }, [actionableLoadedNotes, activeQueryKey, applyMutationResultToQuery, bulkIndexProgress, invokeBulkIndex, queryClient, user?.id])

  const handleBulkIndexPress = useCallback(() => {
    runAsyncTask(handleBulkIndexLoaded())
  }, [handleBulkIndexLoaded])

  const renderItem = useCallback(
    ({ item }: { item: AIIndexNoteRow }) => (
      <AIIndexNoteCard note={item} onMutated={handleMutated} />
    ),
    [handleMutated],
  )

  const keyExtractor = useCallback((item: AIIndexNoteRow) => item.id, [])

  const hasActiveSearch = searchQuery.length > 0
  const hasActiveFilter = filter !== 'all'
  const errorMessage = queryResult.error instanceof Error
    ? queryResult.error.message
    : 'Failed to load AI index notes.'
  const showBulkAction = actionableLoadedNotes.length > 0 || bulkIndexProgress !== null
  const bulkActionLabel = bulkIndexProgress
    ? `${bulkIndexProgress.completed}/${bulkIndexProgress.total}`
    : 'Index loaded'
  const bulkAction = showBulkAction ? (
    <Button
      variant="default"
      size="sm"
      accessibilityLabel={bulkIndexProgress ? 'Indexing loaded notes' : 'Index loaded notes'}
      disabled={bulkIndexProgress !== null}
      onPress={handleBulkIndexPress}
      style={[
        styles.actionChip,
        styles.actionButton,
      ]}
    >
      <View style={styles.actionChipContent}>
        {bulkIndexProgress ? (
          <ActivityIndicator size="small" color={colors.primaryForeground} style={styles.actionChipSpinner} />
        ) : (
          <Database size={12} color={colors.primaryForeground} />
        )}
        <Text style={styles.actionButtonLabel}>{bulkActionLabel}</Text>
      </View>
    </Button>
  ) : null

  return (
    <View style={styles.root}>
      <View style={styles.filterRail}>
        <ScrollView
          horizontal
          keyboardShouldPersistTaps="handled"
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterRow}
        >
          {FILTER_OPTIONS.map((option) => {
            const isActive = option.value === filter

            return (
              <Pressable
                key={option.value}
                accessibilityRole="tab"
                accessibilityLabel={option.label}
                accessibilityState={{ selected: isActive }}
                onPress={() => setFilter(option.value)}
                style={({ pressed }) => [
                  styles.chip,
                  pressed && styles.chipPressed,
                ]}
              >
                <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                  {option.label}
                </Text>
              </Pressable>
            )
          })}
        </ScrollView>
      </View>

      <View style={styles.controlsSection}>
        <View style={styles.searchWrap}>
          <Search size={16} color={colors.mutedForeground} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search notes..."
            placeholderTextColor={colors.mutedForeground}
            value={searchDraft}
            onChangeText={setSearchDraft}
            autoCapitalize="none"
            autoCorrect={false}
            returnKeyType="search"
          />
          {searchDraft.length > 0 ? (
            <Pressable onPress={handleClearSearch} style={styles.clearButton} hitSlop={8}>
              <X size={16} color={colors.mutedForeground} />
            </Pressable>
          ) : null}
        </View>

        {isSearchHintVisible ? (
          <Text style={styles.searchHint}>
            Search starts after {SEARCH_CONFIG.MIN_QUERY_LENGTH} characters.
          </Text>
        ) : null}

        <AIIndexSummary
          bulkAction={bulkAction}
          filterLabel={FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? 'All notes'}
          hasActiveSearch={hasActiveSearch}
          isFetching={queryResult.isRefetching}
          isFetchingNextPage={queryResult.isFetchingNextPage}
          styles={styles}
          summaryText={summaryText}
        />
      </View>

      <AIIndexContent
        colors={colors}
        emptyMessage={emptyMessage}
        errorMessage={errorMessage}
        hasActiveFilter={hasActiveFilter}
        hasActiveSearch={hasActiveSearch}
        keyExtractor={keyExtractor}
        listRef={listRef}
        notes={notes}
        onClearSearch={handleClearSearch}
        onLoadMore={handleLoadMore}
        onRefresh={handleRefresh}
        onResetFilter={handleResetFilter}
        queryResult={queryResult}
        renderItem={renderItem}
        styles={styles}
      />
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) =>
  StyleSheet.create({
    root: {
      flex: 1,
      gap: 12,
    },
    filterRail: {
      paddingBottom: 8,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.border,
    },
    controlsSection: {
      gap: 10,
    },
    filterRow: {
      gap: 16,
      paddingRight: 8,
      alignItems: 'center',
    },
    chip: {
      paddingVertical: 4,
    },
    actionChip: {
      backgroundColor: colors.primary,
    },
    actionButton: {
      flex: 1,
    },
    actionChipContent: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    actionButtonLabel: {
      color: colors.primaryForeground,
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
    },
    chipPressed: {
      opacity: 0.6,
    },
    chipLabel: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
    },
    chipLabelActive: {
      color: colors.foreground,
      fontFamily: 'Inter_600SemiBold',
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 12,
    },
    searchInput: {
      flex: 1,
      minHeight: 42,
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
      paddingVertical: 0,
    },
    clearButton: {
      padding: 4,
    },
    searchHint: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    summaryRow: {
      gap: 8,
    },
    summaryMeta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      flexWrap: 'wrap',
    },
    summaryBadge: {
      borderRadius: 999,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.background,
      paddingHorizontal: 8,
      paddingVertical: 3,
    },
    summaryBadgeLabel: {
      fontSize: 12,
      fontFamily: 'Inter_500Medium',
      color: colors.foreground,
    },
    summaryMetaText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    summaryText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    summaryActions: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      alignItems: 'center',
      width: '100%',
    },
    list: {
      flex: 1,
    },
    listContent: {
      paddingBottom: 8,
      gap: 10,
    },
    centerState: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      paddingHorizontal: 16,
      gap: 10,
    },
    statusText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    errorTitle: {
      fontSize: 16,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 13,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    emptyActions: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
      justifyContent: 'center',
    },
    footer: {
      paddingVertical: 16,
    },
  })
