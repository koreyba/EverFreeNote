import React, { useEffect, useRef, useState, useCallback } from 'react'
import { View, TextInput, StyleSheet, ActivityIndicator, Text, KeyboardAvoidingView, Platform } from 'react-native'
import { useLocalSearchParams, Stack } from 'expo-router'
import { useNote, useUpdateNote } from '@ui/mobile/hooks'
import EditorWebView, { type EditorWebViewHandle } from '@ui/mobile/components/EditorWebView'
import { EditorToolbar } from '@ui/mobile/components/EditorToolbar'

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
        <ActivityIndicator size="large" color="#4285F4" />
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
          placeholderTextColor="#999"
        />
      </View>
      <EditorToolbar onCommand={handleToolbarCommand} />
      <EditorWebView
        ref={editorRef}
        initialContent={note.description || ''}
        onContentChange={handleContentChange}
      />
    </KeyboardAvoidingView>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  header: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  titleInput: {
    fontSize: 22,
    fontWeight: '700',
    color: '#333',
    padding: 0,
  },
  centerContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: 'red',
  },
})
