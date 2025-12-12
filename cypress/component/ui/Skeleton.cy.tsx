import React from 'react'
import { Skeleton } from '@ui/web/components/ui/skeleton'

describe('Skeleton Component', () => {
  it('renders skeleton element', () => {
    cy.mount(<Skeleton />)
    
    cy.get('[class*="animate-pulse"]').should('exist')
  })

  it('applies default styling classes', () => {
    cy.mount(<Skeleton />)
    
    cy.get('[class*="animate-pulse"]')
      .should('have.class', 'rounded-md')
  })

  it('applies custom className', () => {
    cy.mount(<Skeleton className="h-4 w-full" />)
    
    cy.get('[class*="animate-pulse"]')
      .should('have.class', 'h-4')
      .and('have.class', 'w-full')
  })

  it('renders multiple skeletons', () => {
    cy.mount(
      <div>
        <Skeleton className="h-4 w-full mb-2" />
        <Skeleton className="h-4 w-3/4 mb-2" />
        <Skeleton className="h-4 w-1/2" />
      </div>
    )
    
    cy.get('[class*="animate-pulse"]').should('have.length', 3)
  })

  it('renders skeleton with custom dimensions', () => {
    cy.mount(<Skeleton className="h-12 w-12 rounded-full" />)
    
    cy.get('[class*="animate-pulse"]')
      .should('have.class', 'h-12')
      .and('have.class', 'w-12')
      .and('have.class', 'rounded-full')
  })
})

