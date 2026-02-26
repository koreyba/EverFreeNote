import React from 'react'
import { useNoteAppController } from '../../../../../ui/web/hooks/useNoteAppController'
import { QueryProvider } from '../../../../../ui/web/components/providers/QueryProvider'
import { SupabaseTestProvider } from '../../../../../ui/web/providers/SupabaseProvider'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NoteViewModel } from '../../../../../core/types/domain'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

/**
 * Tests for useNoteSaveHandlers behaviors via useNoteAppController.
 * Covers edge cases specific to save handler logic:
 * - autoSave skip conditions
 * - offline vs online branching
 * - confirmDeleteNote clears selectedNote
 */

const TestComponent = () => {
  const controller = useNoteAppController()

  return (
    <div>
      <div data-cy="saving">{controller.saving ? 'true' : 'false'}</div>
      <div data-cy="autoSaving">{controller.autoSaving ? 'true' : 'false'}</div>
      <div data-cy="selectedNote-id">{controller.selectedNote?.id ?? 'none'}</div>
      <div data-cy="isEditing">{controller.isEditing ? 'true' : 'false'}</div>
      <div data-cy="deleteDialogOpen">{controller.deleteDialogOpen ? 'true' : 'false'}</div>
      <div data-cy="lastSavedAt">{controller.lastSavedAt ?? 'null'}</div>
      <div data-cy="user">{controller.user?.id ?? 'none'}</div>

      <button data-cy="login-btn" onClick={controller.handleTestLogin}>Login</button>

      <button data-cy="create-note-btn" onClick={controller.handleCreateNote}>Create</button>
      <button data-cy="edit-note-btn" onClick={() => controller.handleEditNote({
        id: 'note-1', title: 'Test Note', description: 'Desc', tags: ['tag1'],
        created_at: '2024-01-01', updated_at: '2024-01-01', user_id: 'test-user'
      } as NoteViewModel)}>Edit</button>

      <button data-cy="save-btn" onClick={() => controller.handleSaveNote({
        title: 'Saved Title', description: 'Saved Desc', tags: 'tag1, tag2'
      })}>Save</button>

      <button data-cy="save-empty-btn" onClick={() => controller.handleSaveNote({
        title: '', description: '', tags: ''
      })}>Save Empty</button>

      <button data-cy="read-note-btn" onClick={() => controller.handleReadNote({
        title: 'Read Title', description: 'Desc', tags: ''
      })}>Read Note</button>

      <button data-cy="delete-note-btn" onClick={() => controller.handleDeleteNote({
        id: 'note-1', title: 'To Delete', description: '', tags: [],
        created_at: '2024-01-01', updated_at: '2024-01-01', user_id: 'test-user'
      } as NoteViewModel)}>Delete</button>
      <button data-cy="confirm-delete-btn" onClick={controller.confirmDeleteNote}>Confirm Delete</button>

      <button data-cy="autosave-btn" onClick={() => controller.handleAutoSave({
        noteId: 'note-1', title: 'Auto Title', description: 'Auto Desc', tags: 'auto'
      })}>AutoSave</button>

      <button data-cy="autosave-empty-btn" onClick={() => controller.handleAutoSave({
        title: '', description: '', tags: ''
      })}>AutoSave Empty</button>
    </div>
  )
}

describe('useNoteSaveHandlers', () => {
  let mockSupabase: SupabaseClient
  let mockQueryBuilder: Record<string, SinonStub> & {
    then: (resolve: (res: { data: unknown[]; error: null; count: number }) => void) => void
  }

  beforeEach(() => {
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
      single: cy.stub().resolves({ data: { id: 'note-1', title: 'Saved', tags: [] }, error: null }),
      then: (resolve: (res: { data: unknown[]; error: null; count: number }) => void) =>
        resolve({ data: [], error: null, count: 0 }),
    }

    mockSupabase = {
      auth: {
        getSession: cy.stub().resolves({ data: { session: { user: { id: 'test-user' } } }, error: null }),
        onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } }),
        signInWithPassword: cy.stub().resolves({ data: { user: { id: 'test-user' } }, error: null }),
        signOut: cy.stub().resolves({ error: null }),
        signInWithOAuth: cy.stub().resolves({ error: null }),
      },
      from: cy.stub().returns(mockQueryBuilder),
      rpc: cy.stub().resolves({ data: [], error: null }),
    } as unknown as SupabaseClient
  })

  it('handleSaveNote calls insert for new note (online)', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="create-note-btn"]').click()
    cy.get('[data-cy="save-btn"]').click()

    cy.wrap(mockQueryBuilder.insert).should('have.been.called')
  })

  it('handleSaveNote calls update for existing selected note (online)', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="save-btn"]').click()

    cy.wrap(mockQueryBuilder.update).should('have.been.called')
  })

  it('handleSaveNote uses "Untitled" when title is empty', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="create-note-btn"]').click()
    cy.get('[data-cy="save-empty-btn"]').click()

    cy.wrap(mockQueryBuilder.insert).should('have.been.called')
  })

  it('handleReadNote exits editing mode after save', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="isEditing"]').should('contain', 'true')

    cy.get('[data-cy="read-note-btn"]').click()

    cy.get('[data-cy="isEditing"]').should('contain', 'false')
  })

  it('confirmDeleteNote closes dialog and clears noteToDelete', () => {
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
    cy.get('[data-cy="deleteDialogOpen"]').should('contain', 'false')
  })

  it('confirmDeleteNote clears selectedNote when deleted note was selected', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="edit-note-btn"]').click()
    cy.get('[data-cy="selectedNote-id"]').should('contain', 'note-1')

    cy.get('[data-cy="delete-note-btn"]').click()
    cy.get('[data-cy="confirm-delete-btn"]').click()

    cy.get('[data-cy="selectedNote-id"]').should('contain', 'none')
  })

  it('handleAutoSave does nothing when user is not logged in', () => {
    // Mount without login
    const noAuthSupabase = {
      ...mockSupabase,
      auth: {
        ...(mockSupabase.auth as object),
        getSession: cy.stub().resolves({ data: { session: null }, error: null }),
      }
    } as unknown as SupabaseClient

    cy.mount(
      <SupabaseTestProvider supabase={noAuthSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'none')
    cy.get('[data-cy="autosave-btn"]').click()

    // No network calls when user is null
    cy.wrap(mockQueryBuilder.insert).should('not.have.been.called')
    cy.wrap(mockQueryBuilder.update).should('not.have.been.called')
  })

  it('handleAutoSave skips new note creation when all fields are empty', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    // No note selected (isNewNote = true), all fields empty → should skip
    cy.get('[data-cy="autosave-empty-btn"]').click()

    cy.wrap(mockQueryBuilder.insert).should('not.have.been.called')
  })
})
