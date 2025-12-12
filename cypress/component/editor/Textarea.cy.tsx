import React from 'react'
import { Textarea } from '@ui/web/components/ui/textarea'

describe('Textarea Component', () => {
  it('renders with default props', () => {
    cy.mount(<Textarea placeholder="Enter text here" />)

    cy.get('textarea').should('be.visible')
    cy.get('textarea').should('have.attr', 'placeholder', 'Enter text here')
    cy.get('textarea').should('have.class', 'flex')
    cy.get('textarea').should('have.class', 'min-h-[60px]')
  })

  it('handles user input', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(<Textarea onChange={onChangeSpy} data-cy="test-textarea" />)

    cy.get('[data-cy="test-textarea"]').type('Hello World')
    cy.get('[data-cy="test-textarea"]').should('have.value', 'Hello World')
    cy.get('@onChangeSpy').should('have.been.called')
  })

  it('renders with custom className', () => {
    cy.mount(<Textarea className="custom-textarea" data-cy="custom-textarea" />)

    cy.get('[data-cy="custom-textarea"]').should('have.class', 'custom-textarea')
  })

  it('handles disabled state', () => {
    cy.mount(<Textarea disabled data-cy="disabled-textarea" />)

    cy.get('[data-cy="disabled-textarea"]').should('be.disabled')
  })

  it('renders with different sizes', () => {
    cy.mount(<Textarea className="h-32" data-cy="large-textarea" />)

    cy.get('[data-cy="large-textarea"]').should('have.class', 'h-32')
  })

  it('handles multiline text input', () => {
    const multilineText = 'Line 1\nLine 2\nLine 3'

    cy.mount(<Textarea data-cy="multiline-textarea" />)

    cy.get('[data-cy="multiline-textarea"]').type(multilineText)
    cy.get('[data-cy="multiline-textarea"]').should('have.value', multilineText)
  })

  it('handles maxLength attribute', () => {
    cy.mount(<Textarea maxLength={10} data-cy="limited-textarea" />)

    cy.get('[data-cy="limited-textarea"]').should('have.attr', 'maxLength', '10')

    // Type text - Cypress will respect maxLength
    cy.get('[data-cy="limited-textarea"]').type('This is a very long text that should be truncated')
    
    // Verify the textarea respects maxLength (browser behavior)
    cy.get('[data-cy="limited-textarea"]').invoke('val').should('have.length.at.most', 10)
  })

  it('handles readonly state', () => {
    cy.mount(<Textarea readOnly value="Read only content" data-cy="readonly-textarea" />)

    cy.get('[data-cy="readonly-textarea"]').should('have.attr', 'readonly')
    cy.get('[data-cy="readonly-textarea"]').should('have.value', 'Read only content')
  })
})
