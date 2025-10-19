describe('Basic App Functionality', () => {
  it('should load the app', () => {
    cy.visit('/')
    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('Continue with Google').should('be.visible')
  })

  it('should allow skip authentication', () => {
    cy.visit('/')
    cy.contains('Skip Authentication').click()

    // Должны увидеть основной интерфейс
    cy.contains('New Note').should('be.visible')
    cy.contains('Search notes').should('be.visible')
  })
})
