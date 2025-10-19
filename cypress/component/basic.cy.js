describe('Basic Component Test', () => {
  it('should mount a simple component', () => {
    cy.mount(<div>Hello World</div>)
    cy.contains('Hello World').should('be.visible')
  })

  it('should work with React components', () => {
    const TestComponent = () => <button>Test Button</button>
    cy.mount(<TestComponent />)
    cy.findByRole('button', { name: 'Test Button' }).should('be.visible')
  })
})
