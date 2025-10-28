/**
 * Search Integration E2E Test
 * Tests search UI, filters, and highlighting (not API)
 * API testing is covered separately
 */

import { LoginPage } from '../../support/page-objects/LoginPage'

describe('Search Integration', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.visit('/')
    
    // Login
    const loginPage = new LoginPage()
    loginPage.skipAuth()
  })

  it('should search notes by title and content', () => {
    // Create test notes
    cy.createNote('FTS Test Note', 'This is a full-text search test with keywords', 'testing, fts')
    cy.createNote('Another Note', 'Different content here', 'other')

    // Search by title
    cy.searchNotes('FTS Test')
    cy.assertNoteExists('FTS Test Note')
    cy.assertNoteNotExists('Another Note')

    // Clear and search by content
    cy.clearSearch()
    cy.searchNotes('keywords')
    cy.assertNoteExists('FTS Test Note')
    cy.assertNoteNotExists('Another Note')
  })

  it('should handle empty search gracefully', () => {
    // Create a note
    cy.createNote('Test Note', 'Test content', 'test')

    // Search then clear should show all notes
    cy.searchNotes('something')
    cy.clearSearch()
    cy.assertNoteExists('Test Note')
  })

  it('should filter by tags', () => {
    // Create notes with different tags
    cy.createNote('Work Note', 'Work content', 'work, important')
    cy.createNote('Personal Note', 'Personal content', 'personal')
    cy.createNote('Ideas Note', 'Ideas content', 'ideas')

    // Filter by work tag
    cy.filterByTag('work')
    cy.assertNoteExists('Work Note')
    cy.assertNoteNotExists('Personal Note')
    cy.assertNoteNotExists('Ideas Note')
  })

  it.skip('should combine search with tag filters', () => {
    // Create notes
    cy.createNote('JavaScript Work', 'JavaScript at work', 'work, javascript')
    cy.createNote('Python Work', 'Python at work', 'work, python')
    cy.createNote('JavaScript Personal', 'JavaScript hobby', 'personal, javascript')

    // Search for JavaScript
    cy.searchNotes('JavaScript')
    cy.assertNoteExists('JavaScript Work')
    cy.assertNoteExists('JavaScript Personal')
    cy.assertNoteNotExists('Python Work')

    // Then filter by work tag (this should clear search)
    cy.filterByTag('work')
    // Verify search was cleared
    cy.get('input[placeholder*="Search"]').should('have.value', '')
    cy.wait(1000)
    cy.assertNoteExists('JavaScript Work')
    cy.assertNoteNotExists('JavaScript Personal')
    cy.assertNoteNotExists('Python Work')
  })

  it('should support multi-language search', () => {
    // Create Russian note
    cy.createNote('Русская заметка', 'Это тестовая заметка на русском языке', 'russian')
    
    // Create English note
    cy.createNote('English Note', 'This is a test note in English language', 'english')

    // Search in Russian
    cy.searchNotes('тестовая')
    cy.assertNoteExists('Русская заметка')
    cy.assertNoteNotExists('English Note')

    // Clear and search in English
    cy.clearSearch()
    cy.searchNotes('English')
    cy.assertNoteExists('English Note')
    cy.assertNoteNotExists('Русская заметка')
  })

  it('should clear search and show all notes', () => {
    // Create multiple notes
    cy.createNote('Note 1', 'Content 1', 'tag1')
    cy.createNote('Note 2', 'Content 2', 'tag2')
    cy.createNote('Note 3', 'Content 3', 'tag3')

    // Search to filter
    cy.searchNotes('Note 1')
    cy.assertNoteExists('Note 1')
    cy.assertNoteNotExists('Note 2')

    // Clear search
    cy.clearSearch()

    // All notes should be visible
    cy.assertNoteExists('Note 1')
    cy.assertNoteExists('Note 2')
    cy.assertNoteExists('Note 3')
  })

  it('should handle special characters in search', () => {
    // Create note with special characters
    cy.createNote('Special @#$% Note', 'Content with special chars: @#$%^&*()', 'special')

    // Search with special characters
    cy.searchNotes('@#$%')
    cy.assertNoteExists('Special @#$% Note')
  })

  it('should search case-insensitively', () => {
    // Create note
    cy.createNote('CaseSensitive Note', 'Mixed CASE content', 'test')

    // Search with different cases
    cy.searchNotes('casesensitive')
    cy.assertNoteExists('CaseSensitive Note')

    cy.clearSearch()
    cy.searchNotes('CASESENSITIVE')
    cy.assertNoteExists('CaseSensitive Note')

    cy.clearSearch()
    cy.searchNotes('CaSeSenSiTive')
    cy.assertNoteExists('CaseSensitive Note')
  })
})

