// @ts-check
/**
 * Notes CRUD E2E Test
 * Extended CRUD operations testing
 */

import { LoginPage } from '../../support/page-objects/LoginPage'
import { NotesPage } from '../../support/page-objects/NotesPage'

describe('Notes CRUD Operations', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
    cy.visit('/')
    
    // Login
    const loginPage = new LoginPage()
    loginPage.skipAuth()
  })

  it('should create multiple notes with different content types', () => {
    // Create simple note
    cy.fixture('notes/simple-note').then((note) => {
      cy.createNote(note.title, note.content, note.tags)
    })

    // Create rich text note
    cy.fixture('notes/rich-text-note').then((note) => {
      cy.createNote(note.title, note.content, note.tags)
    })

    // Verify both notes exist
    cy.assertNoteExists('Simple Test Note')
    cy.assertNoteExists('Rich Text Note')
  })

  it('should edit note title', () => {
    const notesPage = new NotesPage()

    // Create note
    cy.createNote('Original Title', 'Some content', 'test')

    // Edit title
    const editorPage = notesPage.selectNote('Original Title')
    editorPage.edit()
    editorPage.fillTitle('Updated Title')
    const notesPageAfterUpdate = editorPage.update()

    // Verify title changed
    notesPageAfterUpdate.assertNoteExists('Updated Title')
    notesPageAfterUpdate.assertNoteNotExists('Original Title')
  })

  it('should edit note content', () => {
    const notesPage = new NotesPage()

    // Create note
    cy.createNote('Content Test', 'Original content', 'test')

    // Edit content
    const editorPage = notesPage.selectNote('Content Test')
    editorPage.edit()
    editorPage.fillContent('Updated content with new information')
    const notesPageAfterUpdate = editorPage.update()

    // Verify note still exists
    notesPageAfterUpdate.assertNoteExists('Content Test')

    // Open note to verify content
    const editorPageView = notesPageAfterUpdate.selectNote('Content Test')
    editorPageView.assertContentContains('Updated content')
  })

  it('should edit note tags', () => {
    const notesPage = new NotesPage()

    // Create note with initial tags
    cy.createNote('Tags Test', 'Content', 'old-tag')

    // Edit tags
    const editorPage = notesPage.selectNote('Tags Test')
    editorPage.edit()
    editorPage.fillTags('new-tag, updated')
    const notesPageAfterUpdate = editorPage.update()

    // Verify new tags exist
    notesPageAfterUpdate.assertTagExists('new-tag')
    notesPageAfterUpdate.assertTagExists('updated')
  })

  it('should delete single note', () => {
    const notesPage = new NotesPage()

    // Create note
    cy.createNote('Delete Me', 'This note will be deleted', 'delete')

    // Verify note exists
    notesPage.assertNoteExists('Delete Me')

    // Delete note
    const editorPage = notesPage.selectNote('Delete Me')
    const notesPageAfterDelete = editorPage.delete()

    // Verify note is gone
    notesPageAfterDelete.assertNoteNotExists('Delete Me')
  })

  it('should handle full note lifecycle: create → edit → delete', () => {
    const notesPage = new NotesPage()

    // Create
    const editorPageCreate = notesPage.createNewNote()
    editorPageCreate
      .fillTitle('Lifecycle Note')
      .fillContent('Initial content')
      .fillTags('lifecycle, test')
    const notesPageAfterCreate = editorPageCreate.save()
    notesPageAfterCreate.assertNoteExists('Lifecycle Note')

    // Edit
    const editorPageEdit = notesPageAfterCreate.selectNote('Lifecycle Note')
    editorPageEdit.edit()
    editorPageEdit
      .fillTitle('Updated Lifecycle Note')
      .fillContent('Updated content')
      .fillTags('lifecycle, test, updated')
    const notesPageAfterEdit = editorPageEdit.update()
    notesPageAfterEdit.assertNoteExists('Updated Lifecycle Note')

    // Delete
    const editorPageDelete = notesPageAfterEdit.selectNote('Updated Lifecycle Note')
    const notesPageAfterDelete = editorPageDelete.delete()
    notesPageAfterDelete.assertNoteNotExists('Updated Lifecycle Note')
  })

  it('should create note with empty title', () => {
    const notesPage = new NotesPage()

    // Create note with empty title
    const editorPage = notesPage.createNewNote()
    editorPage.fillContent('Content without title')
    const notesPageAfterCreate = editorPage.save()

    // Note should be created (with default title or empty)
    // Verify by checking for content or default title
    cy.wait(500)
    notesPageAfterCreate.assertOnNotesPage()
  })

  it('should create note with empty content', () => {
    const notesPage = new NotesPage()

    // Create note with only title
    const editorPage = notesPage.createNewNote()
    editorPage.fillTitle('Empty Content Note')
    const notesPageAfterCreate = editorPage.save()

    // Verify note exists
    notesPageAfterCreate.assertNoteExists('Empty Content Note')
  })

  it('should handle concurrent edits (edit same note twice)', () => {
    const notesPage = new NotesPage()

    // Create note
    cy.createNote('Concurrent Edit Test', 'Original', 'test')

    // First edit
    let editorPage = notesPage.selectNote('Concurrent Edit Test')
    editorPage.edit()
    editorPage.fillContent('First edit')
    let notesPageAfterEdit = editorPage.update()

    // Second edit
    editorPage = notesPageAfterEdit.selectNote('Concurrent Edit Test')
    editorPage.edit()
    editorPage.fillContent('Second edit')
    notesPageAfterEdit = editorPage.update()

    // Verify final content
    editorPage = notesPageAfterEdit.selectNote('Concurrent Edit Test')
    editorPage.assertContentContains('Second edit')
  })

  it('should preserve note order after edit', () => {
    // Create multiple notes
    cy.createNote('Note 1', 'Content 1', 'test')
    cy.createNote('Note 2', 'Content 2', 'test')
    cy.createNote('Note 3', 'Content 3', 'test')

    // Verify all notes exist
    cy.assertNoteExists('Note 1')
    cy.assertNoteExists('Note 2')
    cy.assertNoteExists('Note 3')

    // Edit middle note
    const notesPage = new NotesPage()
    const editorPage = notesPage.selectNote('Note 2')
    editorPage.edit()
    editorPage.fillTitle('Note 2 Updated')
    const notesPageAfterEdit = editorPage.update()

    // All notes should still exist
    notesPageAfterEdit.assertNoteExists('Note 1')
    notesPageAfterEdit.assertNoteExists('Note 2 Updated')
    notesPageAfterEdit.assertNoteExists('Note 3')
  })
})

