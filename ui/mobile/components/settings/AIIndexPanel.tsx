import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native'
import { useQueryClient } from '@tanstack/react-query'

import { SEARCH_CONFIG } from '@core/constants/search'
import type { AIIndexFilter, AIIndexMutationResult, AIIndexNoteRow } from '@core/types/aiIndex'
import { AIIndexNoteCard } from '@ui/mobile/components/settings/AIIndexNoteCard'
import {
  getAIIndexNotesQueryKey,
  useAIIndexNotes,
  useFlattenedAIIndexNotes,
} from '@ui/mobile/hooks/useAIIndexNotes'
import { useSupabase, useTheme } from '@ui/mobile/providers'

const FILTER_OPTIONS: Array<{ value: AIIndexFilter; label: string }> = [
  { value: 'all', label: 'All' },
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

export function AIIndexPanel() {
  const { colors } = useTheme()
  const { user } = useSupabase()
  const queryClient = useQueryClient()
  const styles = useMemo(() => createStyles(colors), [colors])

  const [filter, setFilter] = useState<AIIndexFilter>('all')
  const [searchDraft, setSearchDraft] = useState('')
  const [searchQuery, setSearchQuery] = useState('')
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const active = searchDraft.length >= SEARCH_CONFIG.MIN_QUERY_LENGTH ? searchDraft : ''
    debounceRef.current = setTimeout(() => setSearchQuery(active), DEBOUNCE_MS)
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [searchDraft])

  const queryResult = useAIIndexNotes(filter, searchQuery)
  const notes = useFlattenedAIIndexNotes(queryResult)
  const totalCount = queryResult.data?.pages[0]?.totalCount ?? 0

  const handleMutated = useCallback(
    (_result: AIIndexMutationResult) => {
      void queryClient.invalidateQueries({
        queryKey: getAIIndexNotesQueryKey(user?.id, filter, searchQuery),
      })
      // Also invalidate other filter views so counts stay fresh
      for (const opt of FILTER_OPTIONS) {
        if (opt.value !== filter) {
          void queryClient.invalidateQueries({
            queryKey: getAIIndexNotesQueryKey(user?.id, opt.value, searchQuery),
          })
        }
      }
    },
    [filter, queryClient, searchQuery, user?.id],
  )

  const handleLoadMore = useCallback(() => {
    if (queryResult.hasNextPage && !queryResult.isFetchingNextPage) {
      void queryResult.fetchNextPage()
    }
  }, [queryResult])

  const handleRefresh = useCallback(() => {
    void queryResult.refetch()
  }, [queryResult])

  const clearSearch = useCallback(() => {
    setSearchDraft('')
    setSearchQuery('')
  }, [])

  const renderItem = useCallback(
    ({ item }: { item: AIIndexNoteRow }) => (
      <AIIndexNoteCard note={item} onMutated={handleMutated} />
    ),
    [handleMutated],
  )

  const keyExtractor = useCallback((item: AIIndexNoteRow) => item.id, [])

  const summaryText = useMemo(() => {
    if (notes.length === 0) return null
    if (notes.length < totalCount) return `Showing ${notes.length} of ${totalCount} notes`
    return `${totalCount} note${totalCount === 1 ? '' : 's'}`
  }, [notes.length, totalCount])

  return (
    <View style={styles.root}>
      {/* Filter chips */}
      <View style={styles.filterRow}>
        {FILTER_OPTIONS.map((opt) => {
          const isActive = opt.value === filter
          return (
            <Pressable
              key={opt.value}
              onPress={() => setFilter(opt.value)}
              style={[styles.chip, isActive && styles.chipActive]}
            >
              <Text style={[styles.chipLabel, isActive && styles.chipLabelActive]}>
                {opt.label}
              </Text>
            </Pressable>
          )
        })}
      </View>

      {/* Search */}
      <View style={styles.searchWrap}>
        <TextInput
          style={styles.searchInput}
          placeholder="Search notes…"
          placeholderTextColor={colors.mutedForeground}
          value={searchDraft}
          onChangeText={setSearchDraft}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType="search"
        />
        {searchDraft.length > 0 && (
          <Pressable onPress={clearSearch} style={styles.clearButton} hitSlop={8}>
            <Text style={styles.clearText}>✕</Text>
          </Pressable>
        )}
      </View>

      {/* Summary */}
      {summaryText ? <Text style={styles.summary}>{summaryText}</Text> : null}

      {/* List */}
      {queryResult.isLoading ? (
        <View style={styles.center}>
          <ActivityIndicator color={colors.foreground} />
          <Text style={styles.statusText}>Loading notes…</Text>
        </View>
      ) : queryResult.isError ? (
        <View style={styles.center}>
          <Text style={styles.errorText}>Failed to load notes.</Text>
          <Pressable onPress={handleRefresh} style={styles.retryButton}>
            <Text style={styles.retryText}>Retry</Text>
          </Pressable>
        </View>
      ) : notes.length === 0 ? (
        <View style={styles.center}>
          <Text style={styles.statusText}>{getEmptyMessage(filter, searchQuery)}</Text>
        </View>
      ) : (
        <FlatList
          data={notes}
          renderItem={renderItem}
          keyExtractor={keyExtractor}
          contentContainerStyle={styles.listContent}
          onEndReached={handleLoadMore}
          onEndReachedThreshold={0.4}
          refreshing={queryResult.isRefetching && !queryResult.isFetchingNextPage}
          onRefresh={handleRefresh}
          ListFooterComponent={
            queryResult.isFetchingNextPage ? (
              <ActivityIndicator style={styles.footer} color={colors.foreground} />
            ) : null
          }
          scrollEnabled
          nestedScrollEnabled
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
    filterRow: {
      flexDirection: 'row',
      gap: 8,
      flexWrap: 'wrap',
    },
    chip: {
      paddingHorizontal: 14,
      paddingVertical: 8,
      borderRadius: 12,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    chipActive: {
      backgroundColor: colors.selectionBackground,
      borderColor: colors.selectionBorder,
    },
    chipLabel: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.mutedForeground,
    },
    chipLabelActive: {
      color: colors.selectionForeground,
    },
    searchWrap: {
      flexDirection: 'row',
      alignItems: 'center',
      borderRadius: 14,
      borderWidth: 1,
      borderColor: colors.border,
      backgroundColor: colors.card,
      paddingHorizontal: 12,
    },
    searchInput: {
      flex: 1,
      height: 42,
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.foreground,
    },
    clearButton: {
      padding: 4,
    },
    clearText: {
      fontSize: 14,
      color: colors.mutedForeground,
    },
    summary: {
      fontSize: 12,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      paddingHorizontal: 2,
    },
    listContent: {
      gap: 10,
    },
    center: {
      alignItems: 'center',
      justifyContent: 'center',
      paddingVertical: 40,
      gap: 10,
    },
    statusText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.mutedForeground,
      textAlign: 'center',
    },
    errorText: {
      fontSize: 14,
      fontFamily: 'Inter_400Regular',
      color: colors.destructive,
      textAlign: 'center',
    },
    retryButton: {
      paddingHorizontal: 16,
      paddingVertical: 8,
      borderRadius: 10,
      backgroundColor: colors.card,
      borderWidth: 1,
      borderColor: colors.border,
    },
    retryText: {
      fontSize: 13,
      fontFamily: 'Inter_600SemiBold',
      color: colors.foreground,
    },
    footer: {
      paddingVertical: 16,
    },
  })
