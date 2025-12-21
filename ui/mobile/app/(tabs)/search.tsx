import { View, TextInput, StyleSheet, ActivityIndicator, Text, Pressable } from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { useSearch } from '@ui/mobile/hooks'
import { useQueryClient } from '@tanstack/react-query'
import { Search, X } from 'lucide-react-native'
import type { Note } from '@core/types/domain'
import { useSupabase } from '@ui/mobile/providers'
import { addSearchHistoryItem, clearSearchHistory, getSearchHistory } from '@ui/mobile/services/searchHistory'
import { colors } from '@ui/mobile/lib/theme'

type SearchResultItem = Note & {
    snippet?: string | null
    headline?: string | null
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '')

export default function SearchScreen() {
    const router = useRouter()
    const queryClient = useQueryClient()
    const [query, setQuery] = useState('')
    const { data, isLoading } = useSearch(query)
    const { user } = useSupabase()
    const [history, setHistory] = useState<string[]>([])

    useEffect(() => {
        if (!user?.id) return
        void getSearchHistory(user.id).then(setHistory)
    }, [user?.id])

    useEffect(() => {
        if (!user?.id) return
        const trimmed = query.trim()
        if (trimmed.length < 2) return

        const timeout = setTimeout(() => {
            void addSearchHistoryItem(user.id, trimmed).then(setHistory)
        }, 500)

        return () => clearTimeout(timeout)
    }, [query, user?.id])

    const results = data?.results ?? []

    const renderSnippet = useMemo(() => {
        return (item: SearchResultItem) => {
            const raw = item.headline ?? item.snippet ?? item.description ?? ''
            if (!raw) return null

            const parts = raw.split(/(<mark>|<\/mark>)/g)
            let highlighted = false

            return (
                <Text style={styles.snippet} numberOfLines={2}>
                    {parts.map((part, index) => {
                        if (part === '<mark>') {
                            highlighted = true
                            return null
                        }
                        if (part === '</mark>') {
                            highlighted = false
                            return null
                        }

                        const clean = stripHtml(part)
                        if (!clean) return null
                        return (
                            <Text key={index} style={highlighted ? styles.snippetHighlight : undefined}>
                                {clean}
                            </Text>
                        )
                    })}
                </Text>
            )
        }
    }, [])

    const renderItem = ({ item }: { item: SearchResultItem }) => (
        <Pressable
            style={({ pressed }) => [
                styles.card,
                pressed && styles.cardPressed,
            ]}
            onPress={() => {
                queryClient.setQueryData(['note', item.id], item)
                router.push(`/note/${item.id}`)
            }}
        >
            <Text style={styles.title} numberOfLines={1}>{item.title ?? 'Без названия'}</Text>
            {renderSnippet(item) ?? (
                <Text style={styles.snippet} numberOfLines={2}>
                    {stripHtml(item.description ?? '')}
                </Text>
            )}
        </Pressable>
    )

    return (
        <View style={styles.container}>
            <View style={styles.searchBar}>
                <Search size={20} color={colors.light.mutedForeground} style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Поиск заметок..."
                    placeholderTextColor={colors.light.mutedForeground}
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                />
                {query.length > 0 && (
                    <Pressable onPress={() => setQuery('')}>
                        <X size={20} color={colors.light.mutedForeground} />
                    </Pressable>
                )}
            </View>

            {query.trim().length === 0 && history.length > 0 && (
                <View style={styles.historyContainer}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>История поиска</Text>
                        <Pressable
                            onPress={() => {
                                if (!user?.id) return
                                void clearSearchHistory(user.id).then(() => setHistory([]))
                            }}
                        >
                            <Text style={styles.historyClear}>Очистить</Text>
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

            {isLoading && (
                <View style={styles.center}>
                    <ActivityIndicator color={colors.light.primary} />
                </View>
            )}

            {!isLoading && query.length >= 2 && results.length === 0 && (
                <View style={styles.center}>
                    <Text style={styles.empty}>Ничего не найдено</Text>
                </View>
            )}

            <FlashList
                data={results as SearchResultItem[]}
                renderItem={renderItem}
                // @ts-expect-error FlashList types mismatch in some versions
                estimatedItemSize={80}
                keyExtractor={(item: SearchResultItem) => item.id}
                contentContainerStyle={styles.list}
            />
        </View>
    )
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: colors.light.background,
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: colors.light.muted,
        margin: 16,
        paddingHorizontal: 12,
        borderRadius: 8,
        height: 48,
    },
    searchIcon: {
        marginRight: 8,
    },
    input: {
        flex: 1,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
        color: colors.light.foreground,
    },
    list: {
        padding: 16,
    },
    card: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: colors.light.border,
    },
    cardPressed: {
        backgroundColor: colors.light.accent,
    },
    title: {
        fontSize: 16,
        fontFamily: 'Inter_600SemiBold',
        color: colors.light.foreground,
        marginBottom: 4,
    },
    snippet: {
        fontSize: 14,
        fontFamily: 'Inter_400Regular',
        color: colors.light.mutedForeground,
    },
    snippetHighlight: {
        color: colors.light.primary,
        backgroundColor: colors.light.secondary,
        fontFamily: 'Inter_500Medium',
    },
    center: {
        marginTop: 32,
        alignItems: 'center',
    },
    empty: {
        color: colors.light.mutedForeground,
        fontSize: 16,
        fontFamily: 'Inter_400Regular',
    },
    historyContainer: {
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: colors.light.card,
        borderRadius: 8,
        borderWidth: 1,
        borderColor: colors.light.border,
        overflow: 'hidden',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.light.border,
    },
    historyTitle: {
        fontSize: 14,
        fontFamily: 'Inter_700Bold',
        color: colors.light.foreground,
    },
    historyClear: {
        fontSize: 13,
        fontFamily: 'Inter_600SemiBold',
        color: colors.light.primary,
    },
    historyItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: colors.light.muted,
    },
    historyItemPressed: {
        backgroundColor: colors.light.accent,
    },
    historyText: {
        fontFamily: 'Inter_400Regular',
        color: colors.light.foreground,
        fontSize: 14,
    },
})
