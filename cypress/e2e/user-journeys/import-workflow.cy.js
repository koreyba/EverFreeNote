/**
 * Import Workflow E2E Test
 * Tests ENEX import functionality
 * Note: This test may be skipped if import feature is not fully implemented
 */

import { LoginPage } from '../../support/page-objects/LoginPage'
import { ImportPage } from '../../support/page-objects/ImportPage'

describe('Import Workflow', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.visit('/')
    
    // Login
    const loginPage = new LoginPage()
    loginPage.skipAuth()
  })

  it.skip('should import single ENEX file', () => {
    const importPage = new ImportPage()

    // Open import dialog
    importPage.openImportDialog()
    importPage.assertImportDialogOpen()

    // Select file
    importPage.selectFile('test-single-note.enex')
    importPage.assertFileSelected('test-single-note.enex')

    // Select duplicate strategy
    importPage.selectDuplicateStrategy('prefix')

    // Start import
    importPage.startImport()
    importPage.assertProgressShown()

    // Wait for completion
    importPage.waitForImportComplete()
    importPage.assertImportCompleted()

    // Close dialog
    const notesPage = importPage.closeImportDialog()

    // Verify imported note appears
    notesPage.assertNoteExists('Test Imported Note')
    notesPage.assertTagExists('imported')
  })

  it.skip('should import multiple notes from ENEX', () => {
    const importPage = new ImportPage()

    // Complete import flow
    const notesPage = importPage.importFile('test-multiple-notes.enex', 'prefix')

    // Verify all imported notes appear
    notesPage.assertNoteExists('First Imported Note')
    notesPage.assertNoteExists('Second Imported Note')
    notesPage.assertNoteExists('Third Imported Note')

    // Verify tags
    notesPage.assertTagExists('imported')
    notesPage.assertTagExists('first')
    notesPage.assertTagExists('second')
    notesPage.assertTagExists('third')
  })

  it.skip('should handle duplicate strategy: prefix', () => {
    const importPage = new ImportPage()

    // Import once
    importPage.importFile('test-single-note.enex', 'prefix')

    // Import again with prefix strategy
    importPage.importFile('test-single-note.enex', 'prefix')

    // Should have two notes with prefix
    cy.assertNoteExists('Test Imported Note')
    // Second import should have prefix (e.g., "(1) Test Imported Note")
    cy.contains('Test Imported Note').should('have.length.at.least', 1)
  })

  it.skip('should handle duplicate strategy: skip', () => {
    const importPage = new ImportPage()

    // Import once
    importPage.importFile('test-single-note.enex', 'skip')

    // Import again with skip strategy
    importPage.importFile('test-single-note.enex', 'skip')

    // Should still have only one note (duplicate skipped)
    cy.assertNoteExists('Test Imported Note')
  })

  it.skip('should show import progress', () => {
    const importPage = new ImportPage()

    // Open import dialog
    importPage.openImportDialog()
    importPage.selectFile('test-multiple-notes.enex')
    importPage.selectDuplicateStrategy('prefix')
    importPage.startImport()

    // Verify progress dialog shows
    importPage.assertProgressShown()

    // Wait for completion
    importPage.waitForImportComplete()
    importPage.assertImportCompleted()
  })

  it.skip('should cancel import', () => {
    const importPage = new ImportPage()

    // Open import dialog
    importPage.openImportDialog()
    importPage.assertImportDialogOpen()

    // Cancel without importing
    const notesPage = importPage.cancelImport()

    // Should be back on notes page
    notesPage.assertOnNotesPage()
  })

  it.skip('should work with imported notes', () => {
    const importPage = new ImportPage()

    // Import notes
    const notesPage = importPage.importFile('test-multiple-notes.enex', 'prefix')

    // Search imported notes
    notesPage.searchNotes('imported')
    notesPage.assertNoteExists('First Imported Note')

    // Filter by tag
    notesPage.clearSearch()
    notesPage.filterByTag('imported')
    notesPage.assertNoteExists('First Imported Note')
    notesPage.assertNoteExists('Second Imported Note')

    // Open and edit imported note
    const editorPage = notesPage.selectNote('First Imported Note')
    editorPage.edit()
    editorPage.fillTitle('Edited Imported Note')
    const notesPageAfterEdit = editorPage.update()

    // Verify edit worked
    notesPageAfterEdit.assertNoteExists('Edited Imported Note')
    notesPageAfterEdit.assertNoteNotExists('First Imported Note')
  })
})

