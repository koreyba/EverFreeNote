import React from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { NotesShell } from '../../../../ui/web/components/features/notes/NotesShell'
import type { NoteViewModel } from '../../../../core/types/domain'
import type { NoteEditorHandle } from '../../../../ui/web/components/features/notes/NoteEditor'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

type FakeController = Record<string, unknown>

describe('NotesShell: AI open in context', () => {
  it('applies scroll and chunk highlight on the first open-in-context click', () => {
    cy.window().then((win) => {
      win.localStorage.setItem(
        'everfreenote:aiSearchMode',
        JSON.stringify({ isAIEnabled: true, preset: 'neutral', viewMode: 'note' })
      )
    })

    const user: User = {
      id: 'test-user',
      app_metadata: {},
      user_metadata: {},
      aud: 'authenticated',
      created_at: new Date().toISOString(),
    } as unknown as User

    const note: NoteViewModel = {
      id: 'note-1',
      title: 'Chunk note',
      description: '<p>Alpha beta gamma</p><p>Delta epsilon zeta</p><p>Omega</p>',
      tags: ['ontology'],
      created_at: '2024-01-01T00:00:00Z',
      updated_at: '2024-01-01T00:00:00Z',
      user_id: user.id,
    }

    const chunkOffset = note.title.length + 1 + 10

    const invoke = cy.stub().callsFake((fn: string) => {
      if (fn === 'api-keys-status') {
        return Promise.resolve({ data: { gemini: { configured: true } }, error: null })
      }
      if (fn === 'wordpress-settings-status') {
        return Promise.resolve({ data: { configured: false, integration: null }, error: null })
      }
      if (fn === 'rag-search') {
        return Promise.resolve({
          data: {
            chunks: [
              {
                noteId: note.id,
                noteTitle: note.title,
                noteTags: note.tags,
                chunkIndex: 0,
                charOffset: chunkOffset,
                content: 'Alpha beta gamma',
                similarity: 0.84,
              },
            ],
          },
          error: null,
        })
      }

      return Promise.resolve({ data: null, error: null })
    })

    const supabase = {
      functions: { invoke },
      auth: {
        getUser: cy.stub().resolves({ data: { user }, error: null }),
      },
    } as unknown as SupabaseClient

    function Harness() {
      const registeredEditorRef = React.useRef<React.RefObject<NoteEditorHandle | null> | null>(null)
      const [selectedNote, setSelectedNote] = React.useState<NoteViewModel | null>(null)
      const [isEditing, setIsEditing] = React.useState(false)
      const [isSearchPanelOpen, setIsSearchPanelOpen] = React.useState(true)

      const controller: FakeController = {
        registerNoteEditorRef: (ref: React.RefObject<NoteEditorHandle | null>) => {
          registeredEditorRef.current = ref
        },
        user,
        notes: [note],
        notesQuery: {
          isLoading: false,
          fetchNextPage: () => {},
          hasNextPage: false,
          isFetchingNextPage: false,
        },
        notesDisplayed: 1,
        notesTotal: 1,
        selectionMode: false,
        selectedCount: 0,
        bulkDeleting: false,
        exitSelectionMode: () => {},
        selectAllVisible: () => {},
        deleteSelectedNotes: async () => {},
        selectedNoteIds: new Set<string>(),
        toggleNoteSelection: () => {},
        clearSelection: () => {},
        filterByTag: null,
        handleClearTagFilter: () => {},
        handleCreateNote: () => {},
        handleSignOut: async () => {},
        handleDeleteAccount: async () => {},
        deleteAccountLoading: false,
        invalidateNotes: async () => {},
        pendingCount: 0,
        failedCount: 0,
        isOffline: false,
        searchQuery: 'ontology',
        handleSearch: () => {},
        handleTagClick: () => {},
        handleSearchResultClick: () => {},
        ftsSearchResult: { isLoading: false, refetch: cy.stub() },
        showFTSResults: false,
        ftsData: undefined,
        ftsHasMore: false,
        ftsLoadingMore: false,
        showTagOnlyResults: false,
        tagOnlyResults: [],
        tagOnlyTotal: 0,
        tagOnlyLoading: false,
        tagOnlyHasMore: false,
        tagOnlyLoadingMore: false,
        loadMoreFts: () => {},
        loadMoreTagOnly: () => {},
        loadMoreAI: () => {},
        resetAIResults: () => {},
        registerAIPaginationControls: () => {},
        resetFtsResults: () => {},
        deleteNotesByIds: async () => ({ total: 0, failed: 0, queuedOffline: false }),
        selectedNote,
        isEditing,
        saving: false,
        autoSaving: false,
        lastSavedAt: null,
        handleSelectNote: (nextNote: NoteViewModel | null) => {
          setSelectedNote(nextNote)
          setIsEditing(false)
        },
        handleEditNote: (nextNote: NoteViewModel) => {
          setSelectedNote(nextNote)
          setIsEditing(true)
        },
        handleSaveNote: () => {},
        handleReadNote: () => {},
        handleAutoSave: async () => {},
        handleDeleteNote: () => {},
        handleRemoveTagFromNote: async () => {},
        isSearchPanelOpen,
        setIsSearchPanelOpen,
      }

      return (
        <SupabaseTestProvider supabase={supabase} user={user}>
          <NotesShell controller={controller as unknown as import('../../../../ui/web/hooks/useNoteAppController').NoteAppController} />
        </SupabaseTestProvider>
      )
    }

    cy.mount(<Harness />)

    cy.get("[aria-label^='Open top fragment from']").click()

    cy.contains('Editing').should('be.visible')
    cy.get('.ProseMirror .chunk-focus-block').should('have.length.at.least', 1)
    cy.get('.ProseMirror .chunk-focus-block').first().should('contain.text', 'Alpha beta gamma')
  })
})
