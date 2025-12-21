import React, { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { View, TextInput, StyleSheet, ActivityIndicator, Text, KeyboardAvoidingView, Platform, ScrollView } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useNote, useUpdateNote } from '@ui/mobile/hooks'
import EditorWebView, { type EditorWebViewHandle } from '@ui/mobile/components/EditorWebView'
import { EditorToolbar } from '@ui/mobile/components/EditorToolbar'
import { colors } from '@ui/mobile/lib/theme'

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

function NoteBodyPreview({ html }: { html: string }) {
  const text = useMemo(() => htmlToPlainText(html), [html])

  if (!text) {
    return (
      <View style={styles.previewEmpty}>
        <Text style={styles.previewEmptyText}>Empty note</Text>
      </View>
    )
  }

  return (
    <ScrollView
      style={styles.previewScroll}
      contentContainerStyle={styles.previewScrollContent}
      showsVerticalScrollIndicator={true}
    >
      <Text style={styles.previewText}>{text}</Text>
    </ScrollView>
  )
}

export default function NoteEditorScreen() {
  const { id } = useLocalSearchParams<{ id: string }>()
  const { data: note, isLoading, error } = useNote(id)
  const { mutate: updateNote } = useUpdateNote()

  const editorRef = useRef<EditorWebViewHandle>(null)
  const [title, setTitle] = useState('')
  const saveTimeout = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (note) {
      setTitle(note.title || '')
    }
  }, [note])

  const debouncedUpdate = useCallback((updates: { title?: string; description?: string }) => {
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

  const handleToolbarCommand = (method: string, args?: unknown[]) => {
    editorRef.current?.runCommand(method, args)
  }

  if (isLoading) {
    return (
      <View style={styles.centerContainer}>
        <ActivityIndicator size="large" color={colors.light.primary} />
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
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      style={styles.container}
    >
      <Stack.Screen options={{ title: 'Редактирование' }} />
      <View style={styles.header}>
        <TextInput
          style={styles.titleInput}
          value={title}
          onChangeText={handleTitleChange}
          placeholder="Название заметки"
          placeholderTextColor={colors.light.mutedForeground}
        />
      </View>
      <EditorToolbar onCommand={handleToolbarCommand} />
      <EditorWebView
        ref={editorRef}
        initialContent={note.description || ''}
        onContentChange={handleContentChange}
        loadingFallback={<NoteBodyPreview html={note.description || ''} />}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.light.background,
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: colors.light.border,
  },
  titleInput: {
    fontSize: 22,
    fontFamily: 'Inter_700Bold',
    color: colors.light.foreground,
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: colors.light.background,
  },
  errorText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.light.destructive,
  },
  previewScroll: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  previewScrollContent: {
    paddingBottom: 24,
  },
  previewText: {
    fontSize: 16,
    fontFamily: 'Inter_400Regular',
    color: colors.light.foreground,
    lineHeight: 22,
  },
  previewEmpty: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 12,
    justifyContent: 'center',
  },
  previewEmptyText: {
    fontSize: 14,
    fontFamily: 'Inter_400Regular',
    color: colors.light.mutedForeground,
    textAlign: 'center',
  },
})
