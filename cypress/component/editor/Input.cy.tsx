import React from 'react'
import { Input } from '../../../ui/web/components/ui/input'

describe('Input Component', () => {
  it('renders with default props', () => {
    cy.mount(<Input data-cy="default-input" />)

    cy.get('[data-cy="default-input"]').should('be.visible')
    cy.get('[data-cy="default-input"]').should('have.class', 'flex')
    cy.get('[data-cy="default-input"]').should('have.class', 'h-9')
    cy.get('[data-cy="default-input"]').should('have.class', 'w-full')
    cy.get('[data-cy="default-input"]').should('have.class', 'rounded-md')
  })

  it('handles different input types', () => {
    cy.mount(
      <div>
        <Input type="text" data-cy="text-input" placeholder="Text input" />
        <Input type="password" data-cy="password-input" placeholder="Password" />
        <Input type="email" data-cy="email-input" placeholder="Email" />
        <Input type="search" data-cy="search-input" placeholder="Search" />
      </div>
    )

    cy.get('[data-cy="text-input"]').should('have.attr', 'type', 'text')
    cy.get('[data-cy="password-input"]').should('have.attr', 'type', 'password')
    cy.get('[data-cy="email-input"]').should('have.attr', 'type', 'email')
    cy.get('[data-cy="search-input"]').should('have.attr', 'type', 'search')
  })

  it('handles user input', () => {
    cy.mount(<Input data-cy="input-field" placeholder="Enter text" />)

    cy.get('[data-cy="input-field"]').type('Hello World')
    cy.get('[data-cy="input-field"]').should('have.value', 'Hello World')
  })

  it('handles placeholder text', () => {
    cy.mount(<Input data-cy="placeholder-input" placeholder="Enter your name" />)

    cy.get('[data-cy="placeholder-input"]').should('have.attr', 'placeholder', 'Enter your name')
  })

  it('handles disabled state', () => {
    cy.mount(<Input data-cy="disabled-input" disabled value="Disabled text" />)

    cy.get('[data-cy="disabled-input"]').should('be.disabled')
    cy.get('[data-cy="disabled-input"]').should('have.value', 'Disabled text')
    cy.get('[data-cy="disabled-input"]').should('have.class', 'disabled:cursor-not-allowed')
    cy.get('[data-cy="disabled-input"]').should('have.class', 'disabled:opacity-50')
  })

  it('renders with custom className', () => {
    cy.mount(<Input className="custom-input-class" data-cy="custom-input" />)

    cy.get('[data-cy="custom-input"]').should('have.class', 'custom-input-class')
  })

  it('handles onChange events', () => {
    const onChangeSpy = cy.spy().as('onChangeSpy')

    cy.mount(<Input data-cy="change-input" onChange={onChangeSpy} />)

    cy.get('[data-cy="change-input"]').type('test')
    cy.get('@onChangeSpy').should('have.been.called')
  })

  it('handles focus and blur events', () => {
    const onFocusSpy = cy.spy().as('onFocusSpy')
    const onBlurSpy = cy.spy().as('onBlurSpy')

    cy.mount(
      <Input
        data-cy="focus-input"
        onFocus={onFocusSpy}
        onBlur={onBlurSpy}
      />
    )

    cy.get('[data-cy="focus-input"]').focus()
    cy.get('@onFocusSpy').should('have.been.called')

    cy.get('[data-cy="focus-input"]').blur()
    cy.get('@onBlurSpy').should('have.been.called')
  })
})
