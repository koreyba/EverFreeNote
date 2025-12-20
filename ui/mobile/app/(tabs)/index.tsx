import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { useNotes, useCreateNote } from '@ui/mobile/hooks'
import { format } from 'date-fns'
import { Plus } from 'lucide-react-native'
import type { Note } from '@core/types/domain'

export default function NotesScreen() {
  const router = useRouter()
  const { data, isLoading, error, refetch } = useNotes()
  const { mutate: createNote } = useCreateNote()

  const notes = data?.notes ?? []

  const handleCreateNote = () => {
    createNote({ title: 'Новая заметка', description: '', tags: [] }, {
      onSuccess: (newNote) => {
        router.push(`/note/${newNote.id}`)
      }
    })
  }

  const renderNote = ({ item }: { item: Note }) => (
    <Pressable
      style={styles.noteCard}
      onPress={() => router.push(`/note/${item.id}`)}
    >
      <Text style={styles.noteTitle} numberOfLines={1}>
        {item.title ?? 'Без названия'}
      </Text>
      <Text style={styles.noteDescription} numberOfLines={2}>
        {(item.description ?? '').replace(/<[^>]*>/g, '')}
      </Text>
      <Text style={styles.noteDate}>
        {format(new Date(item.updated_at), 'dd.MM.yyyy HH:mm')}
      </Text>
    </Pressable>
  )

  if (isLoading && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color="#4285F4" />
      </View>
    )
  }

  if (error && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Ошибка загрузки заметок</Text>
        <Pressable style={styles.retryButton} onPress={() => void refetch()}>
          <Text style={styles.retryButtonText}>Повторить</Text>
        </Pressable>
      </View>
    )
  }

  if (!isLoading && !error && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>????? ??? ??? ???????</Text>
        <Text style={styles.emptySubtitle}>???????? ?????? ?????? ??????? ??? ?????? ?????.</Text>
        <Pressable style={styles.primaryButton} onPress={handleCreateNote}>
          <Text style={styles.primaryButtonText}>??????? ???????</Text>
        </Pressable>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlashList
        data={notes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
        // @ts-expect-error FlashList types mismatch in some versions
        estimatedItemSize={96}
        onRefresh={() => void refetch()}
        refreshing={isLoading}
      />
      <Pressable style={styles.fab} onPress={handleCreateNote}>
        <Plus size={32} color="#fff" />
      </Pressable>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#fff',
  },
  list: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#eee',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 6,
  },
  noteDescription: {
    fontSize: 14,
    color: '#666',
    marginBottom: 8,
    lineHeight: 20,
  },
  noteDate: {
    fontSize: 12,
    color: '#999',
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 16,
  },
  retryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 16,
    textAlign: 'center',
  },
  primaryButton: {
    backgroundColor: '#4285F4',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  primaryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#4285F4',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
})
