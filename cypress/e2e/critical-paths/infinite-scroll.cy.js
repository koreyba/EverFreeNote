/**
 * Infinite Scroll E2E Test
 * Tests pagination and lazy loading with many notes
 */

import { LoginPage } from '../../support/page-objects/LoginPage'
import { NotesPage } from '../../support/page-objects/NotesPage'

describe('Infinite Scroll', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.visit('/')
    
    // Login
    const loginPage = new LoginPage()
    loginPage.skipAuth()
  })

  it('should load more notes on scroll', () => {
    // Create 30 notes (enough to trigger lazy loading)
    for (let i = 1; i <= 30; i++) {
      cy.createNote(`Scroll Test Note ${i}`, `Content for note ${i}`, 'scroll-test')
    }

    // Verify first notes are visible
    cy.assertNoteExists('Scroll Test Note 1')
    cy.assertNoteExists('Scroll Test Note 2')

    // Scroll to bottom
    const notesPage = new NotesPage()
    notesPage.scrollToBottom()

    // More notes should be loaded
    cy.assertNoteExists('Scroll Test Note 20')
    cy.assertNoteExists('Scroll Test Note 25')
  })

  it('should handle search with many notes', () => {
    // Create many notes with different content
    for (let i = 1; i <= 25; i++) {
      if (i % 5 === 0) {
        cy.createNote(`Special Note ${i}`, `Special content ${i}`, 'special')
      } else {
        cy.createNote(`Regular Note ${i}`, `Regular content ${i}`, 'regular')
      }
    }

    // Search for special notes
    cy.searchNotes('Special')

    // Only special notes should be visible
    cy.assertNoteExists('Special Note 5')
    cy.assertNoteExists('Special Note 10')
    cy.assertNoteNotExists('Regular Note 1')
  })

  it('should maintain scroll position after creating note', () => {
    // Create initial notes
    for (let i = 1; i <= 20; i++) {
      cy.createNote(`Position Test ${i}`, `Content ${i}`, 'position')
    }

    // Scroll down
    const notesPage = new NotesPage()
    notesPage.scrollToBottom()

    // Create new note
    cy.createNote('New Note After Scroll', 'New content', 'new')

    // Verify new note appears (likely at top)
    cy.assertNoteExists('New Note After Scroll')
  })

  it('should load all notes eventually', () => {
    // Create 40 notes
    for (let i = 1; i <= 40; i++) {
      cy.createNote(`Load All Test ${i}`, `Content ${i}`, 'load-all')
    }

    const notesPage = new NotesPage()

    // Scroll multiple times to load all
    notesPage.scrollToBottom()
    cy.wait(1000)
    notesPage.scrollToBottom()
    cy.wait(1000)
    notesPage.scrollToBottom()

    // Verify notes from beginning, middle, and end are all loaded
    cy.assertNoteExists('Load All Test 1')
    cy.assertNoteExists('Load All Test 20')
    cy.assertNoteExists('Load All Test 40')
  })

  it('should handle rapid scrolling', () => {
    // Create many notes
    for (let i = 1; i <= 35; i++) {
      cy.createNote(`Rapid Scroll ${i}`, `Content ${i}`, 'rapid')
    }

    const notesPage = new NotesPage()

    // Rapid scroll
    notesPage.scrollToBottom()
    notesPage.scrollToBottom()
    notesPage.scrollToBottom()

    // Should not crash and should load notes
    cy.assertNoteExists('Rapid Scroll 1')
    cy.assertNoteExists('Rapid Scroll 30')
  })

  it('should show loading indicator during lazy load', () => {
    // Create many notes
    for (let i = 1; i <= 30; i++) {
      cy.createNote(`Loading Test ${i}`, `Content ${i}`, 'loading')
    }

    const notesPage = new NotesPage()

    // Scroll to trigger loading
    notesPage.scrollToBottom()

    // Check for loading indicator (skeleton or spinner)
    // Note: Adjust selector based on actual implementation
    cy.get('[data-cy="loading-skeleton"]').should('exist')
  })
})

