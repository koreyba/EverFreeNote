import React from 'react'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import type { NoteAppController } from '@/ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import type { SupabaseClient } from '@supabase/supabase-js'
import { ThemeProvider } from '@/components/theme-provider'

describe('Mobile Layout Adaptation', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockUser = { id: 'test-user', email: 'test@example.com' } as any
  
  let createMockController: (overrides?: Partial<NoteAppController>) => NoteAppController
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    createMockController = (overrides: Partial<NoteAppController> = {}): NoteAppController => ({
      user: mockUser,
      loading: false,
      notes: [],
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notesQuery: { isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: cy.stub() } as any,
      selectedNote: null,
      isEditing: false,
      editForm: { title: '', description: '', tags: '' },
      searchQuery: '',
      filterByTag: null,
      deleteDialogOpen: false,
      noteToDelete: null,
      saving: false,
      selectionMode: false,
      selectedNoteIds: new Set(),
      selectedCount: 0,
      bulkDeleting: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ftsSearchResult: { isLoading: false, data: [] } as any,
      showFTSResults: false,
      ftsData: undefined,
      ftsResults: [],
      ftsHasMore: false,
      ftsLoadingMore: false,
      ftsObserverTarget: { current: null },
      observerTarget: { current: null },
      deleteAccountLoading: false,
      
      handleSelectNote: cy.stub().as('handleSelectNote'),
      handleCreateNote: cy.stub(),
      handleEditNote: cy.stub(),
      handleSaveNote: cy.stub(),
      handleDeleteNote: cy.stub(),
      confirmDeleteNote: cy.stub(),
      setDeleteDialogOpen: cy.stub(),
      handleSearch: cy.stub(),
      handleClearTagFilter: cy.stub(),
      handleTagClick: cy.stub(),
      handleRemoveTagFromNote: cy.stub(),
      handleSignOut: cy.stub(),
      handleDeleteAccount: cy.stub(),
      handleTestLogin: cy.stub(),
      handleSkipAuth: cy.stub(),
      handleSignInWithGoogle: cy.stub(),
      setEditForm: cy.stub(),
      invalidateNotes: cy.stub(),
      handleSearchResultClick: cy.stub(),
      enterSelectionMode: cy.stub(),
      exitSelectionMode: cy.stub(),
      selectAllVisible: cy.stub(),
      clearSelection: cy.stub(),
      loadMoreFts: cy.stub(),
      toggleNoteSelection: cy.stub(),
      deleteSelectedNotes: cy.stub(),
      totalNotes: 0,
      notesDisplayed: 0,
      notesTotal: 0,
      isOffline: false,
      pendingCount: 0,
      failedCount: 0,
      
      ...overrides
    })

    mockSupabase = {
      auth: {
        getSession: cy.stub().resolves({ data: { session: { user: mockUser } }, error: null }),
        onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } }),
      },
      from: cy.stub().returns({
        select: cy.stub().returnsThis(),
        order: cy.stub().returnsThis(),
        range: cy.stub().returnsThis(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        then: (resolve: any) => resolve({ data: [], error: null })
      }),
      storage: {
          from: cy.stub().returns({
            upload: cy.stub().resolves({ data: { path: '' }, error: null }),
            getPublicUrl: cy.stub().returns({ data: { publicUrl: 'https://example.com' }, error: null }),
          }),
      },
    } as unknown as SupabaseClient
  })

  it('shows sidebar and hides editor on mobile by default', () => {
    cy.viewport('iphone-se2')
    const controller = createMockController()
    
    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    // Sidebar content should be visible (not hidden)
    cy.get('[data-testid=\'sidebar-container\']').should('not.have.class', 'hidden')
    
    // Editor should be hidden
    cy.get('[data-testid=\'editor-container\']').should('have.class', 'hidden')
  })

  it('shows editor and hides sidebar when note is selected on mobile', () => {
    cy.viewport('iphone-se2')
    const selectedNote = { 
      id: '1', 
      title: 'Test Note', 
      description: 'Content', 
      tags: [],
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })
    
    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    // Sidebar should be hidden
    cy.get('[data-testid=\'sidebar-container\']').should('have.class', 'hidden')

    // Editor (NoteView) should be visible
    cy.get('[data-testid=\'editor-container\']').should('not.have.class', 'hidden')
    
    cy.contains('Test Note').should('exist') // Content title
    cy.contains('Reading').should('exist') // Header status
  })

  it('shows Editing status in editor', () => {
    cy.viewport('iphone-se2')
    const controller = createMockController({ 
      isEditing: true,
      editForm: { title: 'New Note', description: '', tags: '' }
    })
    
    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    cy.contains('Editing').should('exist')
  })

  it('shows back button in NoteView on mobile', () => {
    cy.viewport('iphone-se2')
    const selectedNote = { 
      id: '1', 
      title: 'Test Note', 
      description: 'Content', 
      tags: [],
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })
    
    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    // Back button (ChevronLeft) should exist
    cy.get('.lucide-chevron-left').should('exist')
    
    // Click back button
    cy.get('.lucide-chevron-left').parent().click()
    cy.get('@handleSelectNote').should('have.been.calledWith', null)
  })

  it('hides back button on desktop', () => {
    cy.viewport(1024, 768)
    const selectedNote = { 
      id: '1', 
      title: 'Test Note', 
      description: 'Content', 
      tags: [],
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })
    
    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    // Back button should have md:hidden class
    cy.get('.lucide-chevron-left').parent().should('have.class', 'md:hidden')
  })
})
