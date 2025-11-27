// @ts-check
import React from 'react'
import { ImportDialog } from '@/components/ImportDialog'

describe('ImportDialog Component', () => {
  let mockOnImport
  let mockOnOpenChange

  beforeEach(() => {
    mockOnImport = cy.stub().as('onImport')
    mockOnOpenChange = cy.stub().as('onOpenChange')
  })

  it('renders when open prop is true', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    cy.contains('Import from Evernote').should('be.visible')
    cy.contains('Drag and drop .enex files or click to browse').should('be.visible')
  })

  it('does not render when open prop is false', () => {
    cy.mount(
      <ImportDialog 
        open={false} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    cy.contains('Import from Evernote').should('not.exist')
  })

  it('shows drag and drop zone', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    cy.contains('Drag & drop .enex files').should('be.visible')
    cy.contains('or click to browse').should('be.visible')
    cy.get('input[type="file"]').should('exist').and('have.attr', 'accept', '.enex')
  })

  it('accepts file selection via input', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    // Create a test file
    const fileName = 'test-notes.enex'
    const fileContent = '<?xml version="1.0"?><en-export></en-export>'
    
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from(fileContent),
      fileName: fileName,
      mimeType: 'application/xml'
    }, { force: true })
    
    // Should show selected file
    cy.contains('Selected files (1)').should('be.visible')
    cy.contains(fileName).should('be.visible')
  })

  it('filters non-.enex files', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    // Try to select a non-.enex file
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('test content'),
      fileName: 'test.txt',
      mimeType: 'text/plain'
    }, { force: true })
    
    // Should not show selected files
    cy.contains('Selected files').should('not.exist')
  })

  it('allows selecting multiple files', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    const files = [
      {
        contents: Cypress.Buffer.from('<?xml version="1.0"?><en-export></en-export>'),
        fileName: 'notes1.enex',
        mimeType: 'application/xml'
      },
      {
        contents: Cypress.Buffer.from('<?xml version="1.0"?><en-export></en-export>'),
        fileName: 'notes2.enex',
        mimeType: 'application/xml'
      }
    ]
    
    cy.get('input[type="file"]').selectFile(files, { force: true })
    
    cy.contains('Selected files (2)').should('be.visible')
    cy.contains('notes1.enex').should('be.visible')
    cy.contains('notes2.enex').should('be.visible')
  })

  it('allows removing selected files', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    // Select a file
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('<?xml version="1.0"?><en-export></en-export>'),
      fileName: 'test.enex',
      mimeType: 'application/xml'
    }, { force: true })
    
    cy.contains('test.enex').should('be.visible')
    
    // Remove the file
    cy.contains('test.enex').parent().parent().find('button').click()
    
    cy.contains('Selected files').should('not.exist')
  })

  it('shows duplicate strategy options', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    cy.contains('Import Settings').should('be.visible')
    cy.contains('What to do with duplicate notes?').should('be.visible')
    cy.contains('Add [duplicate] prefix to title').should('be.visible')
    cy.contains('Skip duplicate notes').should('be.visible')
    cy.contains('Replace existing notes').should('be.visible')
  })

  it('allows changing duplicate strategy', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    // Default should be 'prefix' - check by data-state attribute
    cy.get('#prefix').should('have.attr', 'data-state', 'checked')
    
    // Change to 'skip'
    cy.get('#skip').click()
    cy.get('#skip').should('have.attr', 'data-state', 'checked')
    cy.get('#prefix').should('have.attr', 'data-state', 'unchecked')
    
    // Change to 'replace'
    cy.get('#replace').click()
    cy.get('#replace').should('have.attr', 'data-state', 'checked')
    cy.get('#skip').should('have.attr', 'data-state', 'unchecked')
  })

  it('disables import button when no files selected', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    cy.contains('button', 'Import').should('be.disabled')
  })

  it('enables import button when files are selected', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('<?xml version="1.0"?><en-export></en-export>'),
      fileName: 'test.enex',
      mimeType: 'application/xml'
    }, { force: true })
    
    cy.contains('button', 'Import (1)').should('not.be.disabled')
  })

  it('calls onImport with files and settings when import is clicked', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    // Select file
    cy.get('input[type="file"]').selectFile({
      contents: Cypress.Buffer.from('<?xml version="1.0"?><en-export></en-export>'),
      fileName: 'test.enex',
      mimeType: 'application/xml'
    }, { force: true })
    
    // Change duplicate strategy
    cy.get('#skip').click()
    
    // Click import
    cy.contains('button', 'Import (1)').click()
    
    cy.get('@onImport').should('have.been.calledOnce')
    cy.get('@onOpenChange').should('have.been.calledWith', false)
  })

  it('calls onOpenChange when cancel is clicked', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    cy.contains('button', 'Cancel').click()
    
    cy.get('@onOpenChange').should('have.been.calledWith', false)
  })

  it('shows drag over state', () => {
    cy.mount(
      <ImportDialog 
        open={true} 
        onOpenChange={mockOnOpenChange}
        onImport={mockOnImport}
      />
    )
    
    // Initially shows "Drag & drop"
    cy.contains('Drag & drop .enex files').should('be.visible')
    
    // Find the drop zone div (the one with border-2 border-dashed)
    cy.get('input[type="file"]').parent()
      .trigger('dragover', { force: true })
      .wait(100) // Wait for state update
    
    // Should show "Drop files here" after dragover
    cy.contains('Drop files here').should('be.visible')
  })
})

