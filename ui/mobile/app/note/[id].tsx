import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { View, TextInput, StyleSheet, ActivityIndicator, Text, Platform, Keyboard, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack, useRouter } from 'expo-router'
import { useNote, useUpdateNote } from '@ui/mobile/hooks'
import EditorWebView, { type EditorWebViewHandle } from '@ui/mobile/components/EditorWebView'
import { EditorToolbar } from '@ui/mobile/components/EditorToolbar'
import { useTheme } from '@ui/mobile/providers'
import { ThemeToggle } from '@ui/mobile/components/ThemeToggle'
import { TagInput } from '@ui/mobile/components/tags/TagInput'

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
  const router = useRouter()
  const { colors } = useTheme()
  const styles = useMemo(() => createStyles(colors), [colors])

  const editorRef = useRef<EditorWebViewHandle>(null)
  const [title, setTitle] = useState('')
  const [tags, setTags] = useState<string[]>([])
  const [isEditorFocused, setIsEditorFocused] = useState(false)
  const [keyboardHeight, setKeyboardHeight] = useState(0)
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

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
    }
  }, [note])

  const debouncedUpdate = useCallback((updates: { title?: string; description?: string; tags?: string[] }) => {
    if (saveTimeout.current) clearTimeout(saveTimeout.current)

    saveTimeout.current = setTimeout(() => {
      updateNote({ id, updates })
    }, 1000)
  }, [id, updateNote])

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

  const handleToolbarCommand = (method: string, args?: unknown[]) => {
    editorRef.current?.runCommand(method, args)
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    )
  }

  if (error || !note) {
    return (
      <View style={styles.centerContainer}>
        <Text style={styles.errorText}>Ошибка загрузки заметки</Text>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <Stack.Screen
        options={{
          title: 'Редактирование',
          headerStyle: { backgroundColor: colors.background },
          headerTintColor: colors.foreground,
          headerRight: () => <ThemeToggle style={styles.headerToggle} />,
        }}
      />
      <View style={styles.header}>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Название заметки"
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
      <EditorWebView
        ref={editorRef}
        initialContent={note.description || ''}
        onContentChange={handleContentChange}
        onFocus={() => setIsEditorFocused(true)}
        onBlur={() => setIsEditorFocused(false)}
        loadingFallback={<NoteBodyPreview html={note.description || ''} colors={colors} />}
      />
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
    marginRight: 12,
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
