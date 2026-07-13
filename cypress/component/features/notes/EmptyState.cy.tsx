import React from 'react'
import { EmptyState } from '../../../../ui/web/components/features/notes/EmptyState'

describe('EmptyState Component', () => {
  it('renders correctly', () => {
    cy.mount(<EmptyState />)

    cy.contains('No Note Selected').should('be.visible')
    cy.contains('Choose a note from the list or create a new one to start writing.').should('be.visible')
    cy.get('img[alt="EverFreeNote"]')
      .should('be.visible')
      .and('have.attr', 'src')
      .and('include', 'everfreenote-logo-mark.png')
  })
})
