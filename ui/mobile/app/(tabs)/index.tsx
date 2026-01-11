import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert } from 'react-native'
import { useRouter } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Plus } from 'lucide-react-native'
import { SwipeableNoteCard } from '@ui/mobile/components/SwipeableNoteCard'
import { Button } from '@ui/mobile/components/ui'
import { useTheme } from '@ui/mobile/providers'
import { useMemo, useCallback } from 'react'
import type { Note } from '@core/types/domain'
import { useNotes, useCreateNote, useDeleteNote, useOpenNote } from '@ui/mobile/hooks'
import { useSwipeContext } from '@ui/mobile/providers'


export default function NotesScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage, isRefetching } = useNotes()
  const { mutate: createNote } = useCreateNote()
  const { mutate: deleteNote } = useDeleteNote()
  const { closeAll } = useSwipeContext()
  const openNote = useOpenNote()

  const notes = data?.pages.flatMap((page) => page.notes) ?? []

  const handleCreateNote = useCallback(() => {
    createNote({ title: 'New note', description: '', tags: [] }, {
      onSuccess: (newNote) => {
        openNote(newNote)
      }
    })
  }, [createNote, openNote])

  const handleOpenNote = useCallback((note: Note) => {
    openNote(note)
  }, [openNote])

  const handleTagPress = useCallback((tag: string) => {
    router.push({ pathname: '/(tabs)/search', params: { tag } })
  }, [router])

  const handleDeleteNote = useCallback((id: string) => {
    deleteNote(id, {
      onError: () => {
        Alert.alert('Error', 'Failed to delete note. Please try again.')
      }
    })
  }, [deleteNote])

  const keyExtractor = useCallback((item: Note) => item.id, [])

  const handleRefresh = useCallback(() => {
    void refetch()
  }, [refetch])

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderNote = useCallback(({ item }: { item: Note }) => (
    <SwipeableNoteCard
      note={item}
      onPress={handleOpenNote}
      onTagPress={handleTagPress}
      onDelete={handleDeleteNote}
    />
  ), [handleOpenNote, handleTagPress, handleDeleteNote])

  if (isLoading && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} testID="activity-indicator" />
      </View>
    )
  }

  if (error && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading notes</Text>
        <Button onPress={() => void refetch()}>
          Try again
        </Button>
      </View>
    )
  }

  if (!isLoading && !error && notes.length === 0) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.emptyTitle}>No notes yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first note to get started.
        </Text>
        <Button onPress={handleCreateNote}>
          Create note
        </Button>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <FlashList
        testID="flash-list"
        data={notes}
        renderItem={renderNote}
        keyExtractor={keyExtractor}
        contentContainerStyle={styles.list}
        // @ts-expect-error FlashList types mismatch
        estimatedItemSize={140}
        drawDistance={500}
        onRefresh={handleRefresh}
        refreshing={isRefetching && !isFetchingNextPage}
        onScrollBeginDrag={closeAll}
        onEndReached={handleEndReached}
        onEndReachedThreshold={0.4}
        ListFooterComponent={
          isFetchingNextPage ? (
            <View style={styles.footerLoader}>
              <ActivityIndicator size="small" color={colors.primary} />
            </View>
          ) : null
        }
      />
      <Pressable
        style={styles.fab}
        onPress={handleCreateNote}
        accessibilityLabel="Create new note"
        accessibilityRole="button"
      >
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
