import React from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { NotesShell } from '../../../../ui/web/components/features/notes/NotesShell'
import type { NoteViewModel, SearchResult } from '../../../../core/types/domain'
import type { NoteEditorHandle } from '../../../../ui/web/components/features/notes/NoteEditor'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

const pastePlainText = (text: string) => {
  cy.get('[data-cy="editor-content"]').click()
  cy.get('.ProseMirror').trigger('paste', {
    clipboardData: {
      types: ['text/plain'],
      getData: (type: string) => (type === 'text/plain' ? text : ''),
    },
  })
}

type FakeController = Record<string, unknown>

const buildController = () => {
  const supabase = {
    functions: {
      invoke: cy.stub().resolves({
        data: { configured: false, integration: null },
        error: null,
      }),
    },
  } as unknown as SupabaseClient

  const user: User = {
    id: 'test-user',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  } as unknown as User

  const baseNotes: NoteViewModel[] = [
    {
      id: 'note-1',
      title: 'Note 1',
      description: '',
      tags: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: user.id,
    },
    {
      id: 'note-2',
      title: 'Note 2',
      description: '',
      tags: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: user.id,
    },
  ]

  const Harness = () => {
    const registeredEditorRef = React.useRef<React.RefObject<NoteEditorHandle | null> | null>(null)
    const [notes, setNotes] = React.useState<NoteViewModel[]>(baseNotes)
    const [selectedNoteId, setSelectedNoteId] = React.useState<string>('note-1')
    const [isEditing, setIsEditing] = React.useState(true)

    const selectedNote = React.useMemo(
      () => notes.find((n) => n.id === selectedNoteId) ?? null,
      [notes, selectedNoteId]
    )

    const flushIfEditing = React.useCallback(async () => {
      if (!isEditing) return
      await registeredEditorRef.current?.current?.flushPendingSave()
    }, [isEditing])

    const ftsResults: SearchResult[] = React.useMemo(() => {
      // Simulate search results payload that may be stale. We re-resolve on click.
      return notes.map((n) => ({
        id: n.id,
        title: n.title,
        description: n.description,
        tags: n.tags,
        created_at: n.created_at,
        updated_at: n.updated_at,
        user_id: n.user_id,
        rank: 0.5,
        headline: null,
        content: null,
      }))
    }, [notes])

    const handleAutoSave = React.useCallback(async (data: { noteId?: string; title?: string; description?: string; tags?: string }) => {
      const noteId = data.noteId ?? selectedNoteId
      if (!noteId) return

      setNotes((prev) => prev.map((n) => {
        if (n.id !== noteId) return n
        return {
          ...n,
          title: data.title ?? n.title,
          description: data.description ?? n.description,
          // tags not relevant for this test
          updated_at: new Date().toISOString(),
        }
      }))
    }, [selectedNoteId])

    const handleSaveNote = React.useCallback((data: { title: string; description: string; tags: string }) => {
      const noteId = selectedNoteId
      setNotes((prev) => prev.map((n) => (n.id === noteId ? { ...n, title: data.title, description: data.description, updated_at: new Date().toISOString() } : n)))
    }, [selectedNoteId])

    const handleReadNote = React.useCallback((data: { title: string; description: string; tags: string }) => {
      handleSaveNote(data)
      setIsEditing(false)
    }, [handleSaveNote])

    const handleEditNote = React.useCallback((note: NoteViewModel) => {
      setSelectedNoteId(note.id)
      setIsEditing(true)
    }, [])

    const handleSelectNote = React.useCallback(async (note: NoteViewModel | null) => {
      await flushIfEditing()
      setSelectedNoteId(note?.id ?? '')
      setIsEditing(false)
    }, [flushIfEditing])

    const handleSearchResultClick = React.useCallback(async (note: SearchResult) => {
      await flushIfEditing()
      // Resolve to latest note state on click
      const latest = notes.find((n) => n.id === note.id) ?? (note as unknown as NoteViewModel)
      setSelectedNoteId(latest.id)
      setIsEditing(false)
    }, [flushIfEditing, notes])

    const controller: FakeController = {
      registerNoteEditorRef: (ref: React.RefObject<NoteEditorHandle | null>) => {
        registeredEditorRef.current = ref
      },
      user,
      notes,
      notesQuery: {
        isLoading: false,
        fetchNextPage: () => {},
        hasNextPage: false,
        isFetchingNextPage: false,
      },
      notesDisplayed: notes.length,
      notesTotal: notes.length,

      selectionMode: false,
      selectedCount: 0,
      bulkDeleting: false,
      enterSelectionMode: () => {},
      exitSelectionMode: () => {},
      selectAllVisible: () => {},
      clearSelection: () => {},
      deleteSelectedNotes: async () => {},
      selectedNoteIds: new Set<string>(),
      toggleNoteSelection: () => {},

      filterByTag: null,
      searchQuery: 'tes',
      handleSearch: () => {},
      handleClearTagFilter: () => {},
      handleCreateNote: () => setIsEditing(true),
      handleSignOut: async () => {},
      handleDeleteAccount: async () => {},
      deleteAccountLoading: false,
      invalidateNotes: async () => {},

      pendingCount: 0,
      failedCount: 0,
      isOffline: false,

      selectedNote,
      isEditing,
      saving: false,
      autoSaving: false,
      lastSavedAt: null,

      handleSelectNote,
      handleSearchResultClick,
      handleTagClick: () => {},
      handleEditNote,
      handleSaveNote,
      handleReadNote,
      handleAutoSave,
      handleDeleteNote: () => {},
      handleRemoveTagFromNote: async () => {},

      ftsSearchResult: { isLoading: false },
      showFTSResults: true,
      ftsData: {
        total: ftsResults.length,
        executionTime: 1,
        results: ftsResults,
      },
      ftsHasMore: false,
      ftsLoadingMore: false,
      loadMoreFts: () => {},
      ftsObserverTarget: null,
      ftsResults: ftsResults,
    }

    return (
      <SupabaseTestProvider supabase={supabase}>
        <NotesShell controller={controller as unknown as import('../../../../ui/web/hooks/useNoteAppController').NoteAppController} />
      </SupabaseTestProvider>
    )
  }

  return Harness
}

describe('NotesShell: save on exit via FTS click (web)', () => {
  it('flushes autosave after typing when clicking another note in FTS results', () => {
    const typed = 'Typed text'
    const Harness = buildController()

    cy.mount(<Harness />)

    cy.get('[data-cy="editor-content"]').click().type(typed)

    // Click another note in FTS results while still editing
    cy.get('[data-testid="note-card"]').contains('Note 2').click()

    // Return to Note 1 via FTS and verify saved content is visible
    cy.get('[data-testid="note-card"]').contains('Note 1').click()
    cy.contains('button', 'Edit').click()
    cy.get('[data-cy="editor-content"]').should('contain', typed)
  })

  it('flushes autosave after paste when clicking another note in FTS results', () => {
    const pasted = 'Pasted text'
    const Harness = buildController()

    cy.mount(<Harness />)

    pastePlainText(pasted)

    cy.get('[data-testid="note-card"]').contains('Note 2').click()

    cy.get('[data-testid="note-card"]').contains('Note 1').click()
    cy.contains('button', 'Edit').click()
    cy.get('[data-cy="editor-content"]').should('contain', pasted)
  })

  it('does not show stale content when clicking the same note after quick edit', () => {
    const typed = '2'
    const Harness = buildController()

    cy.mount(<Harness />)

    cy.get('[data-cy="editor-content"]').click().type(typed)

    // Click the same note (Note 1) in FTS results immediately
    cy.get('[data-testid="note-card"]').contains('Note 1').click()

    // First click should already reflect saved content when re-entering edit
    cy.contains('button', 'Edit').click()
    cy.get('[data-cy="editor-content"]').should('contain', typed)
  })

  it('saves on Read action and shows updated content in view mode (FTS context)', () => {
    const typed = 'Read mode text'
    const Harness = buildController()

    cy.mount(<Harness />)

    cy.get('[data-cy="editor-content"]').click().type(typed)
    cy.contains('button', 'Read').click()

    cy.contains('Reading')
    cy.contains(typed)

    cy.contains('button', 'Edit').click()
    cy.get('[data-cy="editor-content"]').should('contain', typed)
  })
})
