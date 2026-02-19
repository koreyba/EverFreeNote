import { View, Text, StyleSheet, Pressable, ActivityIndicator, Alert, BackHandler, ScrollView, RefreshControl } from 'react-native'
import { useRouter, useNavigation } from 'expo-router'
import { FlashList } from '@shopify/flash-list'
import { Plus } from 'lucide-react-native'
import * as Haptics from 'expo-haptics'
import { SwipeableNoteCard } from '@ui/mobile/components/SwipeableNoteCard'
import { BulkActionBar } from '@ui/mobile/components/BulkActionBar'
import { Button } from '@ui/mobile/components/ui'
import { useTheme } from '@ui/mobile/providers'
import { useMemo, useCallback, useEffect, useState } from 'react'
import type { Note } from '@core/types/domain'
import { useNotes, useCreateNote, useDeleteNote, useOpenNote, useBulkSelection, useBulkDeleteNotes } from '@ui/mobile/hooks'
import { useSwipeContext } from '@ui/mobile/providers'


export default function NotesScreen() {
  const router = useRouter()
  const navigation = useNavigation()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { data, isLoading, error, refetch, fetchNextPage, hasNextPage, isFetchingNextPage } = useNotes()
  const { mutate: createNote } = useCreateNote()
  const { mutate: deleteNote } = useDeleteNote()
  const { closeAll } = useSwipeContext()
  const openNote = useOpenNote()

  const { isActive, selectedIds, activate, toggle, selectAll, clear, deactivate } = useBulkSelection()
  const { bulkDelete, isPending: isBulkDeleting } = useBulkDeleteNotes()
  const [isManualRefreshing, setIsManualRefreshing] = useState(false)

  const notes = data?.pages.flatMap((page) => page.notes) ?? []

  // extraData is required for FlashList to re-render items when selection changes
  const selectionExtraData = useMemo(() => ({ isActive, selectedIds }), [isActive, selectedIds])

  // Pad list bottom so BulkActionBar doesn't obscure the last item
  const listContentStyle = useMemo(
    () => ({ padding: 16, paddingBottom: isActive ? 80 : 16 }),
    [isActive]
  )

  // Transform header when selection mode is active
  useEffect(() => {
    navigation.setOptions({
      title: isActive ? `${selectedIds.size} selected` : 'Notes',
      headerLeft: isActive
        ? () => (
            <Pressable
              onPress={deactivate}
              style={styles.headerCancel}
              accessibilityRole="button"
              accessibilityLabel="Cancel selection"
            >
              <Text style={styles.headerCancelText}>Cancel</Text>
            </Pressable>
          )
        : undefined,
    })
  }, [isActive, selectedIds.size, navigation, deactivate, styles, colors])

  // Intercept Android back button to exit selection mode
  useEffect(() => {
    if (!isActive) return
    const sub = BackHandler.addEventListener('hardwareBackPress', () => {
      deactivate()
      return true
    })
    return () => sub.remove()
  }, [isActive, deactivate])

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
            setIsManualRefreshing(true)
            void refetch().finally(() => setIsManualRefreshing(false))
          },
        },
      ]
    )
  }, [selectedIds, bulkDelete, deactivate, refetch])

  const keyExtractor = useCallback((item: Note) => item.id, [])

  const handleRefresh = useCallback(() => {
    setIsManualRefreshing(true)
    void refetch().finally(() => setIsManualRefreshing(false))
  }, [refetch])

  const handleEndReached = useCallback(() => {
    if (!hasNextPage || isFetchingNextPage) return
    void fetchNextPage()
  }, [hasNextPage, isFetchingNextPage, fetchNextPage])

  const renderNote = useCallback(({ item }: { item: Note }) => (
    <SwipeableNoteCard
      note={item}
      onPress={isActive ? (note: Note) => toggle(note.id) : handleOpenNote}
      onLongPress={isActive ? undefined : () => {
        void Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium)
        activate(item.id)
      }}
      onTagPress={isActive ? undefined : handleTagPress}
      onDelete={handleDeleteNote}
      isSelectionMode={isActive}
      isSelected={selectedIds.has(item.id)}
    />
  ), [isActive, selectedIds, activate, toggle, handleOpenNote, handleTagPress, handleDeleteNote])

  if ((isLoading || isManualRefreshing) && notes.length === 0) {
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

  if (!isLoading && !isManualRefreshing && !error && notes.length === 0) {
    return (
      <ScrollView
        contentContainerStyle={styles.centerContainer}
        refreshControl={
          <RefreshControl
            refreshing={isManualRefreshing}
            onRefresh={handleRefresh}
            colors={[colors.primary]}
            tintColor={colors.primary}
          />
        }
      >
        <Text style={styles.emptyTitle}>No notes yet</Text>
        <Text style={styles.emptySubtitle}>
          Create your first note to get started.
        </Text>
        <Button onPress={handleCreateNote}>
          Create note
        </Button>
      </ScrollView>
    )
  }

  return (
    <View style={styles.container}>
      <FlashList
        testID="flash-list"
        data={notes}
        renderItem={renderNote}
        keyExtractor={keyExtractor}
        contentContainerStyle={listContentStyle}
        // @ts-expect-error FlashList types mismatch
        estimatedItemSize={140}
        drawDistance={500}
        onRefresh={handleRefresh}
        refreshing={isManualRefreshing}
        onScrollBeginDrag={closeAll}
        onEndReached={handleEndReached}
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
      {!isActive && (
        <Pressable
          style={styles.fab}
          onPress={handleCreateNote}
          accessibilityLabel="Create new note"
          accessibilityRole="button"
        >
          <Plus size={28} color={colors.primaryForeground} />
        </Pressable>
      )}
      {isActive && (
        <BulkActionBar
          selectedCount={selectedIds.size}
          totalCount={notes.length}
          onSelectAll={() => selectAll(notes.map(n => n.id))}
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
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: colors.background,
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
