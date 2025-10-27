/**
 * Page Object for ENEX Import functionality
 * Handles file selection, duplicate strategy, and import progress
 */
export class ImportPage {
  // Selectors
  get importButton() {
    return cy.contains('Import from Evernote')
  }

  get fileInput() {
    return cy.get('input[type="file"]')
  }

  get duplicateStrategyPrefix() {
    return cy.get('#prefix')
  }

  get duplicateStrategySkip() {
    return cy.get('#skip')
  }

  get startImportButton() {
    return cy.contains('button', 'Import')
  }

  get cancelButton() {
    return cy.contains('button', 'Cancel')
  }

  get progressDialog() {
    return cy.contains('Importing from Evernote')
  }

  get progressBar() {
    return cy.get('[role="progressbar"]')
  }

  get closeButton() {
    return cy.contains('button', 'Close')
  }

  get importDialog() {
    return cy.get('[role="dialog"]')
  }

  // Actions
  /**
   * Open import dialog
   * @returns {ImportPage}
   */
  openImportDialog() {
    this.importButton.click()
    cy.wait(500)
    return this
  }

  /**
   * Select ENEX file
   * @param {string} filename - Filename in cypress/fixtures/enex/
   * @returns {ImportPage}
   */
  selectFile(filename) {
    this.fileInput.selectFile(`cypress/fixtures/enex/${filename}`, { force: true })
    cy.wait(500)
    return this
  }

  /**
   * Select duplicate strategy
   * @param {'prefix'|'skip'} strategy - Duplicate handling strategy
   * @returns {ImportPage}
   */
  selectDuplicateStrategy(strategy) {
    if (strategy === 'prefix') {
      this.duplicateStrategyPrefix.click()
    } else if (strategy === 'skip') {
      this.duplicateStrategySkip.click()
    }
    return this
  }

  /**
   * Start import process
   * @returns {ImportPage}
   */
  startImport() {
    this.startImportButton.click()
    return this
  }

  /**
   * Wait for import to complete
   * @param {number} timeout - Timeout in ms (default 30000)
   * @returns {ImportPage}
   */
  waitForImportComplete(timeout = 30000) {
    // Wait for progress dialog
    this.progressDialog.should('be.visible')
    // Wait for completion message
    cy.contains('Import completed', { timeout }).should('be.visible')
    return this
  }

  /**
   * Close import dialog
   * @returns {import('./NotesPage').NotesPage}
   */
  closeImportDialog() {
    this.closeButton.click()
    cy.wait(500)
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  /**
   * Cancel import
   * @returns {import('./NotesPage').NotesPage}
   */
  cancelImport() {
    this.cancelButton.click()
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  /**
   * Complete import flow
   * @param {string} filename - ENEX filename
   * @param {'prefix'|'skip'} strategy - Duplicate strategy
   * @returns {import('./NotesPage').NotesPage}
   */
  importFile(filename, strategy = 'prefix') {
    this.openImportDialog()
    this.selectFile(filename)
    this.selectDuplicateStrategy(strategy)
    this.startImport()
    this.waitForImportComplete()
    return this.closeImportDialog()
  }

  // Assertions
  /**
   * Verify import dialog is open
   */
  assertImportDialogOpen() {
    this.importDialog.should('be.visible')
    return this
  }

  /**
   * Verify file is selected
   * @param {string} filename - Expected filename
   */
  assertFileSelected(filename) {
    cy.contains(filename).should('be.visible')
    return this
  }

  /**
   * Verify progress is shown
   */
  assertProgressShown() {
    this.progressDialog.should('be.visible')
    this.progressBar.should('be.visible')
    return this
  }

  /**
   * Verify import completed
   */
  assertImportCompleted() {
    cy.contains('Import completed').should('be.visible')
    return this
  }

  /**
   * Verify import failed
   */
  assertImportFailed() {
    cy.contains('Import failed').should('be.visible')
    return this
  }

  /**
   * Verify progress percentage
   * @param {number} percentage - Expected percentage (0-100)
   */
  assertProgress(percentage) {
    cy.contains(`${percentage}%`).should('be.visible')
    return this
  }

  /**
   * Verify number of files processed
   * @param {number} current - Current file number
   * @param {number} total - Total files
   */
  assertFilesProgress(current, total) {
    cy.contains(`${current} / ${total} files`).should('be.visible')
    return this
  }
}

