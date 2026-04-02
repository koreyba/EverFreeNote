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
import { useQueryClient } from '@tanstack/react-query'

import { SEARCH_CONFIG } from '@core/constants/search'
import type { AIIndexFilter, AIIndexMutationResult, AIIndexNoteRow } from '@core/types/aiIndex'
import { Badge } from '@ui/mobile/components/ui/Badge'
import { Button } from '@ui/mobile/components/ui/Button'
import { AIIndexNoteCard } from '@ui/mobile/components/settings/AIIndexNoteCard'
import {
  getAIIndexNotesQueryPrefix,
  useAIIndexNotes,
  useFlattenedAIIndexNotes,
} from '@ui/mobile/hooks/useAIIndexNotes'
import { useSupabase, useTheme } from '@ui/mobile/providers'

const FILTER_OPTIONS: Array<{ value: AIIndexFilter; label: string }> = [
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

export function AIIndexPanel() {
  const { colors } = useTheme()
  const { user } = useSupabase()
  const queryClient = useQueryClient()
  const styles = useMemo(() => createStyles(colors), [colors])
  const listRef = useRef<FlatList<AIIndexNoteRow> | null>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const [filter, setFilter] = useState<AIIndexFilter>('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')

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

  const handleMutated = useCallback(
    (_result: AIIndexMutationResult) => {
      void queryClient.invalidateQueries({
        queryKey: getAIIndexNotesQueryPrefix(user?.id),
      })
    },
    [queryClient, user?.id],
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

  return (
    <View style={styles.root}>
      <View style={styles.filterRail}>
        <ScrollView
          accessibilityRole="tablist"
          horizontal
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
                  isActive && styles.chipActive,
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
        <View style={styles.metaRow}>
          <Badge variant="outline" style={styles.metaBadge}>
            {`${totalCount} visible`}
          </Badge>
          <Text style={styles.metaText}>
            {FILTER_OPTIONS.find((option) => option.value === filter)?.label ?? 'All notes'}
          </Text>
        </View>

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
            {(hasActiveSearch || hasActiveFilter) ? (
              <View style={styles.summaryActions}>
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

      {queryResult.isLoading ? (
        <View style={styles.centerState}>
          <ActivityIndicator color={colors.foreground} />
          <Text style={styles.statusText}>Loading AI index notes...</Text>
        </View>
      ) : queryResult.isError ? (
        <View style={styles.centerState}>
          <Text style={styles.errorTitle}>AI Index is unavailable</Text>
          <Text style={styles.errorText}>{errorMessage}</Text>
          <Button variant="outline" size="sm" onPress={handleRefresh}>
            Retry
          </Button>
        </View>
      ) : notes.length === 0 ? (
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
      ) : (
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
      )}
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
      paddingBottom: 12,
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    controlsSection: {
      gap: 10,
    },
    filterRow: {
      gap: 10,
      paddingRight: 8,
    },
    chip: {
      minHeight: 40,
      paddingHorizontal: 16,
      paddingVertical: 9,
      borderRadius: 14,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
      justifyContent: 'center',
    },
    chipActive: {
      backgroundColor: colors.selectionBackground,
      borderColor: colors.selectionBorder,
    },
    chipPressed: {
      opacity: 0.85,
    },
    chipLabel: {
      color: colors.mutedForeground,
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
    },
    chipLabelActive: {
      color: colors.selectionForeground,
    },
    metaRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      flexWrap: 'wrap',
    },
    metaBadge: {
      backgroundColor: colors.background,
    },
    metaText: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
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
