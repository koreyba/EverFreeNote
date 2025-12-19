import { View, TextInput, StyleSheet, ActivityIndicator, Text, Pressable } from 'react-native'
import { useState } from 'react'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { useSearch } from '@ui/mobile/hooks'
import { Search, X } from 'lucide-react-native'

export default function SearchScreen() {
    const router = useRouter()
    const [query, setQuery] = useState('')
    const { data, isLoading } = useSearch(query)

    const results = data?.results ?? []

    const renderItem = ({ item }: { item: any }) => (
        <Pressable
            style={styles.card}
            onPress={() => router.push(`/note/${item.id}`)}
        >
            <Text style={styles.title} numberOfLines={1}>{item.title || 'Без названия'}</Text>
            <Text style={styles.snippet} numberOfLines={2}>{item.snippet || item.description || ''}</Text>
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
                data={results as any}
                renderItem={renderItem}
                // @ts-ignore
                estimatedItemSize={80}
                keyExtractor={(item: any) => item.id}
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
    center: {
        marginTop: 32,
        alignItems: 'center',
    },
    empty: {
        color: '#999',
        fontSize: 16,
    },
})
