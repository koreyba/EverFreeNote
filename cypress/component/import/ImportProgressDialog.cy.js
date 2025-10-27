import React from 'react'
import { ImportProgressDialog } from '@/components/ImportProgressDialog'

describe('ImportProgressDialog Component', () => {
  let mockOnClose

  beforeEach(() => {
    mockOnClose = cy.stub().as('onClose')
  })

  it('does not render when open is false', () => {
    cy.mount(
      <ImportProgressDialog 
        open={false}
        progress={{ currentFile: 0, totalFiles: 0, currentNote: 0, totalNotes: 0, fileName: '' }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('Importing from Evernote').should('not.exist')
  })

  it('renders progress dialog when open and importing', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 2, 
          currentNote: 5, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('Importing from Evernote').should('be.visible')
    cy.contains('Please wait while we import your notes...').should('be.visible')
  })

  it('shows file progress when multiple files', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 3, 
          currentNote: 5, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('Files').should('be.visible')
    cy.contains('1 of 3').should('be.visible')
  })

  it('hides file progress when single file', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 5, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    // Should not show file progress for single file
    cy.contains('1 of 1').should('not.exist')
  })

  it('shows current file name', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 2, 
          currentNote: 5, 
          totalNotes: 10, 
          fileName: 'my-notes.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('Current file:').should('be.visible')
    cy.contains('my-notes.enex').should('be.visible')
  })

  it('shows note progress', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 7, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('Notes').should('be.visible')
    cy.contains('7 of 10').should('be.visible')
    cy.contains('70%').should('be.visible')
  })

  it('shows progress bars', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 2, 
          totalFiles: 4, 
          currentNote: 5, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    // Should have progress bars (role="progressbar")
    cy.get('[role="progressbar"]').should('have.length.at.least', 1)
  })

  it('shows loading spinner during import', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 5, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    // Should have loading spinner (Loader2 with animate-spin)
    cy.get('.animate-spin').should('exist')
  })

  it('prevents closing during import', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 5, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    // Dialog should be open
    cy.get('[role="dialog"]').should('exist')
    
    // Should show "Importing from Evernote" title during import
    cy.contains('Importing from Evernote').should('be.visible')
    
    // DialogFooter with Close button should not exist during import
    cy.get('[role="dialog"]').find('footer').should('not.exist')
  })

  it('shows success result', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 10, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={{
          success: 10,
          errors: 0,
          failedNotes: [],
          message: 'Successfully imported 10 notes'
        }}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('Import Complete').should('be.visible')
    cy.contains('Your import has finished.').should('be.visible')
    cy.contains('10').should('be.visible') // Success count
    cy.contains('Successful').should('be.visible')
    cy.contains('Successfully imported 10 notes').should('be.visible')
  })

  it('shows partial success result', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 10, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={{
          success: 7,
          errors: 3,
          failedNotes: [
            { title: 'Note 1', error: 'Error 1' },
            { title: 'Note 2', error: 'Error 2' },
            { title: 'Note 3', error: 'Error 3' }
          ],
          message: 'Successfully imported 7 notes'
        }}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('Import Complete').should('be.visible')
    cy.contains('7').should('be.visible') // Success count
    cy.contains('3').should('be.visible') // Error count
    cy.contains('Successfully imported 7 notes').should('be.visible')
  })

  it('shows failed notes details', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 10, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={{
          success: 8,
          errors: 2,
          failedNotes: [
            { title: 'Failed Note 1', error: 'Database error' },
            { title: 'Failed Note 2', error: 'Invalid content' }
          ],
          message: 'Successfully imported 8 notes'
        }}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('View failed notes (2)').should('be.visible')
    
    // Expand details
    cy.contains('View failed notes (2)').click()
    
    cy.contains('Failed Note 1').should('be.visible')
    cy.contains('Database error').should('be.visible')
    cy.contains('Failed Note 2').should('be.visible')
    cy.contains('Invalid content').should('be.visible')
  })

  it('shows complete failure result', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 5, 
          totalNotes: 5, 
          fileName: 'test.enex' 
        }}
        result={{
          success: 0,
          errors: 5,
          failedNotes: [],
          message: 'All imports failed'
        }}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('Import Complete').should('be.visible')
    cy.contains('0').should('be.visible') // Success count
    cy.contains('5').should('be.visible') // Error count
    cy.contains('All imports failed').should('be.visible')
    
    // Should show error icon (XCircle)
    cy.get('.text-destructive').should('exist')
  })

  it('allows closing after completion', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 10, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={{
          success: 10,
          errors: 0,
          failedNotes: [],
          message: 'Successfully imported 10 notes'
        }}
        onClose={mockOnClose}
      />
    )
    
    cy.contains('button', 'Close').should('be.visible').click()
    
    cy.get('@onClose').should('have.been.calledOnce')
  })

  it('shows success icon on successful import', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 10, 
          totalNotes: 10, 
          fileName: 'test.enex' 
        }}
        result={{
          success: 10,
          errors: 0,
          failedNotes: [],
          message: 'Successfully imported 10 notes'
        }}
        onClose={mockOnClose}
      />
    )
    
    // Should have CheckCircle2 icon with green color
    cy.get('.text-green-600').should('exist')
  })

  it('calculates progress percentage correctly', () => {
    cy.mount(
      <ImportProgressDialog 
        open={true}
        progress={{ 
          currentFile: 1, 
          totalFiles: 1, 
          currentNote: 3, 
          totalNotes: 4, 
          fileName: 'test.enex' 
        }}
        result={null}
        onClose={mockOnClose}
      />
    )
    
    // 3/4 = 75%
    cy.contains('75%').should('be.visible')
  })
})

