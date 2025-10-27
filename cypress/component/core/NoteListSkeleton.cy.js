import React from 'react'
import { NoteListSkeleton } from '@/components/NoteListSkeleton'

describe('NoteListSkeleton Component', () => {
  it('renders default number of skeleton items', () => {
    cy.mount(<NoteListSkeleton />)
    
    // Default count is 5
    cy.get('[class*="animate-pulse"]').should('have.length.at.least', 5)
  })

  it('renders custom number of skeleton items', () => {
    cy.mount(<NoteListSkeleton count={3} />)
    
    // Should have skeleton items for 3 notes (multiple skeletons per note)
    cy.get('div.space-y-1 > div').should('have.length', 3)
  })

  it('renders skeleton with proper structure', () => {
    cy.mount(<NoteListSkeleton count={1} />)
    
    // Check for title skeleton
    cy.get('[class*="h-5"]').should('exist')
    
    // Check for description skeletons
    cy.get('[class*="h-4"]').should('have.length.at.least', 2)
    
    // Check for tag skeletons
    cy.get('[class*="rounded-full"]').should('have.length.at.least', 2)
  })

  it('renders with proper spacing classes', () => {
    cy.mount(<NoteListSkeleton />)
    
    cy.get('.space-y-1').should('exist')
    cy.get('.p-2').should('exist')
  })

  it('renders multiple skeleton items with consistent structure', () => {
    cy.mount(<NoteListSkeleton count={3} />)
    
    cy.get('div.space-y-1 > div').each(($item) => {
      // Each item should have skeletons
      cy.wrap($item).find('[class*="animate-pulse"]').should('have.length.at.least', 1)
    })
  })

  it('renders with zero count', () => {
    cy.mount(<NoteListSkeleton count={0} />)
    
    cy.get('div.space-y-1 > div').should('have.length', 0)
  })

  it('renders with large count', () => {
    cy.mount(<NoteListSkeleton count={10} />)
    
    cy.get('div.space-y-1 > div').should('have.length', 10)
  })
})

