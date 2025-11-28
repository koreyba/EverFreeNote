import React from 'react'
import { NoteView } from '@/components/features/notes/NoteView'
import type { Note } from '@/types/domain'

describe('NoteView Component', () => {
  const mockNote: Note & { content?: string | null } = {
    id: '1',
    title: 'Test Note',
    description: '<p>Test Content</p>',
    tags: ['tag1', 'tag2'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'user1'
  }

  it('renders note details correctly', () => {
    const props = {
      note: mockNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub()
    }
    cy.mount(<NoteView {...props} />)

    cy.contains('Test Note').should('be.visible')
    cy.contains('Test Content').should('be.visible')
    cy.contains('tag1').should('be.visible')
    cy.contains('tag2').should('be.visible')
    cy.contains('Created:').should('be.visible')
    cy.contains('Updated:').should('be.visible')
  })

  it('handles actions', () => {
    const onEdit = cy.spy().as('onEdit')
    const onDelete = cy.spy().as('onDelete')
    const onTagClick = cy.spy().as('onTagClick')
    const onRemoveTag = cy.spy().as('onRemoveTag')

    const props = {
      note: mockNote,
      onEdit,
      onDelete,
      onTagClick,
      onRemoveTag
    }

    cy.mount(
      <NoteView
        {...props}
      />
    )

    cy.contains('Edit').click()
    cy.get('@onEdit').should('have.been.called')

    cy.contains('Delete').click()
    cy.get('@onDelete').should('have.been.called')

    // Test tag interaction if InteractiveTag supports it
    // Assuming InteractiveTag has click handlers
    cy.contains('tag1').click()
    // Note: InteractiveTag implementation might require specific selector for click vs remove
  })

  it('sanitizes content', () => {
    const maliciousNote = {
      ...mockNote,
      description: '<script>alert("xss")</script><p>Safe Content</p>'
    }

    const props = {
      note: maliciousNote,
      onEdit: cy.stub(),
      onDelete: cy.stub(),
      onTagClick: cy.stub(),
      onRemoveTag: cy.stub()
    }

    cy.mount(<NoteView {...props} />)

    cy.contains('Safe Content').should('be.visible')
    // Scope the check to the content area to avoid finding Next.js/Cypress scripts
    cy.get('.prose script').should('not.exist')
  })
})
