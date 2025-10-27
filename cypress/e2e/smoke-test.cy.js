/**
 * Smoke Test - Basic application loading
 * Note: Full e2e tests require Supabase to be running
 */
describe('Smoke Test', () => {
  it('should load the application', () => {
    cy.visit('/', { timeout: 30000 })
    
    // Check if page loaded
    cy.get('body').should('be.visible')
    
    // Check for login page elements (should be visible without Supabase)
    cy.contains('EverFreeNote', { timeout: 15000 }).should('be.visible')
    cy.contains('Skip Authentication').should('be.visible')
  })

  it('should display login form', () => {
    cy.visit('/')
    
    // Verify login page elements
    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('Skip Authentication').should('be.visible')
    cy.contains('Continue with Google').should('be.visible')
  })
})

