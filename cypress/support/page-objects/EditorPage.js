// @ts-check
/**
 * Page Object for Note Editor page
 * Handles note creation, editing, and deletion
 */
export class EditorPage {
  // Selectors
  get titleInput() {
    return cy.get('input[placeholder="Note title"]')
  }

  get contentEditor() {
    // Tiptap renders a contenteditable div inside EditorContent
    return cy.get('[data-cy="editor-content"] .tiptap')
  }

  get tagsInput() {
    return cy.get('input[placeholder="work, personal, ideas"]')
  }

  get saveButton() {
    return cy.contains('button', 'Save')
  }

  get deleteButton() {
    return cy.contains('button', 'Delete')
  }

  get editButton() {
    return cy.contains('button', 'Edit')
  }

  get cancelButton() {
    return cy.contains('button', 'Cancel')
  }

  // Rich text formatting buttons
  get boldButton() {
    return cy.get('[data-cy="bold-button"]')
  }

  get italicButton() {
    return cy.get('[data-cy="italic-button"]')
  }

  get underlineButton() {
    return cy.get('[data-cy="underline-button"]')
  }

  // Actions
  /**
   * Fill note title
   * @param {string} title - Note title
   * @returns {EditorPage}
   */
  fillTitle(title) {
    this.titleInput.clear().type(title)
    return this
  }

  /**
   * Fill note content
   * @param {string} content - Note content
   * @returns {EditorPage}
   */
  fillContent(content) {
    // For Tiptap contenteditable div
    this.contentEditor.click()
    // Select all and delete
    this.contentEditor.type('{selectall}{backspace}')
    // Type new content
    this.contentEditor.type(content)
    return this
  }

  /**
   * Fill tags
   * @param {string} tags - Comma-separated tags
   * @returns {EditorPage}
   */
  fillTags(tags) {
    this.tagsInput.clear().type(tags)
    return this
  }

  /**
   * Fill complete note form
   * @param {string} title - Note title
   * @param {string} content - Note content
   * @param {string} tags - Tags (optional)
   * @returns {EditorPage}
   */
  fillNote(title, content, tags = '') {
    this.fillTitle(title)
    this.fillContent(content)
    if (tags) {
      this.fillTags(tags)
    }
    return this
  }

  /**
   * Save note (create)
   * @returns {import('./NotesPage').NotesPage}
   */
  save() {
    this.saveButton.click()
    // Wait for success message
    cy.contains('Note created successfully', { timeout: 10000 }).should('be.visible')
    cy.wait(500)
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  /**
   * Update note (edit)
   * @returns {import('./NotesPage').NotesPage}
   */
  update() {
    this.saveButton.click()
    // Wait for success message
    cy.contains('Note updated successfully', { timeout: 10000 }).should('be.visible')
    cy.wait(500)
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  /**
   * Delete note
   * @returns {import('./NotesPage').NotesPage}
   */
  delete() {
    this.deleteButton.click()
    cy.wait(500)
    // Handle confirmation dialog
    cy.get('button').contains('Delete').click({ force: true })
    cy.wait(1000)
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  /**
   * Click edit button (when viewing a note)
   * @returns {EditorPage}
   */
  edit() {
    this.editButton.click()
    cy.wait(500)
    return this
  }

  /**
   * Cancel editing
   * @returns {import('./NotesPage').NotesPage}
   */
  cancel() {
    this.cancelButton.click()
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  /**
   * Apply bold formatting
   * @returns {EditorPage}
   */
  applyBold() {
    this.boldButton.click()
    return this
  }

  /**
   * Apply italic formatting
   * @returns {EditorPage}
   */
  applyItalic() {
    this.italicButton.click()
    return this
  }

  /**
   * Apply underline formatting
   * @returns {EditorPage}
   */
  applyUnderline() {
    this.underlineButton.click()
    return this
  }

  /**
   * Select all text in editor
   * @returns {EditorPage}
   */
  selectAllContent() {
    this.contentEditor.type('{selectall}')
    return this
  }

  // Assertions
  /**
   * Verify we are on the editor page
   */
  assertOnEditorPage() {
    this.titleInput.should('be.visible')
    this.contentEditor.should('be.visible')
    return this
  }

  /**
   * Verify title has specific value
   * @param {string} title - Expected title
   */
  assertTitle(title) {
    this.titleInput.should('have.value', title)
    return this
  }

  /**
   * Verify content contains text
   * @param {string} text - Expected text
   */
  assertContentContains(text) {
    this.contentEditor.should('contain', text)
    return this
  }

  /**
   * Verify tags have specific value
   * @param {string} tags - Expected tags
   */
  assertTags(tags) {
    this.tagsInput.should('have.value', tags)
    return this
  }

  /**
   * Verify save button is visible
   */
  assertCanSave() {
    this.saveButton.should('be.visible').and('not.be.disabled')
    return this
  }

  /**
   * Verify delete button is visible
   */
  assertCanDelete() {
    this.deleteButton.should('be.visible')
    return this
  }

  /**
   * Verify in edit mode
   */
  assertInEditMode() {
    this.titleInput.should('not.be.disabled')
    this.contentEditor.should('be.visible')
    return this
  }

  /**
   * Verify in view mode
   */
  assertInViewMode() {
    this.editButton.should('be.visible')
    return this
  }
}

