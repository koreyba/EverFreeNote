import React from 'react'
import { ExportSelectionDialog } from '@ui/web/components/ExportSelectionDialog'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { NoteService } from '@core/services/notes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

describe('ExportSelectionDialog', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any
  let getNotesStub: SinonStub

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: cy.stub().resolves({ data: { user: { id: 'test-user-id' } } }),
      },
    }

    // Stub NoteService.prototype.getNotes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const proto = NoteService.prototype as any
    if (proto.getNotes && proto.getNotes.restore) {
        proto.getNotes.restore()
    }
    getNotesStub = cy.stub(NoteService.prototype, 'getNotes')
  })

  it('renders loading state initially', () => {
    getNotesStub.callsFake(() => new Promise(resolve => setTimeout(() => resolve({ notes: [], totalCount: 0, hasMore: false }), 100)))

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ExportSelectionDialog
          open={true}
          onOpenChange={cy.spy()}
          onExport={cy.spy()}
        />
      </SupabaseTestProvider>
    )

    cy.contains('Loading notes...').should('be.visible')
  })

  it('renders empty state when no notes', () => {
    getNotesStub.resolves({ notes: [], totalCount: 0, hasMore: false })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ExportSelectionDialog
          open={true}
          onOpenChange={cy.spy()}
          onExport={cy.spy()}
        />
      </SupabaseTestProvider>
    )

    cy.contains('You do not have any notes to export yet').should('be.visible')
  })

  it('renders notes and handles selection', () => {
    const notes = [
      { id: '1', title: 'Note 1', description: 'Desc 1', updated_at: new Date().toISOString() },
      { id: '2', title: 'Note 2', description: 'Desc 2', updated_at: new Date().toISOString() },
    ]
    getNotesStub.resolves({ notes, totalCount: 2, hasMore: false })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ExportSelectionDialog
          open={true}
          onOpenChange={cy.spy()}
          onExport={cy.spy()}
        />
      </SupabaseTestProvider>
    )

    cy.contains('Note 1').should('be.visible')
    cy.contains('Note 2').should('be.visible')
    
    // Select one note
    cy.contains('Note 1').click()
    cy.contains('Selected: 1 of 2').should('be.visible')
    
    // Select all
    cy.contains('button', 'Select all').click()
    cy.contains('Selected: 2 of 2').should('be.visible')
    cy.contains('button', 'Clear selection').should('be.visible')
  })

  it('filters notes by search', () => {
    const notes = [
      { id: '1', title: 'Apple', description: 'Fruit', updated_at: new Date().toISOString() },
      { id: '2', title: 'Banana', description: 'Fruit', updated_at: new Date().toISOString() },
    ]
    getNotesStub.resolves({ notes, totalCount: 2, hasMore: false })

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ExportSelectionDialog
          open={true}
          onOpenChange={cy.spy()}
          onExport={cy.spy()}
        />
      </SupabaseTestProvider>
    )

    cy.get('input[placeholder*="Search"]').type('Apple')
    cy.contains('Apple').should('be.visible')
    cy.contains('Banana').should('not.exist')
  })

  it('calls onExport with correct selection', () => {
    const notes = [
      { id: '1', title: 'Note 1', description: 'Desc 1', updated_at: new Date().toISOString() },
    ]
    getNotesStub.resolves({ notes, totalCount: 1, hasMore: false })
    const onExportSpy = cy.spy().as('onExport')

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ExportSelectionDialog
          open={true}
          onOpenChange={cy.spy()}
          onExport={onExportSpy}
        />
      </SupabaseTestProvider>
    )

    cy.contains('Note 1').click()
    cy.contains('button', 'Export').click()
    
    cy.get('@onExport').should('have.been.calledWith', {
      selectAll: false,
      selectedIds: ['1'],
      deselectedIds: [],
      totalCount: 1
    })
  })
})
