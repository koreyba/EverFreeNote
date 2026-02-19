import { View, TextInput, StyleSheet, ActivityIndicator, Text, Pressable, Alert, BackHandler } from 'react-native'
import { useEffect, useMemo, useState, useCallback } from 'react'
import { useLocalSearchParams, useRouter, useNavigation } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { useSearch, useDeleteNote, useOpenNote, useBulkSelection, useBulkDeleteNotes } from '@ui/mobile/hooks'
import { Search, X } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import type { Note } from '@core/types/domain'
import { useSupabase, useTheme, useSwipeContext } from '@ui/mobile/providers'
import { addSearchHistoryItem, clearSearchHistory, getSearchHistory } from '@ui/mobile/services/searchHistory'
import { TagFilterBar } from '@ui/mobile/components/tags'
import { SwipeableNoteCard } from '@ui/mobile/components/SwipeableNoteCard'
import { BulkActionBar } from '@ui/mobile/components/BulkActionBar'
import { SEARCH_CONFIG } from '@core/constants/search'
import { shouldUpdateTagFilter } from '@core/utils/search'

type SearchResultItem = Note & {
    snippet?: string | null
    headline?: string | null
}

export default function SearchScreen() {
    const router = useRouter()
    const navigation = useNavigation()
    const { colors } = useTheme()
    const styles = useMemo(() => createStyles(colors), [colors])
    const params = useLocalSearchParams<{ tag?: string }>()
    const [query, setQuery] = useState('')
    const [activeTag, setActiveTag] = useState<string | null>(null)
    const {
        data,
        isLoading,
        fetchNextPage,
        hasNextPage,
        isFetchingNextPage,
    } = useSearch(query, { tag: activeTag })
    const { user } = useSupabase()
    const { mutate: deleteNote } = useDeleteNote()
    const { closeAll } = useSwipeContext()
    const [history, setHistory] = useState<string[]>([])

    const { isActive, selectedIds, activate, toggle, selectAll, clear, deactivate } = useBulkSelection()
    const { bulkDelete, isPending: isBulkDeleting } = useBulkDeleteNotes()

    const results = data?.pages.flatMap((page) => page.results) ?? []

    // extraData is required for FlashList to re-render items when selection changes
    const selectionExtraData = useMemo(() => ({ isActive, selectedIds }), [isActive, selectedIds])

    // Pad list bottom so BulkActionBar doesn't obscure the last item
    const listContentStyle = useMemo(
        () => ({ padding: 16, paddingBottom: isActive ? 80 : 16 }),
        [isActive]
    )

    useEffect(() => {
        if (!user?.id) return
        void getSearchHistory(user.id).then(setHistory)
    }, [user?.id])

    useEffect(() => {
        if (typeof params.tag === 'string' && params.tag.trim().length > 0) {
            setActiveTag(params.tag)
        } else {
            setActiveTag(null)
        }
    }, [params.tag])

    useEffect(() => {
        if (!user?.id) return
        const trimmed = query.trim()
        if (trimmed.length < SEARCH_CONFIG.MIN_QUERY_LENGTH) return

        const timeout = setTimeout(() => {
            void addSearchHistoryItem(user.id, trimmed).then(setHistory)
        }, 500)

        return () => clearTimeout(timeout)
    }, [query, user?.id])

    // Reset selection mode when search query changes.
    // Intentionally excludes `isActive` and `deactivate` from deps — we only want to
    // trigger on new search input, not on every re-render where isActive/deactivate change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    useEffect(() => { if (isActive) deactivate() }, [query])

    // Transform header when selection mode is active
    useEffect(() => {
        if (isActive) {
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
            return
        }

        navigation.setOptions({
            title: undefined,
            headerLeft: undefined,
        })
    }, [isActive, selectedIds.size, navigation, deactivate, styles])

    // Intercept Android back button to exit selection mode
    useEffect(() => {
        if (!isActive) return
        const sub = BackHandler.addEventListener('hardwareBackPress', () => {
            deactivate()
            return true
        })
        return () => sub.remove()
    }, [isActive, deactivate])

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
            }
        })
    }, [deleteNote])

    const openNote = useOpenNote()

    const handleNotePress = useCallback((note: Note) => {
        openNote(note)
    }, [openNote])

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
                    onPress: async () => {
                        await bulkDelete([...selectedIds])
                        deactivate()
                    },
                },
            ]
        )
    }, [selectedIds, bulkDelete, deactivate])

    const renderItem = useCallback(({ item }: { item: SearchResultItem }) => (
        <SwipeableNoteCard
            note={item}
            onPress={isActive ? (note: Note) => toggle(note.id) : handleNotePress}
            onLongPress={isActive ? undefined : () => {
                void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
                activate(item.id)
            }}
            onTagPress={isActive ? undefined : handleTagPress}
            onDelete={handleDeleteNote}
            isSelectionMode={isActive}
            isSelected={selectedIds.has(item.id)}
        />
    ), [isActive, selectedIds, activate, toggle, handleNotePress, handleTagPress, handleDeleteNote])

    return (
        <View style={styles.container}>
            <TagFilterBar tag={activeTag} onClear={handleClearTagFilter} style={styles.tagFilter} />
            <View style={[styles.searchBar, activeTag && styles.searchBarWithTag]}>
                <Search size={20} color={colors.mutedForeground} style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder={activeTag ? `Search in "${activeTag}" notes...` : 'Search notes...'}
                    placeholderTextColor={colors.mutedForeground}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                />
                {query.length > 0 && (
                    <Pressable onPress={() => setQuery('')}>
                        <X size={20} color={colors.mutedForeground} />
                    </Pressable>
                )}
            </View>

            {query.trim().length === 0 && history.length > 0 && !activeTag && (
                <View style={styles.historyContainer}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>Search History</Text>
                        <Pressable
                            onPress={() => {
                                if (!user?.id) return
                                void clearSearchHistory(user.id).then(() => setHistory([]))
                            }}
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
                        >
                            <Text style={styles.historyText} numberOfLines={1}>
                                {item}
                            </Text>
                        </Pressable>
                    ))}
                </View>
            )}

            {isLoading && results.length === 0 && (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.primary} />
                </View>
            )}

            {!isLoading && (query.length >= 2 || !!activeTag) && results.length === 0 && (
                <View style={styles.center}>
                    <Text style={styles.empty}>Nothing found</Text>
                </View>
            )}

            <FlashList
                data={results as SearchResultItem[]}
                renderItem={renderItem}
                // @ts-expect-error FlashList types mismatch in some versions
                estimatedItemSize={96}
                keyExtractor={(item: SearchResultItem) => item.id}
                contentContainerStyle={listContentStyle}
                onScrollBeginDrag={closeAll}
                onEndReached={() => {
                    if (!hasNextPage || isFetchingNextPage) return
                    void fetchNextPage()
                }}
                onEndReachedThreshold={0.4}
                extraData={selectionExtraData}
                ListFooterComponent={
                    isFetchingNextPage ? (
                        <View style={styles.footerLoader}>
                            <ActivityIndicator size="small" color={colors.primary} />
                        </View>
                    ) : null
                }
            />
            {isActive && (
                <BulkActionBar
                    selectedCount={selectedIds.size}
                    totalCount={results.length}
                    onSelectAll={() => selectAll(results.map(n => n.id))}
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
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.muted,
        marginHorizontal: 16,
        marginBottom: 16,
        marginTop: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 48,
    },
    searchBarWithTag: {
        marginTop: 8,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: colors.foreground,
    },
    footerLoader: {
        paddingVertical: 16,
        alignItems: 'center',
    },
    center: {
        marginTop: 32,
        alignItems: 'center',
    },
    empty: {
        color: colors.mutedForeground,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
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
