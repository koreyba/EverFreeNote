import { useCallback, useMemo, useState } from 'react'
import {
  ActivityIndicator,
  Alert,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native'
import { useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useCollapsibleTabBar, useTheme } from '@ui/mobile/providers'
import { Button, Input } from '@ui/mobile/components/ui'
import {
  AlphabeticalIndex,
  TagManagementCard,
  TagSearchInput,
} from '@ui/mobile/components/tags'
import {
  useDeleteTag,
  useRenameTag,
  useTagManagementData,
} from '@ui/mobile/hooks'
import {
  filterMobileTagSummaries,
  groupMobileTagSummaries,
  type MobileTagSummary,
} from '@ui/mobile/utils/tagManagement'

export default function TagsScreen() {
  const router = useRouter()
  const { colors } = useTheme()
  const insets = useSafeAreaInsets()
  const styles = useMemo(() => createStyles(colors), [colors])
  const { onScroll } = useCollapsibleTabBar()
  const {
    allTags,
    letters,
    isLoading,
    error,
    refetch,
  } = useTagManagementData()
  const renameTag = useRenameTag()
  const deleteTag = useDeleteTag()
  const [search, setSearch] = useState('')
  const [selectedLetter, setSelectedLetter] = useState<string | null>(null)
  const [actionTag, setActionTag] = useState<MobileTagSummary | null>(null)
  const [renameTarget, setRenameTarget] = useState<MobileTagSummary | null>(null)
  const [renameValue, setRenameValue] = useState('')
  const [renameError, setRenameError] = useState<string | undefined>()

  const visibleTags = useMemo(
    () => filterMobileTagSummaries(allTags, search, selectedLetter),
    [allTags, search, selectedLetter]
  )
  const visibleGroups = useMemo(
    () => groupMobileTagSummaries(visibleTags),
    [visibleTags]
  )

  const handleTagPress = useCallback((tag: string) => {
    router.push({ pathname: '/(tabs)/search', params: { tag } })
  }, [router])

  const handleOpenRename = useCallback(() => {
    if (!actionTag) return
    setRenameTarget(actionTag)
    setRenameValue(actionTag.name)
    setRenameError(undefined)
    setActionTag(null)
  }, [actionTag])

  const performRename = useCallback(() => {
    if (!renameTarget) return
    const replacement = renameValue.trim()
    if (!replacement) {
      setRenameError('Tag name cannot be empty')
      return
    }

    renameTag.mutate(
      { tag: renameTarget.name, replacement },
      {
        onSuccess: () => setRenameTarget(null),
        onError: (mutationError) => {
          Alert.alert('Rename failed', mutationError.message)
        },
      }
    )
  }, [renameTarget, renameValue, renameTag])

  const handleRenameSubmit = useCallback(() => {
    if (!renameTarget) return
    const replacement = renameValue.trim()
    if (!replacement) {
      setRenameError('Tag name cannot be empty')
      return
    }

    const mergesExistingTag = allTags.some((tag) => (
      tag.name.trim().toLocaleLowerCase() === replacement.toLocaleLowerCase()
      && tag.name.trim().toLocaleLowerCase() !== renameTarget.name.trim().toLocaleLowerCase()
    ))

    if (mergesExistingTag) {
      Alert.alert(
        'Merge tags?',
        `"${renameTarget.name}" will be merged into "${replacement}" across all affected notes.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Merge', onPress: performRename },
        ]
      )
      return
    }

    performRename()
  }, [allTags, performRename, renameTarget, renameValue])

  const handleDelete = useCallback((tag: MobileTagSummary) => {
    setActionTag(null)
    Alert.alert(
      'Delete tag?',
      `Remove "${tag.name}" from all notes?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteTag.mutate(
            { tag: tag.name },
            {
              onError: (mutationError) => Alert.alert('Delete failed', mutationError.message),
            }
          ),
        },
      ]
    )
  }, [deleteTag])

  const renderContent = () => {
    if (isLoading && allTags.length === 0) {
      return (
        <View style={styles.center} testID="tags-loading-state">
          <ActivityIndicator size="large" color={colors.primary} />
        </View>
      )
    }

    if (error && allTags.length === 0) {
      return (
        <View style={styles.center} testID="tags-error-state">
          <Text style={styles.emptyTitle}>Unable to load tags</Text>
          <Text style={styles.emptyBody}>{error.message}</Text>
          <Button onPress={() => void refetch()}>Try again</Button>
        </View>
      )
    }

    if (allTags.length === 0) {
      return (
        <View style={styles.center} testID="tags-empty-state">
          <Text style={styles.emptyTitle}>No tags yet</Text>
          <Text style={styles.emptyBody}>Add a tag to a note to see it here.</Text>
        </View>
      )
    }

    return (
      <>
        <AlphabeticalIndex
          letters={letters}
          selectedLetter={selectedLetter}
          onSelect={setSelectedLetter}
        />
        {visibleTags.length === 0 ? (
          <View style={styles.noResults} testID="tags-no-results-state">
            <Text style={styles.emptyTitle}>No tags found</Text>
            <Text style={styles.emptyBody}>
              No tags matching "{search.trim()}".
            </Text>
          </View>
        ) : (
          visibleGroups.map((group) => (
            <View key={group.letter} style={styles.group}>
              <View style={styles.groupHeader}>
                <Text style={styles.groupLetter}>{group.letter}</Text>
                <View style={styles.groupRule} />
              </View>
              <View style={styles.cards}>
                {group.tags.map((tag) => (
                  <TagManagementCard
                    key={tag.name}
                    tag={tag}
                    onPress={handleTagPress}
                    onActions={setActionTag}
                  />
                ))}
              </View>
            </View>
          ))
        )}
      </>
    )
  }

  return (
    <View style={styles.container}>
      <ScrollView
        testID="tags-scroll"
        onScroll={onScroll}
        scrollEventThrottle={16}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 96 }]}
      >
        <Text style={styles.heading}>Tag Management</Text>
        <Text style={styles.total}>Total tags: {allTags.length}</Text>
        <TagSearchInput
          value={search}
          onChangeText={setSearch}
          onClear={() => setSearch('')}
        />
        <View style={styles.list}>{renderContent()}</View>
      </ScrollView>

      <TagActionsModal
        tag={actionTag}
        onClose={() => setActionTag(null)}
        onRename={handleOpenRename}
        onDelete={() => actionTag && handleDelete(actionTag)}
      />

      <RenameTagModal
        visible={renameTarget !== null}
        value={renameValue}
        error={renameError}
        loading={renameTag.isPending}
        onChangeValue={(value) => {
          setRenameValue(value)
          if (renameError) setRenameError(undefined)
        }}
        onClose={() => setRenameTarget(null)}
        onSubmit={handleRenameSubmit}
      />
    </View>
  )
}

function TagActionsModal({
  tag,
  onClose,
  onRename,
  onDelete,
}: {
  tag: MobileTagSummary | null
  onClose: () => void
  onRename: () => void
  onDelete: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <Modal visible={tag !== null} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalCard} onStartShouldSetResponder={() => true}>
          <Text style={styles.modalTitle}>{tag?.name}</Text>
          <Button variant="outline" onPress={onRename}>Rename</Button>
          <Button variant="destructive" onPress={onDelete}>Delete</Button>
          <Button variant="ghost" onPress={onClose}>Cancel</Button>
        </View>
      </Pressable>
    </Modal>
  )
}

function RenameTagModal({
  visible,
  value,
  error,
  loading,
  onChangeValue,
  onClose,
  onSubmit,
}: {
  visible: boolean
  value: string
  error?: string
  loading: boolean
  onChangeValue: (_value: string) => void
  onClose: () => void
  onSubmit: () => void
}) {
  const { colors } = useTheme()
  const styles = createStyles(colors)

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
      <View style={styles.modalOverlay}>
        <View style={styles.modalCard}>
          <Text style={styles.modalTitle}>Rename tag</Text>
          <Input
            label="New tag name"
            value={value}
            onChangeText={onChangeValue}
            error={error}
            autoFocus
            autoCapitalize="none"
            accessibilityLabel="New tag name"
          />
          <Text style={styles.modalHint}>Tag matching is case-insensitive. Existing tags are merged.</Text>
          <Button loading={loading} onPress={onSubmit}>Save</Button>
          <Button variant="ghost" onPress={onClose} disabled={loading}>Cancel</Button>
        </View>
      </View>
    </Modal>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  content: {
    padding: 16,
  },
  heading: {
    fontSize: 28,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 4,
  },
  total: {
    fontSize: 15,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    marginBottom: 18,
  },
  list: {
    marginTop: 18,
  },
  group: {
    marginTop: 22,
  },
  groupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 10,
  },
  groupLetter: {
    minWidth: 34,
    paddingHorizontal: 10,
    paddingVertical: 7,
    borderRadius: 10,
    backgroundColor: colors.accent,
    color: colors.primary,
    fontSize: 16,
    fontFamily: 'Inter_700Bold',
    textAlign: 'center',
  },
  groupRule: {
    flex: 1,
    height: 1,
    backgroundColor: colors.border,
  },
  cards: {
    gap: 10,
  },
  center: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 72,
    gap: 12,
  },
  noResults: {
    alignItems: 'center',
    paddingVertical: 48,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 18,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    textAlign: 'center',
  },
  emptyBody: {
    maxWidth: 300,
    fontSize: 14,
    lineHeight: 20,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.45)',
  },
  modalCard: {
    gap: 12,
    padding: 20,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    backgroundColor: colors.background,
  },
  modalTitle: {
    fontSize: 20,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    marginBottom: 4,
  },
  modalHint: {
    fontSize: 13,
    lineHeight: 18,
    fontFamily: 'Inter_400Regular',
    color: colors.mutedForeground,
  },
})
