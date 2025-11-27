// @ts-check
describe('template spec', () => {
  it('passes', () => {
    cy.visit('https://example.cypress.io')
    cy.prompt([
      'Check the page title, it should be "Kitchen Sink"',
      'click on "Querying@ link',
      'click blue button "button" on the page'
    ])
  })
})