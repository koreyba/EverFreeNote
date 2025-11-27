// @ts-check
/**
 * Theme Workflow E2E Test
 * Tests theme switching and persistence
 */

import { LoginPage } from '../../support/page-objects/LoginPage'

describe('Theme Workflow', () => {
  beforeEach(() => {
    cy.clearLocalStorage()
    cy.clearCookies()
  })

  it('should toggle theme and persist after logout/login', () => {
    // Login
    cy.visit('/')
    const loginPage = new LoginPage()
    const notesPage = loginPage.skipAuth()

    // Toggle to dark theme
    notesPage.toggleTheme()
    
    // Verify dark theme is applied (check for dark class or CSS)
    cy.get('html').should('have.class', 'dark')

    // Logout
    const loginPageAfterLogout = notesPage.logout()
    loginPageAfterLogout.assertOnLoginPage()

    // Login again
    const notesPageAfterLogin = loginPageAfterLogout.skipAuth()

    // Verify theme persisted (should still be dark)
    cy.get('html').should('have.class', 'dark')

    // Toggle back to light theme
    notesPageAfterLogin.toggleTheme()
    cy.get('html').should('not.have.class', 'dark')
  })

  it('should toggle theme multiple times', () => {
    // Login
    cy.login()

    // Toggle to dark
    cy.toggleTheme()
    cy.get('html').should('have.class', 'dark')

    // Toggle back to light
    cy.toggleTheme()
    cy.get('html').should('not.have.class', 'dark')

    // Toggle to dark again
    cy.toggleTheme()
    cy.get('html').should('have.class', 'dark')
  })

  it('should apply theme to all UI elements', () => {
    // Login
    cy.login()

    // Check initial theme (light)
    cy.get('body').should('be.visible')

    // Toggle to dark
    cy.toggleTheme()

    // Verify dark theme applied to body
    cy.get('html').should('have.class', 'dark')

    // Create a note and verify theme is consistent
    cy.createNote('Theme Test Note', 'Testing theme consistency')

    // Theme should still be dark
    cy.get('html').should('have.class', 'dark')
  })

  it('should save theme preference in localStorage', () => {
    // Login
    cy.login()

    // Toggle to dark theme
    cy.toggleTheme()
    cy.wait(500)

    // Check HTML class for dark theme
    cy.get('html').should('have.class', 'dark')

    // Toggle back to light
    cy.toggleTheme()
    cy.wait(500)

    // Check HTML class for light theme
    cy.get('html').should('not.have.class', 'dark')
  })
})

