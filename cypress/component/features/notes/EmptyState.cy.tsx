import React from 'react'
import { EmptyState } from '../../../../ui/web/components/features/notes/EmptyState'

describe('EmptyState Component', () => {
  it('renders correctly', () => {
    cy.mount(<EmptyState />)

    cy.contains('Select a note or create a new one').should('be.visible')
    cy.findByRole('img', { name: 'EverFreeNote' })
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'everfreenote-logo-mark.png')
  })
})
