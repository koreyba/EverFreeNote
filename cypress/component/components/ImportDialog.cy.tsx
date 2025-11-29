import React from 'react'
import { ImportDialog } from '@/components/ImportDialog'
import { DuplicateStrategy } from '@/lib/enex/types'

describe('ImportDialog', () => {
  const onOpenChangeSpy = cy.spy().as('onOpenChange')
  const onImportSpy = cy.spy().as('onImport')

  beforeEach(() => {
    onOpenChangeSpy.resetHistory()
    onImportSpy.resetHistory()
  })

  it('renders correctly when open', () => {
    cy.mount(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChangeSpy}
        onImport={onImportSpy}
      />
    )

    cy.contains('Import from Evernote').should('be.visible')
    cy.contains('Drag and drop .enex files').should('be.visible')
    cy.contains('Import Settings').should('be.visible')
    cy.contains('What to do with duplicate notes?').should('be.visible')
    cy.get('button').contains('Import').should('be.disabled')
  })

  it('handles file selection via input', () => {
    cy.mount(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChangeSpy}
        onImport={onImportSpy}
      />
    )

    // Create a dummy file
    const file = new File(['content'], 'notes.enex', { type: 'application/xml' })
    
    // Trigger file selection
    cy.get('input[type="file"]').selectFile({
      contents: file,
      fileName: 'notes.enex',
      mimeType: 'application/xml'
    }, { force: true }) // force because input is hidden

    cy.contains('Selected files (1)').should('be.visible')
    cy.contains('notes.enex').should('be.visible')
    cy.get('button').contains('Import (1)').should('not.be.disabled')
  })

  it('filters non-enex files', () => {
    cy.mount(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChangeSpy}
        onImport={onImportSpy}
      />
    )

    const file = new File(['content'], 'image.png', { type: 'image/png' })
    
    cy.get('input[type="file"]').selectFile({
      contents: file,
      fileName: 'image.png',
      mimeType: 'image/png'
    }, { force: true })

    cy.contains('Selected files').should('not.exist')
    cy.get('button').contains('Import').should('be.disabled')
  })

  it('handles drag and drop', () => {
    cy.mount(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChangeSpy}
        onImport={onImportSpy}
      />
    )

    const file = new File(['content'], 'dragged.enex', { type: 'application/xml' })

    cy.get('.border-dashed').trigger('dragover')
    cy.get('.border-dashed').should('have.class', 'border-primary')
    
    cy.get('.border-dashed').trigger('dragleave')
    cy.get('.border-dashed').should('not.have.class', 'border-primary')

    cy.get('.border-dashed').selectFile({
      contents: file,
      fileName: 'dragged.enex',
      mimeType: 'application/xml'
    }, { action: 'drag-drop' })

    cy.contains('dragged.enex').should('be.visible')
  })

  it('removes selected files', () => {
    cy.mount(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChangeSpy}
        onImport={onImportSpy}
      />
    )

    const file1 = new File(['c1'], 'note1.enex', { type: 'application/xml' })
    const file2 = new File(['c2'], 'note2.enex', { type: 'application/xml' })

    cy.get('input[type="file"]').selectFile([
      { contents: file1, fileName: 'note1.enex' },
      { contents: file2, fileName: 'note2.enex' }
    ], { force: true })

    cy.contains('Selected files (2)').should('be.visible')
    
    // Remove first file
    cy.get('button[aria-label="Remove note1.enex"]').click()
    
    cy.contains('Selected files (1)').should('be.visible')
    cy.contains('note1.enex').should('not.exist')
    cy.contains('note2.enex').should('be.visible')
  })

  it('changes duplicate strategy', () => {
    cy.mount(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChangeSpy}
        onImport={onImportSpy}
      />
    )

    // Default is prefix
    cy.get('button[role="radio"][value="prefix"]').should('have.attr', 'aria-checked', 'true')

    // Change to skip
    cy.get('label[for="skip"]').click()
    cy.get('button[role="radio"][value="skip"]').should('have.attr', 'aria-checked', 'true')
    
    // Change to replace
    cy.get('label[for="replace"]').click()
    cy.get('button[role="radio"][value="replace"]').should('have.attr', 'aria-checked', 'true')
  })

  it('calls onImport with correct arguments', () => {
    cy.mount(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChangeSpy}
        onImport={onImportSpy}
      />
    )

    const file = new File(['content'], 'test.enex', { type: 'application/xml' })
    
    cy.get('input[type="file"]').selectFile({
      contents: file,
      fileName: 'test.enex'
    }, { force: true })

    // Select 'skip' strategy
    cy.get('label[for="skip"]').click()

    cy.get('button').contains('Import').click()

    cy.get('@onImport').should('have.been.calledOnce')
    cy.get('@onImport').should((spy: any) => {
      const args = spy.firstCall.args
      expect(args[0]).to.have.length(1)
      expect(args[0][0].name).to.equal('test.enex')
      expect(args[1]).to.deep.equal({ duplicateStrategy: 'skip' })
    })

    cy.get('@onOpenChange').should('have.been.calledWith', false)
  })

  it('closes on cancel', () => {
    cy.mount(
      <ImportDialog
        open={true}
        onOpenChange={onOpenChangeSpy}
        onImport={onImportSpy}
      />
    )

    cy.contains('Cancel').click()
    cy.get('@onOpenChange').should('have.been.calledWith', false)
  })
})
