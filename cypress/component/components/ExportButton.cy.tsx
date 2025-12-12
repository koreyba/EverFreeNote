import React from 'react'
import { ExportButton } from '@/components/ExportButton'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { ExportService } from '@/lib/enex/export-service'
import { NoteService } from '@core/services/notes'

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type SinonStub = any

describe('ExportButton', () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let mockSupabase: any
  let exportNotesStub: SinonStub
  let getNotesStub: SinonStub

  beforeEach(() => {
    mockSupabase = {
      auth: {
        getUser: cy.stub().resolves({ data: { user: { id: 'test-user-id' } } }),
      },
    }

    // Stub NoteService.prototype.getNotes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const noteProto = NoteService.prototype as any
    if (noteProto.getNotes && noteProto.getNotes.restore) {
        noteProto.getNotes.restore()
    }
    getNotesStub = cy.stub(NoteService.prototype, 'getNotes')
    getNotesStub.resolves({ notes: [], totalCount: 0, hasMore: false })

    // Stub ExportService.prototype.exportNotes
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const exportProto = ExportService.prototype as any
    if (exportProto.exportNotes && exportProto.exportNotes.restore) {
        exportProto.exportNotes.restore()
    }
    exportNotesStub = cy.stub(ExportService.prototype, 'exportNotes')
  })

  it('renders export button', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ExportButton />
      </SupabaseTestProvider>
    )

    cy.contains('button', 'Export .enex file').should('be.visible')
  })

  it('opens dialog on click', () => {
    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ExportButton />
      </SupabaseTestProvider>
    )

    cy.contains('button', 'Export .enex file').click()
    cy.contains('Export notes to .enex').should('be.visible')
  })

  it('handles export flow', () => {
    const notes = [
      { id: '1', title: 'Note 1', description: 'Desc 1', updated_at: new Date().toISOString() },
    ]
    getNotesStub.resolves({ notes, totalCount: 1, hasMore: false })
    
    exportNotesStub.resolves({
        blob: new Blob(['test'], { type: 'application/xml' }),
        fileName: 'export.enex'
    })

    // Mock URL.createObjectURL and URL.revokeObjectURL
    // We need to check if they are already stubbed
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((URL.createObjectURL as any).restore) (URL.createObjectURL as any).restore()
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    if ((URL.revokeObjectURL as any).restore) (URL.revokeObjectURL as any).restore()

    const createObjectURLStub = cy.stub(URL, 'createObjectURL').returns('blob:test')
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const revokeObjectURLStub = cy.stub(URL, 'revokeObjectURL')

    cy.mount(
      <SupabaseTestProvider supabase={mockSupabase}>
        <ExportButton />
      </SupabaseTestProvider>
    )

    cy.contains('button', 'Export .enex file').click()
    
    // Wait for notes to load
    cy.contains('Note 1').should('be.visible')
    cy.contains('Note 1').click()
    
    // Verify selection
    cy.contains('Selected: 1').should('be.visible')

    cy.get('[role="dialog"]').contains('button', 'Export').click({ force: true })

    // Should show progress dialog
    cy.contains('Export in progress').should('be.visible')
    
    // Should call export service
    cy.wrap(exportNotesStub).should('have.been.called')
    
    // Should download file (check URL.createObjectURL)
    cy.wrap(createObjectURLStub).should('have.been.called')
  })
})
