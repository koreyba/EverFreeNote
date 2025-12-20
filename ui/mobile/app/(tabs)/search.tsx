import { View, TextInput, StyleSheet, ActivityIndicator, Text, Pressable } from 'react-native'
import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { useSearch } from '@ui/mobile/hooks'
import { Search, X } from 'lucide-react-native'
import type { Note } from '@core/types/domain'
import { useSupabase } from '@ui/mobile/providers'
import { addSearchHistoryItem, clearSearchHistory, getSearchHistory } from '@ui/mobile/services/searchHistory'

type SearchResultItem = Note & {
    snippet?: string | null
    headline?: string | null
}

const stripHtml = (value: string) => value.replace(/<[^>]*>/g, '')

export default function SearchScreen() {
    const router = useRouter()
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
            style={styles.card}
            onPress={() => router.push(`/note/${item.id}`)}
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
                <Search size={20} color="#999" style={styles.searchIcon} />
                <TextInput
                    style={styles.input}
                    placeholder="Поиск заметок..."
                    value={query}
                    onChangeText={setQuery}
                    autoFocus
                />
                {query.length > 0 && (
                    <Pressable onPress={() => setQuery('')}>
                        <X size={20} color="#999" />
                    </Pressable>
                )}
            </View>

            {query.trim().length === 0 && history.length > 0 && (
                <View style={styles.historyContainer}>
                    <View style={styles.historyHeader}>
                        <Text style={styles.historyTitle}>??????? ???????</Text>
                        <Pressable
                            onPress={() => {
                                if (!user?.id) return
                                void clearSearchHistory(user.id).then(() => setHistory([]))
                            }}
                        >
                            <Text style={styles.historyClear}>???????</Text>
                        </Pressable>
                    </View>
                    {history.map((item) => (
                        <Pressable
                            key={item}
                            style={styles.historyItem}
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
                    <ActivityIndicator color="#4285F4" />
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
        backgroundColor: '#fff',
    },
    searchBar: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: '#f5f5f5',
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
        color: '#333',
    },
    list: {
        padding: 16,
    },
    card: {
        paddingVertical: 12,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    title: {
        fontSize: 16,
        fontWeight: '600',
        color: '#333',
        marginBottom: 4,
    },
    snippet: {
        fontSize: 14,
        color: '#666',
    },
    snippetHighlight: {
        color: '#111',
        backgroundColor: '#ffeb3b',
    },
    center: {
        marginTop: 32,
        alignItems: 'center',
    },
    empty: {
        color: '#999',
        fontSize: 16,
    },
    historyContainer: {
        marginHorizontal: 16,
        marginBottom: 8,
        backgroundColor: '#fff',
        borderRadius: 8,
        borderWidth: 1,
        borderColor: '#eee',
        overflow: 'hidden',
    },
    historyHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#eee',
    },
    historyTitle: {
        fontSize: 14,
        fontWeight: '700',
        color: '#333',
    },
    historyClear: {
        fontSize: 13,
        fontWeight: '600',
        color: '#4285F4',
    },
    historyItem: {
        paddingHorizontal: 12,
        paddingVertical: 10,
        borderBottomWidth: 1,
        borderBottomColor: '#f3f3f3',
    },
    historyText: {
        color: '#333',
        fontSize: 14,
    },
})
