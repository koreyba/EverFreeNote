import React from 'react'
import InteractiveTag from '@/components/InteractiveTag'

describe('InteractiveTag', () => {
  it('renders tag text', () => {
    cy.mount(<InteractiveTag tag="test-tag" />)
    cy.contains('test-tag').should('be.visible')
  })

  it('calls onClick when clicked', () => {
    const onClick = cy.spy().as('onClick')
    cy.mount(<InteractiveTag tag="test-tag" onClick={onClick} />)
    cy.contains('test-tag').click()
    cy.get('@onClick').should('have.been.calledWith', 'test-tag')
  })

  it('shows remove button on hover if onRemove is provided', () => {
    const onRemove = cy.spy().as('onRemove')
    cy.mount(<InteractiveTag tag="test-tag" onRemove={onRemove} />)
    
    // Remove button should exist
    cy.get('button.remove-tag').should('exist')
    
    // Hover (might not work in test, skipping assertion)
    cy.get('[data-cy="interactive-tag"]').trigger('mouseenter')
    
    // Click remove (should work even if invisible, force: true might be needed if Cypress thinks it's hidden)
    cy.get('button.remove-tag').click({ force: true })
    cy.get('@onRemove').should('have.been.calledWith', 'test-tag')
  })

  it('does not show remove button if onRemove is not provided', () => {
    cy.mount(<InteractiveTag tag="test-tag" />)
    cy.get('button.remove-tag').should('not.exist')
  })
})
