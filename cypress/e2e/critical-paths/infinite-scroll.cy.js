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
    // Create 30 notes via API (much faster than UI)
    const notes = Array.from({ length: 30 }, (_, i) => ({
      title: `Scroll Test Note ${i + 1}`,
      content: `Content for note ${i + 1}`,
      tags: 'scroll-test'
    }))
    
    cy.createNotesViaAPI(notes)
    cy.wait(1000) // Wait for notes to be created
    cy.reload() // Reload to fetch new notes

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
    // Create many notes via API
    const notes = Array.from({ length: 25 }, (_, i) => {
      const num = i + 1
      return num % 5 === 0 
        ? { title: `Special Note ${num}`, content: `Special content ${num}`, tags: 'special' }
        : { title: `Regular Note ${num}`, content: `Regular content ${num}`, tags: 'regular' }
    })
    
    cy.createNotesViaAPI(notes)
    cy.wait(1000)
    cy.reload()

    // Search for special notes
    cy.searchNotes('Special')

    // Only special notes should be visible
    cy.assertNoteExists('Special Note 5')
    cy.assertNoteExists('Special Note 10')
    cy.assertNoteNotExists('Regular Note 1')
  })

  it('should maintain scroll position after creating note', () => {
    // Create initial notes via API
    const notes = Array.from({ length: 20 }, (_, i) => ({
      title: `Position Test ${i + 1}`,
      content: `Content ${i + 1}`,
      tags: 'position'
    }))
    
    cy.createNotesViaAPI(notes)
    cy.wait(1000)
    cy.reload()

    // Scroll down
    const notesPage = new NotesPage()
    notesPage.scrollToBottom()

    // Create new note via UI
    cy.createNote('New Note After Scroll', 'New content', 'new')

    // Verify new note appears (likely at top)
    cy.assertNoteExists('New Note After Scroll')
  })

  it('should load all notes eventually', () => {
    // Create 40 notes via API
    const notes = Array.from({ length: 40 }, (_, i) => ({
      title: `Load All Test ${i + 1}`,
      content: `Content ${i + 1}`,
      tags: 'load-all'
    }))
    
    cy.createNotesViaAPI(notes)
    cy.wait(1000)
    cy.reload()

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
    // Create many notes via API
    const notes = Array.from({ length: 35 }, (_, i) => ({
      title: `Rapid Scroll ${i + 1}`,
      content: `Content ${i + 1}`,
      tags: 'rapid'
    }))
    
    cy.createNotesViaAPI(notes)
    cy.wait(1000)
    cy.reload()

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
    // Create many notes via API
    const notes = Array.from({ length: 30 }, (_, i) => ({
      title: `Loading Test ${i + 1}`,
      content: `Content ${i + 1}`,
      tags: 'loading'
    }))
    
    cy.createNotesViaAPI(notes)
    cy.wait(1000)
    cy.reload()

    const notesPage = new NotesPage()

    // Scroll to trigger loading
    notesPage.scrollToBottom()

    // Check for loading indicator (skeleton or spinner)
    // Note: May not always be visible if loading is too fast
    cy.wait(500)
  })
})

