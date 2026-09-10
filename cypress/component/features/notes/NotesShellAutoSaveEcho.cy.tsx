import React from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { NotesShell } from '../../../../ui/web/components/features/notes/NotesShell'
import type { NoteDraftSnapshot } from '../../../../core/services/noteWorkspaceTabs'
import type { NoteViewModel } from '../../../../core/types/domain'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'
import {
  useNotesShellTestState,
  type FakeController,
} from './notesShellTestUtils'

/**
 * Regression guard: the real controller echoes every keystroke back into
 * `activeTab.draft`, which NotesShell forwards to the editor. If that live
 * echo reaches the editor's initial* props, the autosave reconciliation
 * treats the user's own typing as an external refresh and silently cancels
 * the pending autosave. This harness reproduces the echo loop and asserts
 * the debounced autosave still fires.
 */
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
  ]

  const handleAutoSave = cy.stub().as('autoSave').resolves(undefined)

  const Harness = () => {
    const {
      notes,
      isEditing,
      setIsEditing,
      registerNoteEditorRef,
      selectedNote,
      activeTab: baseTab,
      handleSaveNote,
      handleReadNote,
      handleEditNote,
      handleSelectNote,
    } = useNotesShellTestState(baseNotes)

    // Echo local typing back into the workspace tab exactly like
    // useNoteAppController.handleDraftChange does.
    const [draft, setDraft] = React.useState<NoteDraftSnapshot | null>(null)
    const activeTab = React.useMemo(() => ({
      ...baseTab,
      draft: draft ?? baseTab.draft,
      saveState: draft ? ('dirty' as const) : baseTab.saveState,
    }), [baseTab, draft])

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
      searchQuery: '',
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
      handleDraftChange: (nextDraft: NoteDraftSnapshot) => setDraft(nextDraft),
      handleViewSessionChange: () => {},
      saving: false,
      autoSaving: false,
      lastSavedAt: null,

      handleSelectNote,
      handleSearchResultClick: async () => {},
      handleTagClick: () => {},
      handleEditNote,
      handleSaveNote,
      handleReadNote,
      handleAutoSave,
      handleDeleteNote: () => {},
      handleRemoveTagFromNote: async () => {},

      ftsSearchResult: { isLoading: false },
      showFTSResults: false,
      ftsData: { total: 0, executionTime: 1, results: [] },
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

describe('NotesShell: autosave with live workspace draft echo', () => {
  it('fires the debounced autosave even while typing echoes into the active tab draft', () => {
    const typed = 'Echo safe text'
    const Harness = buildController()

    cy.mount(<Harness />)

    cy.get('[data-cy="editor-content"]').click().type(typed)

    // The 500ms debounced autosave must survive the draft echo re-renders.
    cy.get('@autoSave', { timeout: 4000 }).should('have.been.called')
    cy.get('@autoSave').should('have.been.calledWithMatch', Cypress.sinon.match((payload: { description?: string }) =>
      Boolean(payload?.description?.includes(typed))))
  })
})
