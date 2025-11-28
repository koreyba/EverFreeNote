import React from 'react'
import { EmptyState } from '@/components/features/notes/EmptyState'

describe('EmptyState Component', () => {
  it('renders correctly', () => {
    cy.mount(<EmptyState />)

    cy.contains('Select a note or create a new one').should('be.visible')
    // Check for the icon (BookOpen)
    cy.get('svg.lucide-book-open').should('exist')
  })
})
