import React from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { NotesShell } from '../../../../ui/web/components/features/notes/NotesShell'
import type { NoteViewModel } from '../../../../core/types/domain'
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
      title: 'Test Note 1',
      description: '',
      tags: [],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: user.id,
    },
    {
      id: 'note-2',
      title: 'Test Note 2',
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
      searchQuery: 'test',
      handleSearch: () => {},
      handleClearTagFilter: () => {},
      handleCreateNote: async () => {
        await flushIfEditing()
        setIsEditing(true)
      },
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
      handleSearchResultClick: async () => {},
      handleTagClick: async () => {},
      handleEditNote,
      handleSaveNote,
      handleReadNote,
      handleAutoSave,
      handleDeleteNote: () => {},
      handleRemoveTagFromNote: async () => {},

      // Like-search path (non-FTS): showFTSResults=false so NoteList uses onSelectNote.
      ftsSearchResult: { isLoading: false },
      showFTSResults: false,
      ftsData: undefined,
      ftsHasMore: false,
      ftsLoadingMore: false,
      loadMoreFts: () => {},
      ftsObserverTarget: null,
      ftsResults: [],
    }

    return (
      <SupabaseTestProvider supabase={supabase}>
        <NotesShell controller={controller as unknown as import('../../../../ui/web/hooks/useNoteAppController').NoteAppController} />
      </SupabaseTestProvider>
    )
  }

  return Harness
}

describe('NotesShell: save on exit via like-search list (web)', () => {
  it('flushes autosave after typing when clicking another note in the list (search mode)', () => {
    const typed = 'Typed text'
    const Harness = buildController()

    cy.mount(<Harness />)

    cy.get('[data-cy="editor-content"]').click().type(typed)

    // Click another note in the (non-FTS) list while still editing
    cy.get('[data-testid="note-card"]').contains('Test Note 2').click()

    // Return to Note 1 and verify saved content is visible
    cy.get('[data-testid="note-card"]').contains('Test Note 1').click()
    cy.contains('button', 'Edit').click()
    cy.get('[data-cy="editor-content"]').should('contain', typed)
  })

  it('flushes autosave after paste when clicking another note in the list (search mode)', () => {
    const pasted = 'Pasted text'
    const Harness = buildController()

    cy.mount(<Harness />)

    pastePlainText(pasted)

    cy.get('[data-testid="note-card"]').contains('Test Note 2').click()

    cy.get('[data-testid="note-card"]').contains('Test Note 1').click()
    cy.contains('button', 'Edit').click()
    cy.get('[data-cy="editor-content"]').should('contain', pasted)
  })

  it('does not show stale content when clicking the same note after quick edit (like-search list)', () => {
    const typed = '2'
    const Harness = buildController()

    cy.mount(<Harness />)

    cy.get('[data-cy="editor-content"]').click().type(typed)

    // Click the same note in the (non-FTS) list immediately
    cy.get('[data-testid="note-card"]').contains('Test Note 1').click()

    // Re-enter edit mode and ensure content is already up to date
    cy.contains('button', 'Edit').click()
    cy.get('[data-cy="editor-content"]').should('contain', typed)
  })

  it('saves on Read action and shows updated content in view mode', () => {
    const typed = 'Read mode text'
    const Harness = buildController()

    cy.mount(<Harness />)

    cy.get('[data-cy="editor-content"]').click().type(typed)
    cy.contains('button', 'Read').click()

    // View mode should render the latest content
    cy.contains('Reading')
    cy.contains(typed)

    // And switching back to Edit keeps the content
    cy.contains('button', 'Edit').click()
    cy.get('[data-cy="editor-content"]').should('contain', typed)
  })
})
