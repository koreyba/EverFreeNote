// ***********************************************
// This example commands.js shows you how to
// create various custom commands and overwrite
// existing commands.
//
// For more comprehensive examples of custom
// commands please read more here:
// https://on.cypress.io/custom-commands
// ***********************************************

/// <reference types="cypress" />

// ============================================
// E2E Custom Commands
// ============================================

/**
 * Login with skip authentication
 */
Cypress.Commands.add('login', () => {
  cy.visit('/', { timeout: 30000 })
  cy.contains('Skip Authentication', { timeout: 15000 }).should('be.visible').click()
  cy.contains('New Note', { timeout: 15000 }).should('be.visible')
})

/**
 * Create a note with title, content, and optional tags
 * @param {string} title - Note title
 * @param {string} content - Note content
 * @param {string} tags - Comma-separated tags (optional)
 */
Cypress.Commands.add('createNote', (title, content, tags = '') => {
  cy.contains('New Note').click()
  cy.get('input[placeholder="Note title"]').type(title)
  // Tiptap editor - find the contenteditable div
  cy.get('[data-cy="editor-content"] .tiptap').click().type(content)
  if (tags) {
    cy.get('input[placeholder="work, personal, ideas"]').type(tags)
  }
  cy.contains('button', 'Save').click()
  cy.contains('Note created successfully', { timeout: 15000 }).should('be.visible')
  cy.wait(1000)
})

/**
 * Delete a note by title
 * @param {string} title - Note title to delete
 */
Cypress.Commands.add('deleteNote', (title) => {
  cy.contains(title).click()
  cy.wait(500)
  cy.contains('button', 'Delete').click()
  cy.contains('Note deleted successfully', { timeout: 10000 }).should('be.visible')
})

/**
 * Delete all notes (cleanup)
 * Note: This is a placeholder - implement based on app capabilities
 */
Cypress.Commands.add('deleteAllNotes', () => {
  // Implementation depends on if we have "Delete All" feature
  // For now, this is a placeholder
  cy.log('deleteAllNotes: Not implemented yet')
})

/**
 * Search for notes
 * @param {string} query - Search query
 */
Cypress.Commands.add('searchNotes', (query) => {
  if (query) {
    cy.get('input[placeholder*="Search"]').clear().type(query)
  } else {
    cy.get('input[placeholder*="Search"]').clear()
  }
  cy.wait(500)
})

/**
 * Clear search
 */
Cypress.Commands.add('clearSearch', () => {
  cy.get('input[placeholder*="Search"]').clear()
  cy.wait(500)
})

/**
 * Filter notes by tag
 * @param {string} tag - Tag name
 */
Cypress.Commands.add('filterByTag', (tag) => {
  cy.contains(tag).click()
  cy.wait(1000) // Wait for filter to apply and search to clear
})

/**
 * Toggle theme (light/dark)
 */
Cypress.Commands.add('toggleTheme', () => {
  cy.get('button').filter(':has(svg.lucide-sun, svg.lucide-moon)').click()
  cy.wait(300)
})

/**
 * Import ENEX file
 * @param {string} filename - ENEX filename in fixtures/enex/
 * @param {'prefix'|'skip'} strategy - Duplicate handling strategy
 */
Cypress.Commands.add('importEnex', (filename, strategy = 'prefix') => {
  cy.contains('Import from Evernote').click()
  cy.get('input[type="file"]').selectFile(`cypress/fixtures/enex/${filename}`, { force: true })
  
  if (strategy === 'prefix') {
    cy.get('#prefix').click()
  } else {
    cy.get('#skip').click()
  }
  
  cy.contains('button', 'Import').click()
  cy.contains('Import completed', { timeout: 30000 }).should('be.visible')
  cy.contains('button', 'Close').click()
})

// ============================================
// Assertion Commands
// ============================================

/**
 * Assert that a note exists in the list
 * @param {string} title - Note title
 */
Cypress.Commands.add('assertNoteExists', (title) => {
  cy.contains(title).should('exist').scrollIntoView().should('be.visible')
})

/**
 * Assert that a note does not exist
 * @param {string} title - Note title
 */
Cypress.Commands.add('assertNoteNotExists', (title) => {
  cy.contains(title).should('not.exist')
})

/**
 * Assert that a tag exists
 * @param {string} tag - Tag name
 */
Cypress.Commands.add('assertTagExists', (tag) => {
  cy.contains(tag).should('be.visible')
})

// ============================================
// API Commands (for faster test data creation)
// ============================================

/**
 * Create multiple notes via API (much faster than UI)
 * @param {Array} notes - Array of note objects {title, content, tags}
 */
Cypress.Commands.add('createNotesViaAPI', (notes) => {
  // Use Supabase REST API directly
  cy.request({
    method: 'GET',
    url: 'http://localhost:54321/auth/v1/user',
    headers: {
      'apikey': Cypress.env('SUPABASE_ANON_KEY') || 'REDACTED_JWT',
      'Authorization': `Bearer ${Cypress.env('SUPABASE_ANON_KEY') || 'REDACTED_JWT'}`
    },
    failOnStatusCode: false
  }).then((userResponse) => {
    // Get user from session storage or use skip-auth user
    cy.window().then((win) => {
      // Get session from localStorage
      const session = JSON.parse(win.localStorage.getItem('sb-localhost-auth-token') || '{}')
      const accessToken = session?.access_token
      const userId = session?.user?.id
      
      if (!userId || !accessToken) {
        cy.log('No user session found, skipping API note creation')
        return
      }
      
      // Create notes via Supabase REST API
      const notesData = notes.map(note => ({
        user_id: userId,
        title: note.title || 'Untitled',
        description: note.content || '',
        tags: Array.isArray(note.tags) ? note.tags : (note.tags ? note.tags.split(',').map(t => t.trim()).filter(t => t) : []),
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      }))
      
      cy.request({
        method: 'POST',
        url: 'http://localhost:54321/rest/v1/notes',
        headers: {
          'apikey': Cypress.env('SUPABASE_ANON_KEY') || 'REDACTED_JWT',
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json',
          'Prefer': 'return=minimal'
        },
        body: notesData
      })
    })
  })
})

/**
 * Delete all notes for current user via API (cleanup)
 */
Cypress.Commands.add('deleteAllNotesViaAPI', () => {
  cy.window().then((win) => {
    const session = JSON.parse(win.localStorage.getItem('sb-localhost-auth-token') || '{}')
    const accessToken = session?.access_token
    const userId = session?.user?.id
    
    if (!userId || !accessToken) {
      cy.log('No user session found, skipping cleanup')
      return
    }
    
    cy.request({
      method: 'DELETE',
      url: `http://localhost:54321/rest/v1/notes?user_id=eq.${userId}`,
      headers: {
        'apikey': Cypress.env('SUPABASE_ANON_KEY') || 'REDACTED_JWT',
        'Authorization': `Bearer ${accessToken}`
      }
    })
  })
})

// For component testing
import { mount } from 'cypress/react'

Cypress.Commands.add('mount', mount)

// Custom command for rich text editor testing
Cypress.Commands.add('typeInRichEditor', (content) => {
  cy.get('.ql-editor').clear().type(content)
})

Cypress.Commands.add('applyRichTextFormatting', (buttonText) => {
  cy.contains('button', buttonText).click()
})

Cypress.Commands.add('selectTextInEditor', (startOffset, endOffset) => {
  cy.get('.ql-editor').then($editor => {
    const editor = $editor[0]
    const range = document.createRange()
    const textNode = editor.firstChild

    if (textNode && textNode.nodeType === Node.TEXT_NODE) {
      range.setStart(textNode, startOffset)
      range.setEnd(textNode, endOffset)

      const selection = window.getSelection()
      selection.removeAllRanges()
      selection.addRange(range)
    }
  })
})
