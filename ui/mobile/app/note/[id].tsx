import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { View, TextInput, StyleSheet, ActivityIndicator, Text, Platform, Keyboard, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNote, useUpdateNote, useDeleteNote } from '@ui/mobile/hooks'
import EditorWebView, { type EditorWebViewHandle } from '@ui/mobile/components/EditorWebView'
import { EditorToolbar, TOOLBAR_CONTENT_HEIGHT } from '@ui/mobile/components/EditorToolbar'
import { useTheme } from '@ui/mobile/providers'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'
import { TagInput } from '@ui/mobile/components/tags/TagInput'
import { Trash2 } from 'lucide-react-native'
import { Pressable } from 'react-native'
import { createDebouncedLatest } from '@core/utils/debouncedLatest'

const decodeHtmlEntities = (value: string) => {
  return value
    .replace(/&#x([0-9a-fA-F]+);/g, (match, hex) => {
      const codePoint = Number.parseInt(String(hex), 16)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
    })
    .replace(/&#(\d+);/g, (match, num) => {
      const codePoint = Number.parseInt(String(num), 10)
      return Number.isFinite(codePoint) ? String.fromCodePoint(codePoint) : match
    })
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
}

const htmlToPlainText = (html: string) => {
  if (!html) return ''

  const withLineBreaks = html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p\s*>/gi, '\n\n')
    .replace(/<\/div\s*>/gi, '\n')
    .replace(/<\/li\s*>/gi, '\n')

  const withoutTags = withLineBreaks.replace(/<[^>]+>/g, '')
  const decoded = decodeHtmlEntities(withoutTags)
  return decoded.replace(/\n{3,}/g, '\n\n').trim()
}

function NoteBodyPreview({ html, colors }: { html: string; colors: ReturnType<typeof useTheme>['colors'] }) {
  const styles = useMemo(() => createPreviewStyles(colors), [colors])
  const text = useMemo(() => htmlToPlainText(html), [html])

  // Render an empty container for blank notes, without "Empty note" placeholder text.
  if (!text) {
    return <View style={styles.container} />
  }

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      <Text style={styles.text}>{text}</Text>
    </ScrollView>
  )
}

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: note, isLoading, error } = useNote(id)
  const { mutate: updateNote } = useUpdateNote()
  const { mutate: deleteNote, isPending: isDeleting } = useDeleteNote()
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])
  const insets = useSafeAreaInsets()

  const editorRef = useRef<EditorWebViewHandle>(null)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
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
    // Flush any pending save immediately when editor loses focus
    void flushPendingUpdates()
  }, [flushPendingUpdates])

  const handleToolbarCommand = useCallback((method: string, args?: unknown[]) => {
    editorRef.current?.runCommand(method, args)
  }, [])

  const handleDelete = useCallback(() => {
    deleteNote(id, {
      onSuccess: () => {
        router.back()
      },
    })
  }, [deleteNote, id, router])

  const editorPaddingBottom = isEditorFocused
    ? keyboardHeight + TOOLBAR_CONTENT_HEIGHT + insets.bottom
    : Math.max(insets.bottom, 0)

  if (isLoading) {
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
          title: 'Edit',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerRight: () => (
            <View style={styles.headerActions}>
              <Pressable
                onPress={handleDelete}
                disabled={isDeleting}
                accessibilityLabel="Delete note"
                accessibilityRole="button"
                style={({ pressed }) => [
                  styles.headerButton,
                  (pressed || isDeleting) && { opacity: 0.5 }
                ]}
              >
                {isDeleting ? (
                  <ActivityIndicator size="small" color={colors.destructive} testID="activity-indicator" />
                ) : (
                  <Trash2 color={colors.destructive} size={20} />
                )}
              </Pressable>
              <ThemeToggle style={styles.headerToggle} />
            </View>
          ),
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
          initialContent={note.description || ''}
          onContentChange={handleContentChange}
          onFocus={() => setIsEditorFocused(true)}
          onBlur={handleEditorBlur}
          loadingFallback={<NoteBodyPreview html={note.description || ''} colors={colors} />}
        />
      </View>
      {isEditorFocused && (
        <View style={[styles.toolbarContainer, { bottom: keyboardHeight }]}>
          <EditorToolbar onCommand={handleToolbarCommand} />
        </View>
      )}
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
    padding: 16,
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
    marginLeft: 12,
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
  },
  headerButton: {
    padding: 8,
  },
  toolbarContainer: {
    position: 'absolute',
    left: 0,
    right: 0,
  },
})

// Preview styles are aligned with the WebView editor:
// - px-6 py-4 = 24px horizontal, 16px vertical
// - font-size: 12pt (~16px)
// - line-height: 1.75 (16 * 1.75 = 28)
// - bg-background
const createPreviewStyles = (colors: ReturnType<typeof useTheme>['colors']) => StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  contentContainer: {
    paddingHorizontal: 24,
    paddingVertical: 16,
  },
  text: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.foreground,
    lineHeight: 28,
  },
})
