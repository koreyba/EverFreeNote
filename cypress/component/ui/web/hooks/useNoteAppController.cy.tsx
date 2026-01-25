import React from 'react'
import { useNoteAppController } from '../../../../../ui/web/hooks/useNoteAppController'
import { QueryProvider } from '../../../../../ui/web/components/providers/QueryProvider'
import { SupabaseTestProvider } from '../../../../../ui/web/providers/SupabaseProvider'
import { NoteViewModel } from '../../../../../core/types/domain'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NoteEditorHandle } from '../../../../../ui/web/components/features/notes/NoteEditor'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

let flushSpy: SinonStub | null = null

const TestComponent = () => {
  const controller = useNoteAppController()
  const editorRef = React.useRef<NoteEditorHandle | null>({
    flushPendingSave: async () => {
      flushSpy?.()
    },
  })

  return (
    <div>
      <div data-cy="loading">{controller.loading ? 'true' : 'false'}</div>
      <div data-cy="user">{controller.user ? controller.user.id : 'no-user'}</div>
      <div data-cy="isEditing">{controller.isEditing ? 'true' : 'false'}</div>
      <div data-cy="selectedNote-id">{controller.selectedNote ? controller.selectedNote.id : 'none'}</div>
      <div data-cy="selectedNote-tags">{controller.selectedNote?.tags?.join(',') || ''}</div>
      <div data-cy="searchQuery">{controller.searchQuery}</div>
      <div data-cy="deleteDialogOpen">{controller.deleteDialogOpen ? 'true' : 'false'}</div>
      <div data-cy="filterByTag">{controller.filterByTag || 'none'}</div>

      <button data-cy="login-btn" onClick={controller.handleTestLogin}>Login</button>
      <button data-cy="skip-auth-btn" onClick={controller.handleSkipAuth}>Skip Auth</button>
      <button data-cy="sign-out-btn" onClick={() => controller.handleSignOut()}>Sign Out</button>
      <button data-cy="google-login-btn" onClick={controller.handleSignInWithGoogle}>Google Login</button>

      <button data-cy="create-note-btn" onClick={controller.handleCreateNote}>Create Note</button>
      <button data-cy="edit-note-btn" onClick={() => controller.handleEditNote({
        id: '1',
        title: 'Test Note',
        description: 'Desc',
        tags: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        user_id: 'test-user'
      } as NoteViewModel)}>Edit Note</button>
      <button data-cy="select-note-btn" onClick={() => controller.handleSelectNote({
        id: '2',
        title: 'Selected Note',
        description: '',
        tags: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        user_id: 'test-user'
      } as NoteViewModel)}>Select Note</button>
      <button data-cy="select-null-note-btn" onClick={() => controller.handleSelectNote(null)}>Select Null Note</button>
      <button data-cy="search-btn" onClick={() => controller.handleSearch('test query')}>Search</button>

      <button data-cy="save-note-btn" onClick={() => controller.handleSaveNote({
        title: 'New Note',
        description: 'New Description',
        tags: 'tag1, tag2'
      })}>Save Note</button>
      <button data-cy="delete-note-btn" onClick={() => controller.handleDeleteNote({
        id: '1',
        title: 'To Delete',
        description: '',
        tags: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        user_id: 'test-user'
      } as NoteViewModel)}>Delete Note</button>
      <button data-cy="confirm-delete-btn" onClick={controller.confirmDeleteNote}>Confirm Delete</button>

      <button data-cy="tag-click-btn" onClick={() => controller.handleTagClick('test-tag')}>Tag Click</button>
      <button data-cy="clear-tag-btn" onClick={controller.handleClearTagFilter}>Clear Tag</button>
      <button data-cy="search-result-click-btn" onClick={() => controller.handleSearchResultClick({
        id: '3',
        title: 'Search Result',
        description: 'Desc',
        tags: [],
        created_at: '2023-01-01',
        updated_at: '2023-01-01',
        user_id: 'test-user',
        rank: 1,
        headline: 'Headline'
      })}>Search Result Click</button>
      <button data-cy="invalidate-btn" onClick={controller.invalidateNotes}>Invalidate</button>

      <button data-cy="remove-tag-btn" onClick={() => controller.handleRemoveTagFromNote('1', 'tag1')}>Remove Tag</button>

      <button data-cy="register-editor-ref-btn" onClick={() => controller.registerNoteEditorRef(editorRef)}>Register Editor Ref</button>
    </div>
  )
}

interface MockQueryBuilder {
  select: SinonStub
  order: SinonStub
  range: SinonStub
  contains: SinonStub
  or: SinonStub
  insert: SinonStub
  update: SinonStub
  delete: SinonStub
  eq: SinonStub
  single: SinonStub
  then: (resolve: (res: { data: unknown[]; error: null; count: number }) => void) => void
}

describe('useNoteAppController', () => {
  let mockSupabase: SupabaseClient
  let mockQueryBuilder: MockQueryBuilder

  beforeEach(() => {
    flushSpy = cy.stub()
    mockQueryBuilder = {
      select: cy.stub().returnsThis(),
      order: cy.stub().returnsThis(),
      range: cy.stub().returnsThis(),
      contains: cy.stub().returnsThis(),
      or: cy.stub().returnsThis(),
      insert: cy.stub().returnsThis(),
      update: cy.stub().returnsThis(),
      delete: cy.stub().returnsThis(),
      eq: cy.stub().returnsThis(),
      single: cy.stub().resolves({ data: { id: '1', title: 'Saved Note', tags: [] }, error: null }),
      then: (resolve: (res: { data: unknown[]; error: null; count: number }) => void) => resolve({ data: [], error: null, count: 0 })
    }

    mockSupabase = {
      auth: {
        getSession: cy.stub().resolves({ data: { session: null }, error: null }),
        onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } }),
        signInWithOAuth: cy.stub().resolves({ error: null }),
        signInWithPassword: cy.stub().resolves({ data: { user: { id: 'test-user' } }, error: null }),
        signOut: cy.stub().resolves({ error: null }),
      },
      from: cy.stub().returns(mockQueryBuilder),
      rpc: cy.stub().resolves({ data: [], error: null })
    } as unknown as SupabaseClient
  })

  it('flushes pending editor save when selecting a note while editing', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="register-editor-ref-btn"]').click()

    cy.get('[data-cy="select-note-btn"]').click()

    cy.then(() => {
      expect(flushSpy).to.have.been.called
    })
  })

  it('flushes pending editor save when clicking a search result while editing', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="register-editor-ref-btn"]').click()

    cy.get('[data-cy="search-result-click-btn"]').click()

    cy.then(() => {
      expect(flushSpy).to.have.been.called
    })
  })

  it('flushes pending editor save when creating a note while editing', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="register-editor-ref-btn"]').click()

    cy.get('[data-cy="create-note-btn"]').click()

    cy.then(() => {
      expect(flushSpy).to.have.been.called
    })
  })

  it('flushes pending editor save when clicking a tag while editing', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="register-editor-ref-btn"]').click()

    cy.get('[data-cy="tag-click-btn"]').click()

    cy.then(() => {
      expect(flushSpy).to.have.been.called
    })
  })

  it('flushes pending editor save when selecting null (back) while editing', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="register-editor-ref-btn"]').click()

    cy.get('[data-cy="select-null-note-btn"]').click()

    cy.then(() => {
      expect(flushSpy).to.have.been.called
    })
  })

  it('initializes with loading state and checks auth', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="loading"]').should('contain', 'false')
    cy.get('[data-cy="user"]').should('contain', 'no-user')

    cy.wrap(mockSupabase.auth.getSession).should('have.been.called')
  })

  it('handles login', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="login-btn"]').click()
    cy.get('[data-cy="user"]').should('contain', 'test-user')
  })

  it('handles skip auth', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="skip-auth-btn"]').click()
    cy.get('[data-cy="user"]').should('contain', 'test-user')
  })

  it('handles sign out', () => {
    ; (mockSupabase.auth.getSession as unknown as SinonStub).resolves({ data: { session: { user: { id: 'test-user' } } }, error: null })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="sign-out-btn"]').click()
    cy.get('[data-cy="user"]').should('contain', 'no-user')
    cy.wrap(mockSupabase.auth.signOut).should('have.been.called')
  })

  it('handles google login', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="google-login-btn"]').click()
    cy.wrap(mockSupabase.auth.signInWithOAuth).should('have.been.called')
  })

  it('handles create note state', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="create-note-btn"]').click()
    cy.get('[data-cy="isEditing"]').should('contain', 'true')
    cy.get('[data-cy="selectedNote-id"]').should('contain', 'none')
  })

  it('handles edit note state', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="isEditing"]').should('contain', 'true')
    cy.get('[data-cy="selectedNote-id"]').should('contain', '1')
  })

  it('handles select note', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="select-note-btn"]').click()
    cy.get('[data-cy="isEditing"]').should('contain', 'false')
    cy.get('[data-cy="selectedNote-id"]').should('contain', '2')
  })

  it('handles search', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="search-btn"]').click()
    cy.get('[data-cy="searchQuery"]').should('contain', 'test query')
  })

  it('handles save note (create)', () => {
    // We need user to be logged in for save to work
    ; (mockSupabase.auth.getSession as unknown as SinonStub).resolves({ data: { session: { user: { id: 'test-user' } } }, error: null })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    // Wait for auth check
    cy.get('[data-cy="user"]').should('contain', 'test-user')

    cy.get('[data-cy="create-note-btn"]').click()
    cy.get('[data-cy="save-note-btn"]').click()

    // Check if insert was called
    cy.wrap(mockQueryBuilder.insert).should('have.been.called')
  })

  it('handles delete note', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="delete-note-btn"]').click()
    cy.get('[data-cy="deleteDialogOpen"]').should('contain', 'true')

    cy.get('[data-cy="confirm-delete-btn"]').click()

    // Check if delete was called
    cy.wrap(mockQueryBuilder.delete).should('have.been.called')
    cy.wrap(mockQueryBuilder.eq).should('have.been.calledWith', 'id', '1')
  })

  it('handles tag filtering', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="tag-click-btn"]').click()
    cy.get('[data-cy="filterByTag"]').should('contain', 'test-tag')

    cy.get('[data-cy="clear-tag-btn"]').click()
    cy.get('[data-cy="filterByTag"]').should('contain', 'none')
  })

  it('handles search result click', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="search-result-click-btn"]').click()
    cy.get('[data-cy="selectedNote-id"]').should('contain', '3')
    cy.get('[data-cy="isEditing"]').should('contain', 'false')
  })

  it('handles invalidation', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="invalidate-btn"]').click()
    // Hard to assert invalidation directly without spying on queryClient, 
    // but ensuring it doesn't crash is a good start
  })

  it('handles remove tag from note', () => {
    // Ensure user is logged in
    ; (mockSupabase.auth.getSession as unknown as SinonStub).resolves({ data: { session: { user: { id: 'test-user' } } }, error: null })

    // Mock supabase response for notes query
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockQueryBuilder.then = (resolve: (res: any) => void) => resolve({
      data: [{ id: '1', title: 'Note 1', tags: ['tag1', 'tag2'], user_id: 'test-user' }],
      error: null,
      count: 1
    })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    // Wait for user and notes to load
    cy.get('[data-cy="user"]').should('contain', 'test-user')

    // Select the note first to verify state update
    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="selectedNote-id"]').should('contain', '1')

    cy.get('[data-cy="remove-tag-btn"]').click()

    // Check if update was called with removed tag
    cy.wrap(mockQueryBuilder.update).should('have.been.called')

    // Check if selected note tags updated in UI
    cy.get('[data-cy="selectedNote-tags"]').should('contain', 'tag2')
    cy.get('[data-cy="selectedNote-tags"]').should('not.contain', 'tag1')
  })

  it('handles remove tag error', () => {
    ; (mockSupabase.auth.getSession as unknown as SinonStub).resolves({ data: { session: { user: { id: 'test-user' } } }, error: null })

    // Mock notes query success
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    mockQueryBuilder.then = (resolve: (res: any) => void) => resolve({
      data: [{ id: '1', title: 'Note 1', tags: ['tag1', 'tag2'], user_id: 'test-user' }],
      error: null,
      count: 1
    })

    // Mock update failure
    const updateStub = cy.stub().returns({
      eq: cy.stub().returns({
        select: cy.stub().returns({
          single: cy.stub().rejects(new Error('Update failed'))
        })
      })
    })
    mockQueryBuilder.update = updateStub

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="remove-tag-btn"]').click()

    cy.wrap(updateStub).should('have.been.called')
  })

  it('handles null search results', () => {
    // Mock rpc to return null data
    (mockSupabase.rpc as unknown as SinonStub).resolves({ data: null, error: null })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    // Trigger search
    cy.get('[data-cy="search-btn"]').click()

    // Check that it doesn't crash
    cy.get('[data-cy="searchQuery"]').should('contain', 'test query')
  })
})
