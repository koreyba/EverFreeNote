/**
 * Complete User Workflow E2E Test
 * Tests the full end-to-end user journey:
 * Login → Create Note → Edit Note → Search → Filter by Tag → Delete → Logout
 */

import { LoginPage } from '../../support/page-objects/LoginPage'

describe('Complete User Workflow', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should complete full user journey from login to logout', () => {
    // Step 1: Login
    const loginPage = new LoginPage()
    loginPage.assertOnLoginPage()
    
    const notesPage = loginPage.skipAuth()
    notesPage.assertOnNotesPage()
    notesPage.assertLoggedIn()

    // Step 2: Create a note with rich text
    const editorPage = notesPage.createNewNote()
    editorPage.assertOnEditorPage()
    
    editorPage
      .fillTitle('My Complete Workflow Note')
      .fillContent('This is a test note with some content')
      .fillTags('workflow, test, e2e')
    
    // Apply formatting
    editorPage.selectAllContent().applyBold()
    
    const notesPageAfterCreate = editorPage.save()
    notesPageAfterCreate.assertNoteExists('My Complete Workflow Note')
    notesPageAfterCreate.assertTagExists('workflow')

    // Step 3: Edit the note
    const editorPageEdit = notesPageAfterCreate.selectNote('My Complete Workflow Note')
    editorPageEdit.edit()
    
    editorPageEdit
      .fillTitle('Updated Workflow Note')
      .fillTags('workflow, test, updated')
    
    const notesPageAfterUpdate = editorPageEdit.update()
    notesPageAfterUpdate.assertNoteExists('Updated Workflow Note')
    notesPageAfterUpdate.assertNoteNotExists('My Complete Workflow Note')

    // Step 4: Search for the note
    notesPageAfterUpdate.searchNotes('Workflow')
    notesPageAfterUpdate.assertNoteExists('Updated Workflow Note')

    // Clear search
    notesPageAfterUpdate.clearSearch()

    // Step 5: Filter by tag
    notesPageAfterUpdate.filterByTag('workflow')
    notesPageAfterUpdate.assertNoteExists('Updated Workflow Note')

    // Step 6: Delete the note
    const editorPageDelete = notesPageAfterUpdate.selectNote('Updated Workflow Note')
    const notesPageAfterDelete = editorPageDelete.delete()
    notesPageAfterDelete.assertNoteNotExists('Updated Workflow Note')

    // Step 7: Logout
    const loginPageAfterLogout = notesPageAfterDelete.logout()
    loginPageAfterLogout.assertOnLoginPage()
  })

  it('should handle multiple notes and search functionality', () => {
    // Login
    cy.login()

    // Create multiple notes using custom command
    cy.createNote('JavaScript Guide', 'Learn JavaScript basics', 'javascript, programming')
    cy.createNote('Python Tutorial', 'Python programming tutorial', 'python, programming')
    cy.createNote('React Components', 'Building reusable React components', 'react, javascript')

    // Verify all notes exist
    cy.assertNoteExists('JavaScript Guide')
    cy.assertNoteExists('Python Tutorial')
    cy.assertNoteExists('React Components')

    // Search for JavaScript
    cy.searchNotes('JavaScript')
    cy.assertNoteExists('JavaScript Guide')
    cy.assertNoteNotExists('Python Tutorial')

    // Clear search
    cy.clearSearch()

    // All notes should be visible again
    cy.assertNoteExists('JavaScript Guide')
    cy.assertNoteExists('Python Tutorial')
    cy.assertNoteExists('React Components')

    // Search by programming
    cy.searchNotes('programming')
    cy.assertNoteExists('Python Tutorial')
    cy.assertNoteNotExists('React Components')
  })

  it('should handle authentication flow and UI elements', () => {
    // Using Page Objects
    const loginPage = new LoginPage()
    
    // Verify login page elements
    loginPage.assertOnLoginPage()
    loginPage.assertGoogleAuthAvailable()

    // Login
    const notesPage = loginPage.skipAuth()
    
    // Verify main interface
    notesPage.assertOnNotesPage()
    notesPage.assertLoggedIn()

    // Logout
    const loginPageAfterLogout = notesPage.logout()
    loginPageAfterLogout.assertOnLoginPage()
  })
})

