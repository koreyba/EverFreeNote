import React from 'react'
import { NoteListSkeleton } from '@ui/web/components/NoteListSkeleton'

describe('NoteListSkeleton', () => {
  it('renders default number of items', () => {
    cy.mount(<NoteListSkeleton />)
    // Default count is 5.
    cy.get('.space-y-1 > div').should('have.length', 5)
  })

  it('renders specified number of items', () => {
    cy.mount(<NoteListSkeleton count={10} />)
    cy.get('.space-y-1 > div').should('have.length', 10)
  })
})
