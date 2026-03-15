import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Alert, Pressable, View, TextInput, StyleSheet, ActivityIndicator, Text, Platform, Keyboard } from 'react-native'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNote, useUpdateNote, useDeleteNote } from '@ui/mobile/hooks'
import EditorWebView, { type EditorWebViewHandle } from '@ui/mobile/components/EditorWebView'
import { EditorToolbar, TOOLBAR_CONTENT_HEIGHT } from '@ui/mobile/components/EditorToolbar'
import { useTheme } from '@ui/mobile/providers'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'
import { TagInput } from '@ui/mobile/components/tags/TagInput'
import { Trash2, ChevronLeft, Undo2, Redo2, MoreVertical } from 'lucide-react-native'
import { createDebouncedLatest } from '@core/utils/debouncedLatest'
import { NoteBodyPreview } from '@ui/mobile/components/NoteBodyPreview'
import { NoteIndexMenu } from '@ui/mobile/components/NoteIndexMenu'

const CONTENT_HORIZONTAL_PADDING = 16
const HEADER_BUTTON_PADDING = 8

type NoteEditorHeaderStyles = ReturnType<typeof createStyles>
type ThemeColors = ReturnType<typeof useTheme>['colors']

type HeaderLeftActionsProps = Readonly<{
  styles: NoteEditorHeaderStyles
  colors: ThemeColors
  canUndo: boolean
  canRedo: boolean
  onBack: () => void
  onUndo: () => void
  onRedo: () => void
}>

function HeaderLeftActions({
  styles,
  colors,
  canUndo,
  canRedo,
  onBack,
  onUndo,
  onRedo,
}: HeaderLeftActionsProps) {
  return (
    <View style={styles.headerLeftActions}>
      <Pressable
        onPress={onBack}
        accessibilityLabel="Go back"
        accessibilityRole="button"
        style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.5 }]}
      >
        <ChevronLeft color={colors.foreground} size={24} />
      </Pressable>
      <Pressable
        onPress={onUndo}
        disabled={!canUndo}
        accessibilityLabel="Undo"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canUndo }}
        style={({ pressed }) => [
          styles.headerButton,
          !canUndo && styles.headerButtonDisabled,
          pressed && canUndo && { opacity: 0.5 },
        ]}
      >
        <Undo2 color={canUndo ? colors.foreground : colors.mutedForeground} size={20} />
      </Pressable>
      <Pressable
        onPress={onRedo}
        disabled={!canRedo}
        accessibilityLabel="Redo"
        accessibilityRole="button"
        accessibilityState={{ disabled: !canRedo }}
        style={({ pressed }) => [
          styles.headerButton,
          !canRedo && styles.headerButtonDisabled,
          pressed && canRedo && { opacity: 0.5 },
        ]}
      >
        <Redo2 color={canRedo ? colors.foreground : colors.mutedForeground} size={20} />
      </Pressable>
    </View>
  )
}

type HeaderDeleteButtonProps = Readonly<{
  styles: NoteEditorHeaderStyles
  colors: ThemeColors
  isDeleting: boolean
  onDelete: () => void
}>

function HeaderDeleteButton({
  styles,
  colors,
  isDeleting,
  onDelete,
}: HeaderDeleteButtonProps) {
  return (
    <Pressable
      onPress={onDelete}
      disabled={isDeleting}
      accessibilityLabel="Delete note"
      accessibilityRole="button"
      accessibilityState={{ disabled: isDeleting }}
      style={({ pressed }) => [
        styles.headerButton,
        styles.headerTitleButton,
        (pressed || isDeleting) && { opacity: 0.5 },
      ]}
    >
      {isDeleting ? (
        <ActivityIndicator size="small" color={colors.destructive} testID="activity-indicator" />
      ) : (
        <Trash2 color={colors.destructive} size={20} />
      )}
    </Pressable>
  )
}

type HeaderRightActionsProps = Readonly<{
  styles: NoteEditorHeaderStyles
  colors: ThemeColors
  onOpenMenu: () => void
}>

function HeaderRightActions({
  styles,
  colors,
  onOpenMenu,
}: HeaderRightActionsProps) {
  return (
    <View style={styles.headerActions}>
      <View style={styles.headerRightGroup}>
        <ThemeToggle style={styles.headerToggle} />
        <Pressable
          onPress={onOpenMenu}
          accessibilityLabel="More options"
          accessibilityRole="button"
          style={({ pressed }) => [styles.headerButton, pressed && { opacity: 0.5 }]}
        >
          <MoreVertical color={colors.foreground} size={20} />
        </Pressable>
      </View>
    </View>
  )
}

export default function NoteEditorScreen() {
  const {
    id,
    focusOffset,
    focusLength,
    focusRequestId,
  } = useLocalSearchParams<{
    id: string
    focusOffset?: string
    focusLength?: string
    focusRequestId?: string
  }>()
  const { data: noteState, isLoading, error } = useNote(id)
  const { mutate: updateNote } = useUpdateNote()
  const { mutate: deleteNote, isPending: isDeleting } = useDeleteNote()
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()
  const note = noteState?.note ?? null

  const editorRef = useRef<EditorWebViewHandle>(null)
  const deletedMessageShownRef = useRef(false)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [isToolbarMenuOpen, setIsToolbarMenuOpen] = useState(false)
  const [isNoteMenuVisible, setIsNoteMenuVisible] = useState(false)
  const [hasSelection, setHasSelection] = useState(false)
  const [historyState, setHistoryState] = useState({ canUndo: false, canRedo: false })
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const [isEditorReady, setIsEditorReady] = useState(false)
  const lastHydratedNoteIdRef = useRef<string | null>(null)
  const lastAppliedChunkFocusRequestIdRef = useRef<string | null>(null)
  const latestDraftRef = useRef<{ title: string; description: string; tags: string[] }>({
    title: '',
    description: '',
    tags: [],
  })

  const lastSavedRef = useRef<{ title: string; description: string; tags: string[] }>({
    title: '',
    description: '',
    tags: [],
  })

  const areStringArraysEqual = (a: string[], b: string[]) => {
    if (a === b) return true
    if (a.length !== b.length) return false
    for (let i = 0; i < a.length; i += 1) {
      if (a[i] !== b[i]) return false
    }
    return true
  }

  const buildPatch = useCallback((next: { title: string; description: string; tags: string[] }) => {
    const patch: { title?: string; description?: string; tags?: string[] } = {}
    if (next.title !== lastSavedRef.current.title) patch.title = next.title
    if (next.description !== lastSavedRef.current.description) patch.description = next.description
    if (!areStringArraysEqual(next.tags, lastSavedRef.current.tags)) patch.tags = next.tags
    return patch
  }, [])

  const saverRef = useRef<ReturnType<typeof createDebouncedLatest<{ title: string; description: string; tags: string[] }>> | null>(null)
  saverRef.current ??= createDebouncedLatest({
    delayMs: 1000,
    isEqual: (a, b) => a.title === b.title && a.description === b.description && areStringArraysEqual(a.tags, b.tags),
    onFlush: (next) => {
      const patch = buildPatch(next)
      if (Object.keys(patch).length === 0) return
      updateNote({ id, updates: patch })
      lastSavedRef.current = next
    },
  })

  const flushPendingUpdates = useCallback(() => saverRef.current?.flush(), [])

  useEffect(() => {
    return () => {
      void flushPendingUpdates()
    }
  }, [flushPendingUpdates])

  useEffect(() => {
    const showSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => setKeyboardHeight(e.endCoordinates.height)
    )
    const hideSub = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => setKeyboardHeight(0)
    )
    return () => {
      showSub.remove()
      hideSub.remove()
    }
  }, [])

  useEffect(() => {
    if (note) {
      const hasNoteSwitched = lastHydratedNoteIdRef.current !== note.id
      if (hasNoteSwitched) {
        setHistoryState({ canUndo: false, canRedo: false })
        setIsEditorReady(false)
        lastHydratedNoteIdRef.current = note.id
      }
      setTitle(note.title || '')
      setTags(note.tags ?? [])
      lastSavedRef.current = {
        title: note.title ?? '',
        description: note.description ?? '',
        tags: note.tags ?? [],
      }
      latestDraftRef.current = lastSavedRef.current
      saverRef.current?.reset(lastSavedRef.current)
    }
  }, [note])

  useEffect(() => {
    if (noteState?.status !== 'deleted') return
    if (deletedMessageShownRef.current) return
    deletedMessageShownRef.current = true

    Alert.alert(
      'Note deleted',
      'This note was deleted on another device.',
      [
        {
          text: 'OK',
          onPress: () => {
            router.back()
          },
        },
      ]
    )
  }, [noteState?.status, router])

  const pendingChunkFocus = useMemo(() => {
    if (!note?.id) return null
    const rawOffset = typeof focusOffset === 'string' ? Number.parseInt(focusOffset, 10) : Number.NaN
    const rawLength = typeof focusLength === 'string' ? Number.parseInt(focusLength, 10) : Number.NaN

    if (!Number.isFinite(rawOffset) || !Number.isFinite(rawLength) || rawLength <= 0) {
      return null
    }

    const titlePrefix = (note.title ?? '').trim()
    const bodyOffset = titlePrefix ? Math.max(0, rawOffset - (titlePrefix.length + 1)) : rawOffset

    return {
      requestId:
        typeof focusRequestId === 'string' && focusRequestId.length > 0
          ? focusRequestId
          : `${note.id}:${bodyOffset}:${rawLength}`,
      charOffset: bodyOffset,
      chunkLength: rawLength,
    }
  }, [focusLength, focusOffset, focusRequestId, note?.id, note?.title])

  const applyPendingChunkFocus = useCallback(() => {
    if (!pendingChunkFocus) return
    if (lastAppliedChunkFocusRequestIdRef.current === pendingChunkFocus.requestId) return
    if (!isEditorReady) return

    const editor = editorRef.current
    if (!editor) return

    editor.scrollToChunk(pendingChunkFocus.charOffset, pendingChunkFocus.chunkLength)
    lastAppliedChunkFocusRequestIdRef.current = pendingChunkFocus.requestId
  }, [isEditorReady, pendingChunkFocus])

  useEffect(() => {
    applyPendingChunkFocus()
  }, [applyPendingChunkFocus])

  const scheduleSave = useCallback(() => {
    saverRef.current?.schedule({ ...latestDraftRef.current })
  }, [])

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    latestDraftRef.current = { ...latestDraftRef.current, title: newTitle }
    scheduleSave()
  }

  const handleContentChange = (html: string) => {
    latestDraftRef.current = { ...latestDraftRef.current, description: html }
    scheduleSave()
  }

  const handleTagsChange = (nextTags: string[]) => {
    setTags(nextTags)
    latestDraftRef.current = { ...latestDraftRef.current, tags: nextTags }
    scheduleSave()
  }

  const handleTagPress = (tag: string) => {
    router.push({ pathname: '/(tabs)/search', params: { tag } })
  }

  const handleEditorBlur = useCallback(() => {
    setIsEditorFocused(false)
    setHasSelection(false)
    // Flush any pending save immediately when editor loses focus
    void flushPendingUpdates()
  }, [flushPendingUpdates])

  const handleToolbarCommand = useCallback((method: string, args?: unknown[]) => {
    editorRef.current?.runCommand(method, args)
  }, [])

  const handleGoBack = useCallback(() => {
    router.back()
  }, [router])

  const handleUndo = useCallback(() => {
    editorRef.current?.runCommand('undo')
  }, [])

  const handleRedo = useCallback(() => {
    editorRef.current?.runCommand('redo')
  }, [])

  const handleOpenNoteMenu = useCallback(() => {
    setIsNoteMenuVisible(true)
  }, [])

  const handleDelete = useCallback(() => {
    deleteNote(id, {
      onSuccess: () => {
        router.back()
      },
    })
  }, [deleteNote, id, router])

  const renderHeaderLeft = useCallback(
    () => (
      <HeaderLeftActions
        styles={styles}
        colors={colors}
        canUndo={historyState.canUndo}
        canRedo={historyState.canRedo}
        onBack={handleGoBack}
        onUndo={handleUndo}
        onRedo={handleRedo}
      />
    ),
    [colors, handleGoBack, handleRedo, handleUndo, historyState.canRedo, historyState.canUndo, styles]
  )

  const renderHeaderTitle = useCallback(
    () => (
      <HeaderDeleteButton
        styles={styles}
        colors={colors}
        isDeleting={isDeleting}
        onDelete={handleDelete}
      />
    ),
    [colors, handleDelete, isDeleting, styles]
  )

  const renderHeaderRight = useCallback(
    () => (
      <HeaderRightActions
        styles={styles}
        colors={colors}
        onOpenMenu={handleOpenNoteMenu}
      />
    ),
    [colors, handleOpenNoteMenu, styles]
  )

  const isToolbarVisible = isEditorFocused || isToolbarMenuOpen

  const editorPaddingBottom = isToolbarVisible
    ? keyboardHeight + TOOLBAR_CONTENT_HEIGHT + insets.bottom
    : Math.max(insets.bottom, 0)

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} testID="activity-indicator" />
      </View>
    )
  }

  if (noteState?.status === 'deleted') {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} testID="activity-indicator" />
      </View>
    )
  }

  if (error || !note) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Error loading note</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: '',
          headerBackVisible: false,
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerTitleAlign: 'center',
          headerLeft: renderHeaderLeft,
          headerTitle: renderHeaderTitle,
          headerRight: renderHeaderRight,
        }}
      />
      <View style={styles.header}>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Note title"
          placeholderTextColor={colors.mutedForeground}
          multiline
          scrollEnabled={false}
        />
        <TagInput
          tags={tags}
          onChangeTags={handleTagsChange}
          onTagPress={handleTagPress}
          label=""
          style={styles.tags}
        />
      </View>
      <View style={[styles.editorContainer, { paddingBottom: editorPaddingBottom }]}>
        <EditorWebView
          ref={editorRef}
          onReady={() => setIsEditorReady(true)}
          initialContent={note.description || ''}
          onContentChange={handleContentChange}
          onFocus={() => setIsEditorFocused(true)}
          onBlur={handleEditorBlur}
          onSelectionChange={setHasSelection}
          onHistoryStateChange={setHistoryState}
          loadingFallback={<NoteBodyPreview html={note.description || ''} colors={colors} />}
        />
      </View>
      {isToolbarVisible && (
        <View style={[styles.toolbarContainer, { bottom: keyboardHeight }]}>
          <EditorToolbar
            onCommand={handleToolbarCommand}
            hasSelection={hasSelection}
            onMenuVisibilityChange={setIsToolbarMenuOpen}
          />
        </View>
      )}
      <NoteIndexMenu
        noteId={id}
        visible={isNoteMenuVisible}
        onClose={() => setIsNoteMenuVisible(false)}
      />
    </View>
  )
}

const createStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  editorContainer: {
    flex: 1,
  },
  header: {
    padding: CONTENT_HORIZONTAL_PADDING,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  titleInput: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.foreground,
    padding: 0,
  },
  tags: {
    marginTop: 12,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.background,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.destructive,
  },
  headerToggle: {
    marginRight: 8,
  },
  headerTitleButton: {
    minWidth: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  headerRightGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: -HEADER_BUTTON_PADDING,
  },
  headerLeftActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 4,
  },
  headerButton: {
    padding: HEADER_BUTTON_PADDING,
  },
  headerButtonDisabled: {
    opacity: 0.35,
  },
  toolbarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
})
