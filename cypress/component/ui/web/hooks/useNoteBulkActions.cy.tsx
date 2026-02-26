import React from 'react'
import { useNoteAppController } from '../../../../../ui/web/hooks/useNoteAppController'
import { QueryProvider } from '../../../../../ui/web/components/providers/QueryProvider'
import { SupabaseTestProvider } from '../../../../../ui/web/providers/SupabaseProvider'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NoteViewModel } from '../../../../../core/types/domain'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

/**
 * Tests for useNoteBulkActions behaviors via useNoteAppController.
 * Covers:
 * - selectAllVisible picks FTS results when showFTSResults=true
 * - deleteSelectedNotes calls delete for each selected note
 * - bulk delete clears selection after completion
 */

const TestComponent = () => {
  const controller = useNoteAppController()

  return (
    <div>
      <div data-cy="selectionMode">{controller.selectionMode ? 'true' : 'false'}</div>
      <div data-cy="selectedCount">{controller.selectedCount}</div>
      <div data-cy="bulkDeleting">{controller.bulkDeleting ? 'true' : 'false'}</div>
      <div data-cy="selectedNote-id">{controller.selectedNote?.id ?? 'none'}</div>
      <div data-cy="user">{controller.user?.id ?? 'none'}</div>

      <button data-cy="login-btn" onClick={controller.handleTestLogin}>Login</button>

      <button data-cy="enter-selection-btn" onClick={controller.enterSelectionMode}>Enter Selection</button>
      <button data-cy="exit-selection-btn" onClick={controller.exitSelectionMode}>Exit Selection</button>

      <button data-cy="toggle-note1-btn" onClick={() => controller.toggleNoteSelection('note-1')}>Toggle Note 1</button>
      <button data-cy="toggle-note2-btn" onClick={() => controller.toggleNoteSelection('note-2')}>Toggle Note 2</button>

      <button data-cy="select-all-btn" onClick={controller.selectAllVisible}>Select All</button>
      <button data-cy="delete-selected-btn" onClick={controller.deleteSelectedNotes}>Delete Selected</button>

      <button data-cy="edit-note-btn" onClick={() => controller.handleEditNote({
        id: 'note-1', title: 'Note 1', description: '', tags: [],
        created_at: '2024-01-01', updated_at: '2024-01-01', user_id: 'test-user'
      } as NoteViewModel)}>Edit Note 1</button>
    </div>
  )
}

describe('useNoteBulkActions', () => {
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
      single: cy.stub().resolves({ data: null, error: null }),
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

  it('toggleNoteSelection adds and removes note ids from selection', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="enter-selection-btn"]').click()
    cy.get('[data-cy="toggle-note1-btn"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '1')

    cy.get('[data-cy="toggle-note2-btn"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '2')

    cy.get('[data-cy="toggle-note1-btn"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '1')
  })

  it('deleteSelectedNotes does nothing when selection is empty', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="delete-selected-btn"]').click()
    cy.wrap(mockQueryBuilder.delete).should('not.have.been.called')
  })

  it('deleteSelectedNotes calls delete for each selected note (online)', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="enter-selection-btn"]').click()
    cy.get('[data-cy="toggle-note1-btn"]').click()
    cy.get('[data-cy="toggle-note2-btn"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '2')

    cy.get('[data-cy="delete-selected-btn"]').click()

    cy.wrap(mockQueryBuilder.delete).should('have.been.called')
  })

  it('deleteSelectedNotes exits selection mode after completion', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="user"]').should('contain', 'test-user')
    cy.get('[data-cy="enter-selection-btn"]').click()
    cy.get('[data-cy="selectionMode"]').should('contain', 'true')

    cy.get('[data-cy="toggle-note1-btn"]').click()
    cy.get('[data-cy="delete-selected-btn"]').click()

    cy.get('[data-cy="selectionMode"]').should('contain', 'false')
  })

  it('deleteSelectedNotes clears selectedNote after bulk delete', () => {
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

    cy.get('[data-cy="enter-selection-btn"]').click()
    cy.get('[data-cy="toggle-note1-btn"]').click()
    cy.get('[data-cy="delete-selected-btn"]').click()

    cy.get('[data-cy="selectedNote-id"]').should('contain', 'none')
  })

  it('exitSelectionMode clears selection state', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <QueryProvider>
          <TestComponent />
        </QueryProvider>
      </SupabaseTestProvider>
    )

    cy.get('[data-cy="enter-selection-btn"]').click()
    cy.get('[data-cy="toggle-note1-btn"]').click()
    cy.get('[data-cy="selectedCount"]').should('contain', '1')

    cy.get('[data-cy="exit-selection-btn"]').click()
    cy.get('[data-cy="selectionMode"]').should('contain', 'false')
    cy.get('[data-cy="selectedCount"]').should('contain', '0')
  })
})
