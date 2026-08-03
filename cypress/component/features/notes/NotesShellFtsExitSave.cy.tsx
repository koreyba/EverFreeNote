import React from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { NotesShell } from '../../../../ui/web/components/features/notes/NotesShell'
import type { NoteViewModel, SearchResult } from '../../../../core/types/domain'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'
import {
  pastePlainText,
  useNotesShellAutoSave,
  useNotesShellTestState,
  type FakeController,
} from './notesShellTestUtils'

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
    const {
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
    } = useNotesShellTestState(baseNotes)

    const handleAutoSave = useNotesShellAutoSave(selectedNoteId, setNotes)

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

    const handleSearchResultClick = React.useCallback(async (note: SearchResult) => {
      await flushIfEditing()
      // Resolve to latest note state on click
      const latest = notes.find((n) => n.id === note.id) ?? (note as unknown as NoteViewModel)
      setSelectedNoteId(latest.id)
      setIsEditing(false)
    }, [flushIfEditing, notes, setIsEditing, setSelectedNoteId])

    const controller: FakeController = {
      registerNoteEditorRef,
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
      tabs: [activeTab],
      activeTabId: activeTab.id,
      activeTab,
      addTab: () => {},
      activateTab: () => {},
      closeTab: () => {},
      handleDraftChange: () => {},
      handleViewSessionChange: () => {},
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
