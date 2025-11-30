import React from 'react'
import { NotesShell } from '@/components/features/notes/NotesShell'
import type { NoteAppController } from '@/ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@/lib/providers/SupabaseProvider'
import type { SupabaseClient } from '@supabase/supabase-js'

describe('Mobile Layout Adaptation', () => {
  const mockUser = { id: 'test-user', email: 'test@example.com' } as any
  
  let createMockController: (overrides?: Partial<NoteAppController>) => NoteAppController
  let mockSupabase: SupabaseClient

  beforeEach(() => {
    createMockController = (overrides: Partial<NoteAppController> = {}): NoteAppController => ({
      user: mockUser,
      loading: false,
      notes: [],
      notesQuery: { isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: cy.stub() } as any,
      selectedNote: null,
      isEditing: false,
      editForm: { title: '', description: '', tags: '' },
      searchQuery: '',
      filterByTag: null,
      deleteDialogOpen: false,
      noteToDelete: null,
      saving: false,
      ftsSearchResult: { isLoading: false, data: [] } as any,
      showFTSResults: false,
      ftsData: null,
      observerTarget: { current: null },
      
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
      handleTestLogin: cy.stub(),
      handleSkipAuth: cy.stub(),
      handleSignInWithGoogle: cy.stub(),
      setEditForm: cy.stub(),
      invalidateNotes: cy.stub(),
      handleSearchResultClick: cy.stub(),
      
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
      <SupabaseTestProvider supabase={mockSupabase}>
        <NotesShell controller={controller} />
      </SupabaseTestProvider>
    )

    // Sidebar content should be visible
    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('New Note').should('be.visible')
    
    // Editor should be hidden
    // The editor container has `hidden md:flex` when !showEditor
    // We can check for the empty state text
    cy.contains('Select a note').should('not.be.visible') 
  })

  it('shows editor and hides sidebar when note is selected on mobile', () => {
    cy.viewport('iphone-se2')
    const selectedNote = { 
      id: '1', 
      title: 'Test Note', 
      description: 'Content', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })
    
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <NotesShell controller={controller} />
      </SupabaseTestProvider>
    )

    // Sidebar should be hidden
    // It has `hidden md:flex`
    // We check if the "New Note" button is hidden
    cy.contains('New Note').should('not.be.visible')

    // Editor (NoteView) should be visible
    cy.contains('Test Note').should('be.visible') // Content title
    cy.contains('Reading').should('be.visible') // Header status
  })

  it('shows Editing status in editor', () => {
    cy.viewport('iphone-se2')
    const controller = createMockController({ 
      isEditing: true,
      editForm: { title: 'New Note', description: '', tags: '' }
    })
    
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <NotesShell controller={controller} />
      </SupabaseTestProvider>
    )

    cy.contains('Editing').should('be.visible')
  })

  it('shows back button in NoteView on mobile', () => {
    cy.viewport('iphone-se2')
    const selectedNote = { 
      id: '1', 
      title: 'Test Note', 
      description: 'Content', 
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })
    
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <NotesShell controller={controller} />
      </SupabaseTestProvider>
    )

    // Back button (ChevronLeft) should be visible
    cy.get('.lucide-chevron-left').should('be.visible')
    
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
      created_at: new Date().toISOString(), 
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })
    
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <NotesShell controller={controller} />
      </SupabaseTestProvider>
    )

    // Back button should be hidden (md:hidden)
    cy.get('.lucide-chevron-left').should('not.be.visible')
  })
})
