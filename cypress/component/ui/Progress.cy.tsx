import React from 'react'
import { Progress } from '@/components/ui/progress'

describe('Progress Component', () => {
  it('renders with default value', () => {
    cy.mount(<div style={{ width: 200 }}><Progress /></div>)
    cy.get('[role="progressbar"]').should('exist')
    cy.get('[role="progressbar"] [data-state]').should('have.attr', 'style').and('include', 'translateX(-100%')
  })

  it('applies provided value to indicator transform', () => {
    cy.mount(<Progress value={50} />)
    cy.get('[role="progressbar"] [data-state]')
      .should('have.attr', 'style')
      .and('include', 'translateX(-50%')
  })
})
