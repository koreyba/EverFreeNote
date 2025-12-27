import { View, Text, StyleSheet, Pressable, ActivityIndicator } from 'react-native'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Plus } from 'lucide-react-native'
import { SwipeableNoteCard } from '@ui/mobile/components/SwipeableNoteCard'
import { Button } from '@ui/mobile/components/ui'
import { useTheme } from '@ui/mobile/providers'
import { useMemo } from 'react'
import type { Note } from '@core/types/domain'
import { useNotes, useCreateNote, useDeleteNote } from '@ui/mobile/hooks'
import { useSwipeContext } from '@ui/mobile/providers'
import { useQueryClient } from '@tanstack/react-query'


export default function NotesScreen() {
  const router = useRouter()
  const queryClient = useQueryClient()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } = useNotes()
  const { mutate: createNote } = useCreateNote()
  const { mutate: deleteNote } = useDeleteNote()
  const { closeAll } = useSwipeContext()

  const notes = data?.pages.flatMap((page) => page.notes) ?? []

  const handleCreateNote = () => {
    createNote({ title: 'Новая заметка', description: '', tags: [] }, {
      onSuccess: (newNote) => {
        queryClient.setQueryData(['note', newNote.id], newNote)
        router.push(`/note/${newNote.id}`)
      }
    })
  }

  const handleOpenNote = (note: Note) => {
    queryClient.setQueryData(['note', note.id], note)
    router.push(`/note/${note.id}`)
  }

  const handleTagPress = (tag: string) => {
    router.push({ pathname: '/(tabs)/search', params: { tag } })
  }

  const handleDeleteNote = (id: string) => {
    deleteNote(id)
  }

  const renderNote = ({ item }: { item: Note }) => (
    <SwipeableNoteCard
      note={item}
      onPress={() => handleOpenNote(item)}
      onTagPress={handleTagPress}
      onDelete={handleDeleteNote}
    />
  )

  if (isLoading && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Ошибка загрузки заметок</Text>
        <Button onPress={() => void refetch()}>
          Повторить
        </Button>
      </View>
    )
  }

  if (!isLoading && !error && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>Пока нет заметок</Text>
        <Text style={styles.emptySubtitle}>
          Создайте первую заметку, чтобы начать работу.
        </Text>
        <Button onPress={handleCreateNote}>
          Создать заметку
        </Button>
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
        refreshing={isRefetching && !isFetchingNextPage}
        onScrollBeginDrag={closeAll}
        onEndReached={() => {
          if (!hasNextPage || isFetchingNextPage) return
          void fetchNextPage()
        }}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
      <Pressable style={styles.fab} onPress={handleCreateNote}>
        <Plus size={28} color={colors.primaryForeground} />
      </Pressable>
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
  },
  list: {
    padding: 16,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    marginBottom: 16,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 8,
    textAlign: 'center',
  },
  emptySubtitle: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    marginBottom: 16,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: 20,
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  footerLoader: {
    paddingVertical: 16,
  },
})
