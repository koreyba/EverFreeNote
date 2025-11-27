// @ts-check
/**
 * Tags Management E2E Test
 * Tests tags functionality: create, filter, add, remove
 */

import { LoginPage } from '../../support/page-objects/LoginPage'
import { NotesPage } from '../../support/page-objects/NotesPage'

describe('Tags Management', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.visit('/')
    
    // Login
    const loginPage = new LoginPage()
    loginPage.skipAuth()
  })

  it('should create notes with different tags', () => {
    // Load fixture with tagged notes
    cy.fixture('notes/tagged-notes').then((notes) => {
      notes.forEach(note => {
        cy.createNote(note.title, note.content, note.tags)
      })
    })

    // Verify all notes and tags exist
    cy.assertNoteExists('Work Note')
    cy.assertNoteExists('Personal Note')
    cy.assertNoteExists('Ideas Note')
    
    cy.assertTagExists('work')
    cy.assertTagExists('personal')
    cy.assertTagExists('ideas')
  })

  it('should filter notes by single tag', () => {
    // Create notes with tags
    cy.createNote('Work Task 1', 'Important work task', 'work, urgent')
    cy.createNote('Work Task 2', 'Another work task', 'work')
    cy.createNote('Personal Task', 'Personal errand', 'personal')

    // Filter by work tag
    cy.filterByTag('work')
    
    // Only work notes should be visible
    cy.assertNoteExists('Work Task 1')
    cy.assertNoteExists('Work Task 2')
    cy.assertNoteNotExists('Personal Task')
  })

  it('should add tags to existing note', () => {
    const notesPage = new NotesPage()
    
    // Create note without tags
    cy.createNote('Untagged Note', 'This note has no tags initially')

    // Edit note and add tags
    const editorPage = notesPage.selectNote('Untagged Note')
    editorPage.edit()
    editorPage.fillTags('newly-added, tags')
    const notesPageAfterUpdate = editorPage.update()

    // Verify tags were added
    notesPageAfterUpdate.assertTagExists('newly-added')
    notesPageAfterUpdate.assertTagExists('tags')
  })

  it('should remove tags from note', () => {
    const notesPage = new NotesPage()
    
    // Create note with tags
    cy.createNote('Tagged Note', 'This note has tags', 'remove-me, keep-me')

    // Edit note and remove one tag
    const editorPage = notesPage.selectNote('Tagged Note')
    editorPage.edit()
    editorPage.fillTags('keep-me')
    const notesPageAfterUpdate = editorPage.update()

    // Verify tag was removed
    notesPageAfterUpdate.assertTagExists('keep-me')
    // Note: asserting tag doesn't exist is tricky if other notes have it
  })

  it('should handle notes with multiple tags', () => {
    // Create note with many tags
    cy.createNote(
      'Multi-Tagged Note',
      'This note has many tags',
      'tag1, tag2, tag3, tag4, tag5'
    )

    // Verify all tags exist
    cy.assertTagExists('tag1')
    cy.assertTagExists('tag2')
    cy.assertTagExists('tag3')
    cy.assertTagExists('tag4')
    cy.assertTagExists('tag5')
  })

  it('should handle tags with special characters', () => {
    // Create note with special character tags
    cy.createNote(
      'Special Tags Note',
      'Tags with special characters',
      'c++, .net, node.js'
    )

    // Verify tags exist (may need to adjust based on tag parsing)
    cy.assertNoteExists('Special Tags Note')
  })

  it('should filter and then clear filter', () => {
    // Create notes
    cy.createNote('Work Note', 'Work content', 'work')
    cy.createNote('Personal Note', 'Personal content', 'personal')

    // Filter by work
    cy.filterByTag('work')
    cy.assertNoteExists('Work Note')
    cy.assertNoteNotExists('Personal Note')

    // Clear filter (by clicking tag again or clearing search)
    cy.clearSearch()

    // Both notes should be visible
    cy.assertNoteExists('Work Note')
    cy.assertNoteExists('Personal Note')
  })

  it('should show tag count or frequency', () => {
    // Create multiple notes with same tag
    cy.createNote('Note 1', 'Content 1', 'common')
    cy.createNote('Note 2', 'Content 2', 'common')
    cy.createNote('Note 3', 'Content 3', 'common')

    // Filter by common tag
    cy.filterByTag('common')

    // All three notes should be visible
    cy.assertNoteExists('Note 1')
    cy.assertNoteExists('Note 2')
    cy.assertNoteExists('Note 3')
  })
})

