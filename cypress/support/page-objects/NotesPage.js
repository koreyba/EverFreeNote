/**
 * Page Object for Notes List page
 * Handles notes list, search, tags, and navigation
 */
export class NotesPage {
  // Selectors
  get newNoteButton() {
    return cy.contains('New Note')
  }

  get searchInput() {
    return cy.get('input[placeholder*="Search"]')
  }

  get notesList() {
    return cy.get('[data-cy="notes-list"]')
  }

  get userEmail() {
    return cy.contains('@example.com')
  }

  get logoutButton() {
    return cy.get('svg.lucide-log-out').parent('button')
  }

  get themeToggle() {
    return cy.get('button').filter(':has(svg.lucide-sun, svg.lucide-moon)')
  }

  get importButton() {
    return cy.contains('Import from Evernote')
  }

  get noNotesMessage() {
    return cy.contains('No notes yet')
  }

  // Actions
  /**
   * Create a new note
   * @returns {import('./EditorPage').EditorPage}
   */
  createNewNote() {
    this.newNoteButton.click()
    // Wait for editor to load
    cy.get('input[placeholder="Note title"]', { timeout: 10000 }).should('be.visible')
    const { EditorPage } = require('./EditorPage')
    return new EditorPage()
  }

  /**
   * Search for notes
   * @param {string} query - Search query
   * @returns {NotesPage}
   */
  searchNotes(query) {
    this.searchInput.clear().type(query)
    // Wait for search to complete
    cy.wait(500)
    return this
  }

  /**
   * Clear search
   * @returns {NotesPage}
   */
  clearSearch() {
    this.searchInput.clear()
    cy.wait(500)
    return this
  }

  /**
   * Select a note by title
   * @param {string} title - Note title
   * @returns {import('./EditorPage').EditorPage}
   */
  selectNote(title) {
    cy.contains(title).click()
    // Wait for note to load
    cy.wait(500)
    const { EditorPage } = require('./EditorPage')
    return new EditorPage()
  }

  /**
   * Filter by tag
   * @param {string} tag - Tag name
   * @returns {NotesPage}
   */
  filterByTag(tag) {
    cy.contains(tag).click()
    cy.wait(500)
    return this
  }

  /**
   * Logout
   * @returns {import('./LoginPage').LoginPage}
   */
  logout() {
    this.logoutButton.click()
    // Wait for login page
    cy.contains('EverFreeNote', { timeout: 10000 }).should('be.visible')
    const { LoginPage } = require('./LoginPage')
    return new LoginPage()
  }

  /**
   * Toggle theme (light/dark)
   * @returns {NotesPage}
   */
  toggleTheme() {
    this.themeToggle.click()
    cy.wait(300)
    return this
  }

  /**
   * Open import dialog
   * @returns {import('./ImportPage').ImportPage}
   */
  openImport() {
    this.importButton.click()
    const { ImportPage } = require('./ImportPage')
    return new ImportPage()
  }

  /**
   * Scroll to load more notes (for infinite scroll)
   * @returns {NotesPage}
   */
  scrollToBottom() {
    // Scroll the notes list container, not the window
    cy.get('#notes-list-container').scrollTo('bottom', { ensureScrollable: false })
    cy.wait(1000) // Wait for lazy loading
    return this
  }

  // Assertions
  /**
   * Verify we are on the notes page
   */
  assertOnNotesPage() {
    this.newNoteButton.should('be.visible')
    this.searchInput.should('be.visible')
    return this
  }

  /**
   * Verify a note exists in the list
   * @param {string} title - Note title
   */
  assertNoteExists(title) {
    cy.contains(title).should('be.visible')
    return this
  }

  /**
   * Verify a note does not exist
   * @param {string} title - Note title
   */
  assertNoteNotExists(title) {
    cy.contains(title).should('not.exist')
    return this
  }

  /**
   * Verify a tag exists
   * @param {string} tag - Tag name
   */
  assertTagExists(tag) {
    cy.contains(tag).should('be.visible')
    return this
  }

  /**
   * Verify empty state is shown
   */
  assertEmptyState() {
    this.noNotesMessage.should('be.visible')
    return this
  }

  /**
   * Verify user is logged in
   * @param {string} email - User email
   */
  assertLoggedIn(email = 'skip-auth@example.com') {
    cy.contains(email).should('be.visible')
    return this
  }

  /**
   * Count visible notes
   * @param {number} expectedCount - Expected number of notes
   */
  assertNoteCount(expectedCount) {
    // This is a simplified check - adjust selector based on actual implementation
    cy.get('[data-cy="note-item"]').should('have.length', expectedCount)
    return this
  }
}

