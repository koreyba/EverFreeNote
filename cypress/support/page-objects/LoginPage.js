// @ts-check
/**
 * Page Object for Login/Authentication page
 * Handles authentication flows (skip auth, Google OAuth)
 */
export class LoginPage {
  // Selectors
  get skipAuthButton() {
    return cy.contains('Skip Authentication')
  }

  get googleAuthButton() {
    return cy.contains('Continue with Google')
  }

  get testLoginButton() {
    return cy.contains('button', 'Test Login')
  }

  get appTitle() {
    return cy.contains('EverFreeNote', { timeout: 15000 })
  }

  // Actions
  /**
   * Skip authentication and go directly to notes page
   * @returns {import('./NotesPage').NotesPage}
   */
  skipAuth() {
    this.skipAuthButton.click()
    // Wait for notes page to load
    cy.contains('New Note', { timeout: 10000 }).should('be.visible')
    // Return NotesPage instance for chaining
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  /**
   * Login with Google OAuth
   * Note: This may not work in e2e tests without proper OAuth setup
   */
  loginWithGoogle() {
    this.googleAuthButton.click()
    // Handle OAuth flow (if possible in e2e)
    // For now, this is a placeholder
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  /**
   * Use test login button (if available)
   * @returns {import('./NotesPage').NotesPage}
   */
  testLogin() {
    this.testLoginButton.click()
    cy.contains('New Note', { timeout: 10000 }).should('be.visible')
    const { NotesPage } = require('./NotesPage')
    return new NotesPage()
  }

  // Assertions
  /**
   * Verify we are on the login page
   */
  assertOnLoginPage() {
    this.appTitle.should('be.visible')
    this.skipAuthButton.should('be.visible')
    return this
  }

  /**
   * Verify Google auth button is visible
   */
  assertGoogleAuthAvailable() {
    this.googleAuthButton.should('be.visible')
    return this
  }
}

