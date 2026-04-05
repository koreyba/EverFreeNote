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
import { Search, X } from 'lucide-react-native'
import Toast from 'react-native-toast-message'
import { useQueryClient, type InfiniteData } from '@tanstack/react-query'

import { getAIIndexActionPresentation, getAIIndexActionableNotes } from '@core/constants/aiIndex'
import { SEARCH_CONFIG } from '@core/constants/search'
import { parseRagIndexResult } from '@core/rag/indexResult'
import type { AIIndexFilter, AIIndexMutationResult, AIIndexNoteRow, AIIndexNotesPage } from '@core/types/aiIndex'
import { Button } from '@ui/mobile/components/ui/Button'
import { AIIndexNoteCard } from '@ui/mobile/components/settings/AIIndexNoteCard'
import {
  getAIIndexNotesQueryPrefix,
  useAIIndexNotes,
  useFlattenedAIIndexNotes,
} from '@ui/mobile/hooks/useAIIndexNotes'
import { useSupabase, useTheme } from '@ui/mobile/providers'

type FilterOption = Readonly<{
  value: AIIndexFilter
  label: string
}>

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
  const [bulkIndexProgress, setBulkIndexProgress] = useState<{ completed: number; total: number } | null>(null)

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
  const totalCount = queryResult.data?.pages[0]?.totalCount ?? 0
  const summaryText = getSummaryText(notes.length, totalCount)
  const emptyMessage = getEmptyMessage(filter, searchQuery)
  const actionableLoadedNotes = useMemo(() => getAIIndexActionableNotes(notes), [notes])


  const applyMutationResult = useCallback(
    (result: AIIndexMutationResult) => {
      queryClient.setQueriesData<InfiniteData<AIIndexNotesPage>>(
        { queryKey: getAIIndexNotesQueryPrefix(user?.id) },
        (old) => {
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
        },
      )
    },
    [filter, queryClient, user?.id],
  )

  const handleMutated = useCallback(
    (result: AIIndexMutationResult) => {
      applyMutationResult(result)
      void queryClient.invalidateQueries({
        queryKey: getAIIndexNotesQueryPrefix(user?.id),
      })
    },
    [applyMutationResult, queryClient, user?.id],
  )

  const handleLoadMore = useCallback(() => {
    if (queryResult.hasNextPage && !queryResult.isFetchingNextPage) {
      void queryResult.fetchNextPage()
    }
  }, [queryResult])

  const handleRefresh = useCallback(() => {
    void queryResult.refetch()
  }, [queryResult])

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

    const notesToProcess = actionableLoadedNotes
    let successCount = 0
    let skippedCount = 0
    let errorCount = 0

    setBulkIndexProgress({ completed: 0, total: notesToProcess.length })

    try {
      for (const [index, note] of notesToProcess.entries()) {
        const actionPresentation = getAIIndexActionPresentation(note.status)
        try {
          const { data, error } = await supabase.functions.invoke('rag-index', {
            body: { noteId: note.id, action: actionPresentation.action },
          })
          if (error) throw error

          const result = parseRagIndexResult(data)
          if (result.outcome === 'indexed') {
            successCount += 1
            applyMutationResult({
              noteId: note.id,
              previousStatus: note.status,
              nextStatus: actionPresentation.successStatus,
            })
          } else if (result.outcome === 'skipped') {
            skippedCount += 1
            if (result.reason === 'too_short') {
              applyMutationResult({
                noteId: note.id,
                previousStatus: note.status,
                nextStatus: 'not_indexed',
              })
            }
          } else {
            errorCount += 1
          }
        } catch {
          errorCount += 1
        } finally {
          setBulkIndexProgress({
            completed: index + 1,
            total: notesToProcess.length,
          })
        }
      }

      const summary = getBulkSummaryText(successCount, skippedCount, errorCount)
      if (successCount > 0 && errorCount === 0) {
        Toast.show({ type: 'success', text1: summary || 'Loaded notes indexed' })
      } else if (successCount > 0 || skippedCount > 0 || errorCount > 0) {
        Toast.show({ type: 'info', text1: summary || 'Bulk indexing finished' })
      }
    } finally {
      setBulkIndexProgress(null)
      void queryClient.invalidateQueries({
        queryKey: getAIIndexNotesQueryPrefix(user?.id),
      })
    }
  }, [actionableLoadedNotes, applyMutationResult, bulkIndexProgress, queryClient, supabase.functions, user?.id])

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

  const renderContent = () => {
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
          <Button variant="outline" size="sm" onPress={handleRefresh}>
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
                <Button variant="ghost" size="sm" onPress={handleClearSearch}>
                  Clear search
                </Button>
              ) : null}
              {hasActiveFilter ? (
                <Button variant="ghost" size="sm" onPress={handleResetFilter}>
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
        onEndReached={handleLoadMore}
        onEndReachedThreshold={0.4}
        refreshing={queryResult.isRefetching && !queryResult.isFetchingNextPage}
        onRefresh={handleRefresh}
        keyboardShouldPersistTaps="handled"
        ListFooterComponent={
          queryResult.isFetchingNextPage ? (
            <ActivityIndicator style={styles.footer} color={colors.foreground} />
          ) : null
        }
      />
    )
  }

  return (
    <View style={styles.root}>
      <View style={styles.filterRail}>
        <ScrollView
          accessibilityRole="tablist"
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

        {summaryText ? (
          <View style={styles.summaryRow}>
            <Text style={styles.summaryText}>{summaryText}</Text>
            {(actionableLoadedNotes.length > 0 || bulkIndexProgress || hasActiveSearch || hasActiveFilter) ? (
              <View style={styles.summaryActions}>
                {(actionableLoadedNotes.length > 0 || bulkIndexProgress) ? (
                  <Button
                    size="sm"
                    disabled={bulkIndexProgress !== null}
                    onPress={() => { void handleBulkIndexLoaded() }}
                  >
                    {bulkIndexProgress
                      ? `Indexing ${Math.min(bulkIndexProgress.total, bulkIndexProgress.completed + 1)}/${bulkIndexProgress.total}`
                      : 'Index loaded notes'}
                  </Button>
                ) : null}
                {hasActiveSearch ? (
                  <Button variant="ghost" size="sm" onPress={handleClearSearch}>
                    Clear search
                  </Button>
                ) : null}
                {hasActiveFilter ? (
                  <Button variant="ghost" size="sm" onPress={handleResetFilter}>
                    Show all
                  </Button>
                ) : null}
              </View>
            ) : null}
          </View>
        ) : null}
      </View>

      {renderContent()}
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
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      gap: 10,
      flexWrap: 'wrap',
    },
    summaryText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
    },
    summaryActions: {
      flexDirection: 'row',
      gap: 6,
      flexWrap: 'wrap',
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
