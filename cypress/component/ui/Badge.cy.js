import React from 'react'
import { Badge } from '../../components/ui/badge'

describe('Badge Component', () => {
  it('renders with default props', () => {
    cy.mount(<Badge data-cy="default-badge">Default</Badge>)

    cy.get('[data-cy="default-badge"]').should('be.visible')
    cy.get('[data-cy="default-badge"]').should('contain', 'Default')
    cy.get('[data-cy="default-badge"]').should('have.class', 'inline-flex')
    cy.get('[data-cy="default-badge"]').should('have.class', 'items-center')
    cy.get('[data-cy="default-badge"]').should('have.class', 'rounded-md')
  })

  it('renders different variants correctly', () => {
    cy.mount(
      <div>
        <Badge variant="default" data-cy="default-badge">Default</Badge>
        <Badge variant="secondary" data-cy="secondary-badge">Secondary</Badge>
        <Badge variant="destructive" data-cy="destructive-badge">Destructive</Badge>
        <Badge variant="outline" data-cy="outline-badge">Outline</Badge>
      </div>
    )

    // Проверяем что все варианты отображаются
    cy.get('[data-cy="default-badge"]').should('be.visible')
    cy.get('[data-cy="secondary-badge"]').should('be.visible')
    cy.get('[data-cy="destructive-badge"]').should('be.visible')
    cy.get('[data-cy="outline-badge"]').should('be.visible')
  })

  it('renders with custom className', () => {
    cy.mount(<Badge className="custom-class" data-cy="custom-badge">Custom</Badge>)

    cy.get('[data-cy="custom-badge"]').should('have.class', 'custom-class')
  })

  it('handles different content types', () => {
    cy.mount(
      <div>
        <Badge data-cy="text-badge">Text</Badge>
        <Badge data-cy="number-badge">{42}</Badge>
        <Badge data-cy="icon-badge">
          <svg data-cy="badge-icon" width="12" height="12" viewBox="0 0 24 24"></svg>
          Icon
        </Badge>
      </div>
    )

    cy.get('[data-cy="text-badge"]').should('contain', 'Text')
    cy.get('[data-cy="number-badge"]').should('contain', '42')
    cy.get('[data-cy="icon-badge"]').should('contain', 'Icon')
    cy.get('[data-cy="badge-icon"]').should('be.visible')
  })
})
