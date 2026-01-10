import React from 'react'
import { NoteEditor, type NoteEditorHandle } from '@ui/web/components/features/notes/NoteEditor'

type TestNote = {
  id: string
  title: string
  description: string
  tags: string
}

type NotePayload = {
  title: string
  description: string
  tags: string
}

const baseNotes: TestNote[] = [
  { id: 'note-1', title: 'Note 1', description: '', tags: '' },
  { id: 'note-2', title: 'Note 2', description: '', tags: '' },
]

const buildNote = (id: string, payload: NotePayload, existing?: TestNote): TestNote => ({
  id,
  title: payload.title.trim() || existing?.title || 'Untitled',
  description: payload.description ?? existing?.description ?? '',
  tags: payload.tags ?? existing?.tags ?? '',
})

const isBlank = (value: string) => value.trim().length === 0

const isEmptyPayload = (payload: NotePayload) => (
  isBlank(payload.title) && isBlank(payload.description) && isBlank(payload.tags)
)

const TestHarness = ({ initialSelectedId = 'note-1' }: { initialSelectedId?: string | null }) => {
  const [notes, setNotes] = React.useState<TestNote[]>(baseNotes)
  const [selectedId, setSelectedId] = React.useState<string | null>(initialSelectedId)
  const [isEditing, setIsEditing] = React.useState(true)
  const editorRef = React.useRef<NoteEditorHandle | null>(null)
  const newNoteCounterRef = React.useRef(1)

  const selectedNote = React.useMemo(
    () => notes.find((note) => note.id === selectedId) ?? null,
    [notes, selectedId]
  )

  const getNextNewNoteId = React.useCallback(() => {
    const suffix = newNoteCounterRef.current
    newNoteCounterRef.current += 1
    return suffix === 1 ? 'note-new' : `note-new-${suffix}`
  }, [])

  const persistNote = React.useCallback((payload: NotePayload) => {
    const targetId = selectedId
    if (!targetId) {
      const newId = getNextNewNoteId()
      const note = buildNote(newId, payload)
      setNotes((prev) => [...prev, note])
      setSelectedId(newId)
      return
    }

    setNotes((prev) => {
      const existing = prev.find((note) => note.id === targetId)
      const next = buildNote(targetId, payload, existing)
      return prev.map((note) => (note.id === targetId ? next : note))
    })
  }, [getNextNewNoteId, selectedId])

  const handleAutoSave = React.useCallback((payload: { noteId?: string } & NotePayload) => {
    const targetId = payload.noteId ?? selectedId
    const snapshot = {
      title: payload.title,
      description: payload.description,
      tags: payload.tags,
    }

    if (!targetId) {
      if (isEmptyPayload(snapshot)) return
      const newId = getNextNewNoteId()
      const note = buildNote(newId, snapshot)
      setNotes((prev) => [...prev, note])
      setSelectedId(newId)
      return
    }

    setNotes((prev) => {
      const existing = prev.find((note) => note.id === targetId)
      const next = buildNote(targetId, snapshot, existing)
      if (existing && existing.title === next.title && existing.description === next.description && existing.tags === next.tags) {
        return prev
      }
      return prev.map((note) => (note.id === targetId ? next : note))
    })
  }, [getNextNewNoteId, selectedId])

  const flushAndSelect = React.useCallback((nextId: string | null) => {
    editorRef.current?.flushPendingSave()
    setSelectedId(nextId)
    setIsEditing(true)
  }, [])

  const handleNewNote = React.useCallback(() => {
    editorRef.current?.flushPendingSave()
    setSelectedId(null)
    setIsEditing(true)
  }, [])

  const handleSave = React.useCallback((payload: NotePayload) => {
    persistNote(payload)
  }, [persistNote])

  const handleRead = React.useCallback((payload: NotePayload) => {
    persistNote(payload)
    setIsEditing(false)
  }, [persistNote])

  return (
    <div className="space-y-4 p-4">
      <div className="flex flex-wrap gap-2">
        <button data-cy="new-note" onClick={handleNewNote}>New Note</button>
        {notes.map((note) => (
          <button
            key={note.id}
            data-cy={`select-note-${note.id}`}
            onClick={() => flushAndSelect(note.id)}
          >
            {note.title}
          </button>
        ))}
      </div>

      <div data-cy="selected-note-id">{selectedId ?? 'none'}</div>

      {isEditing ? (
        <NoteEditor
          ref={editorRef}
          noteId={selectedNote?.id}
          initialTitle={selectedNote?.title ?? ''}
          initialDescription={selectedNote?.description ?? ''}
          initialTags={selectedNote?.tags ?? ''}
          availableTags={[]}
          isSaving={false}
          onSave={handleSave}
          onRead={handleRead}
          onAutoSave={handleAutoSave}
          autosaveDelayMs={50}
        />
      ) : (
        <div data-cy="note-view" className="space-y-2">
          <div data-cy="note-view-title">{selectedNote?.title ?? 'Untitled'}</div>
          <div data-cy="note-view-description" dangerouslySetInnerHTML={{ __html: selectedNote?.description ?? '' }} />
          <button data-cy="edit-note" onClick={() => setIsEditing(true)}>Edit</button>
        </div>
      )}

      <div data-cy="note-store">
        {notes.map((note) => (
          <div key={note.id} data-cy={`note-${note.id}-description`}>
            {note.description}
          </div>
        ))}
      </div>
    </div>
  )
}

const pastePlainText = (text: string) => {
  cy.get('[data-cy="editor-content"]').click()
  cy.get('.ProseMirror').trigger('paste', {
    clipboardData: {
      types: ['text/plain'],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  })
}

describe('NoteEditor save on exit (web)', () => {
  it('saves a new note after paste when switching notes', () => {
    const pasted = 'Pasted text'
    cy.mount(<TestHarness initialSelectedId={null} />)

    pastePlainText(pasted)
    cy.get('[data-cy="select-note-note-1"]').click()

    cy.get('[data-cy="select-note-note-new"]').should('exist').click()
    cy.get('[data-cy="editor-content"]').should('contain', pasted)
  })

  it('saves an existing note after typing when creating a new note', () => {
    const typed = 'Typed text'
    cy.mount(<TestHarness initialSelectedId="note-1" />)

    cy.get('[data-cy="editor-content"]').click().type(typed)
    cy.get('[data-cy="new-note"]').click()

    cy.get('[data-cy="select-note-note-1"]').click()
    cy.get('[data-cy="editor-content"]').should('contain', typed)
  })

  it('saves on Save and Read actions before leaving', () => {
    const pasted = 'Saved via button'
    const typed = ' Read mode text'
    cy.mount(<TestHarness initialSelectedId="note-1" />)

    pastePlainText(pasted)
    cy.contains('button', 'Save').click()
    cy.get('[data-cy="select-note-note-2"]').click()
    cy.get('[data-cy="select-note-note-1"]').click()
    cy.get('[data-cy="editor-content"]').should('contain', pasted)

    cy.get('[data-cy="editor-content"]').click().type(typed)
    cy.contains('button', 'Read').click()
    cy.get('[data-cy="note-view"]').should('contain', pasted)
    cy.get('[data-cy="note-view"]').should('contain', typed.trim())
    cy.get('[data-cy="edit-note"]').click()
    cy.get('[data-cy="editor-content"]').should('contain', typed.trim())
  })
})
