import React from 'react'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import type { NoteViewModel } from '@core/types/domain'
import type { NoteEditorHandle } from '@ui/web/components/features/notes/NoteEditor'

export type FakeController = Record<string, unknown>

type NotesShellAutoSaveData = {
  noteId?: string
  title?: string
  description?: string
  tags?: string
}

type NotesShellSaveData = {
  title: string
  description: string
  tags: string
}

export const pastePlainText = (text: string) => {
  cy.get('[data-cy="editor-content"]').click()
  cy.get('.ProseMirror').trigger('paste', {
    clipboardData: {
      types: ['text/plain'],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  })
}

export const makeWorkspaceTab = (note: NoteViewModel | null, isEditing: boolean): NoteWorkspaceTab => ({
  id: 'tab-1',
  noteId: note?.id ?? null,
  note,
  mode: isEditing ? 'editing' : 'reading',
  draft: {
    title: note?.title ?? '',
    description: note?.description ?? '',
    tags: note?.tags.join(', ') ?? '',
  },
  view: { scrollTop: 0 },
  saveState: 'saved',
  saveError: null,
})

export function useNotesShellTestState(baseNotes: NoteViewModel[]) {
  const [notes, setNotes] = React.useState<NoteViewModel[]>(baseNotes)
  const [selectedNoteId, setSelectedNoteId] = React.useState<string>('note-1')
  const [isEditing, setIsEditing] = React.useState(true)
  const { registerNoteEditorRef, flushIfEditing } = useEditorExitState(isEditing)

  const selectedNote = React.useMemo(
    () => notes.find((n) => n.id === selectedNoteId) ?? null,
    [notes, selectedNoteId]
  )
  const activeTab = React.useMemo(() => makeWorkspaceTab(selectedNote, isEditing), [selectedNote, isEditing])

  const handleSaveNote = React.useCallback((data: NotesShellSaveData) => {
    const noteId = selectedNoteId
    setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, title: data.title, description: data.description, updated_at: new Date().toISOString() } : n)))
  }, [selectedNoteId, setNotes])

  const handleReadNote = React.useCallback((data: NotesShellSaveData) => {
    handleSaveNote(data)
    setIsEditing(false)
  }, [handleSaveNote, setIsEditing])

  const handleEditNote = React.useCallback((note: NoteViewModel) => {
    setSelectedNoteId(note.id)
    setIsEditing(true)
  }, [setIsEditing, setSelectedNoteId])

  const handleSelectNote = React.useCallback(async (note: NoteViewModel | null) => {
    await flushIfEditing()
    setSelectedNoteId(note?.id ?? '')
    setIsEditing(false)
  }, [flushIfEditing, setIsEditing, setSelectedNoteId])

  return {
    notes,
    setNotes,
    selectedNoteId,
    setSelectedNoteId,
    isEditing,
    setIsEditing,
    registerNoteEditorRef,
    flushIfEditing,
    selectedNote,
    activeTab,
    handleSaveNote,
    handleReadNote,
    handleEditNote,
    handleSelectNote,
  }
}

export function useNotesShellAutoSave(
  selectedNoteId: string,
  setNotes: React.Dispatch<React.SetStateAction<NoteViewModel[]>>
) {
  return React.useCallback(async (data: NotesShellAutoSaveData) => {
    const noteId = data.noteId ?? selectedNoteId
    if (!noteId) return

    setNotes((prev) => prev.map((n) => {
      if (n.id !== noteId) return n
      return {
        ...n,
        title: data.title ?? n.title,
        description: data.description ?? n.description,
        // Tags are not relevant to these exit-save scenarios.
        updated_at: new Date().toISOString(),
      }
    }))
  }, [selectedNoteId, setNotes])
}

export function useEditorExitState(isEditing: boolean) {
  const registeredEditorRef = React.useRef<React.RefObject<NoteEditorHandle | null> | null>(null)

  const registerNoteEditorRef = React.useCallback((ref: React.RefObject<NoteEditorHandle | null>) => {
    registeredEditorRef.current = ref
  }, [])

  const flushIfEditing = React.useCallback(async () => {
    if (!isEditing) return
    await registeredEditorRef.current?.current?.flushPendingSave()
  }, [isEditing])

  return { registerNoteEditorRef, flushIfEditing }
}
