import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { View, TextInput, StyleSheet, ActivityIndicator, Text, Platform, Keyboard, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useSafeAreaInsets } from 'react-native-safe-area-context'
import { useNote, useUpdateNote, useDeleteNote } from '@ui/mobile/hooks'
import EditorWebView, { type EditorWebViewHandle } from '@ui/mobile/components/EditorWebView'
import { EditorToolbar } from '@ui/mobile/components/EditorToolbar'
import { useTheme } from '@ui/mobile/providers'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'
import { TagInput } from '@ui/mobile/components/tags/TagInput'
import { Trash2 } from 'lucide-react-native'
import { Pressable } from 'react-native'

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

  // Пустой контейнер для пустых заметок - без текста "Empty note"
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
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  type PendingUpdates = { title?: string; description?: string; tags?: string[] }

  const pendingUpdatesRef = useRef<PendingUpdates>({})
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

  const flushPendingUpdates = useCallback(() => {
    if (saveTimeout.current) {
      clearTimeout(saveTimeout.current)
      saveTimeout.current = null
    }

    const pending = pendingUpdatesRef.current
    const nextUpdates: PendingUpdates = {}

    if (typeof pending.title === 'string' && pending.title !== lastSavedRef.current.title) {
      nextUpdates.title = pending.title
    }

    if (typeof pending.description === 'string' && pending.description !== lastSavedRef.current.description) {
      nextUpdates.description = pending.description
    }

    if (Array.isArray(pending.tags) && !areStringArraysEqual(pending.tags, lastSavedRef.current.tags)) {
      nextUpdates.tags = pending.tags
    }

    if (Object.keys(nextUpdates).length === 0) {
      pendingUpdatesRef.current = {}
      return
    }

    updateNote({ id, updates: nextUpdates })

    lastSavedRef.current = {
      title: typeof nextUpdates.title === 'string' ? nextUpdates.title : lastSavedRef.current.title,
      description: typeof nextUpdates.description === 'string' ? nextUpdates.description : lastSavedRef.current.description,
      tags: Array.isArray(nextUpdates.tags) ? nextUpdates.tags : lastSavedRef.current.tags,
    }

    pendingUpdatesRef.current = {}
  }, [id, updateNote])

  useEffect(() => {
    return () => {
      flushPendingUpdates()
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
      pendingUpdatesRef.current = {}
    }
  }, [note])

  const debouncedUpdate = useCallback((updates: PendingUpdates) => {
    pendingUpdatesRef.current = { ...pendingUpdatesRef.current, ...updates }

    // Drop unchanged fields early to avoid redundant network calls on flush.
    if (
      typeof pendingUpdatesRef.current.title === 'string' &&
      pendingUpdatesRef.current.title === lastSavedRef.current.title
    ) {
      delete pendingUpdatesRef.current.title
    }
    if (
      typeof pendingUpdatesRef.current.description === 'string' &&
      pendingUpdatesRef.current.description === lastSavedRef.current.description
    ) {
      delete pendingUpdatesRef.current.description
    }
    if (
      Array.isArray(pendingUpdatesRef.current.tags) &&
      areStringArraysEqual(pendingUpdatesRef.current.tags, lastSavedRef.current.tags)
    ) {
      delete pendingUpdatesRef.current.tags
    }

    if (saveTimeout.current) clearTimeout(saveTimeout.current)
    saveTimeout.current = setTimeout(() => {
      flushPendingUpdates()
    }, 1000)
  }, [flushPendingUpdates])

  const handleTitleChange = (newTitle: string) => {
    setTitle(newTitle)
    debouncedUpdate({ title: newTitle })
  }

  const handleContentChange = (html: string) => {
    debouncedUpdate({ description: html })
  }

  const handleTagsChange = (nextTags: string[]) => {
    setTags(nextTags)
    debouncedUpdate({ tags: nextTags })
  }

  const handleTagPress = (tag: string) => {
    router.push({ pathname: '/(tabs)/search', params: { tag } })
  }

  const handleEditorBlur = useCallback(() => {
    setIsEditorFocused(false)
    // Flush any pending save immediately when editor loses focus
    flushPendingUpdates()
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

  const editorPaddingBottom = Math.max(insets.bottom, 0)

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

// Стили превью максимально соответствуют WebView редактору:
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
