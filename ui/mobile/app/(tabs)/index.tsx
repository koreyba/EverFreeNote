import { View, Text, StyleSheet, FlatList, Pressable } from 'react-native'
import { useRouter } from 'expo-router'

// Mock data
type Note = {
  id: string
  title: string
  preview: string
  updated_at: string
}

const mockNotes: Note[] = [
  { id: '1', title: 'Первая заметка', preview: 'Это тестовая заметка', updated_at: new Date().toISOString() },
  { id: '2', title: 'Вторая заметка', preview: 'Еще одна заметка', updated_at: new Date().toISOString() },
]

export default function NotesScreen() {
  const router = useRouter()

  const renderNote = ({ item }: { item: Note }) => (
    <Pressable
      style={styles.noteCard}
      onPress={() => router.push(`/note/${item.id}`)}
    >
      <Text style={styles.noteTitle}>{item.title}</Text>
      <Text style={styles.notePreview} numberOfLines={2}>
        {item.preview}
      </Text>
    </Pressable>
  )

  return (
    <View style={styles.container}>
      <FlatList
        data={mockNotes}
        renderItem={renderNote}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.list}
      />
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  list: {
    padding: 16,
  },
  noteCard: {
    backgroundColor: '#fff',
    padding: 16,
    borderRadius: 8,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 8,
  },
  notePreview: {
    fontSize: 14,
    color: '#666',
  },
})
