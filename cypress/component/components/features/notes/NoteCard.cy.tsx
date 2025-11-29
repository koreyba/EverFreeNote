import React from 'react'
import { NoteCard } from '@/components/features/notes/NoteCard'
import { Note, SearchResult } from '@/types/domain'

const mockNote: Note = {
  id: '1',
  title: 'Test Note',
  content: '<div>Test Content</div>',
  description: 'Test Description',
  tags: ['tag1', 'tag2'],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
  user_id: 'user1',
  is_archived: false,
  is_favorite: false,
  is_deleted: false
}

const mockSearchResult: SearchResult = {
  ...mockNote,
  headline: 'Test <mark>Headline</mark>',
  rank: 0.85
}

describe('NoteCard', () => {
  it('renders compact variant', () => {
    cy.mount(
      <NoteCard
        note={mockNote}
        variant="compact"
        onClick={cy.spy()}
      />
    )
    cy.contains('Test Note').should('be.visible')
    cy.contains('Test Description').should('be.visible')
    cy.contains('tag1').should('be.visible')
    // Date format: 02.01.2023 (ru-RU)
    // Note: Date formatting might depend on locale. Assuming ru-RU as per code.
    cy.contains('2.01.2023').should('exist') // numeric month might be 1 or 01 depending on browser/locale implementation
  })

  it('renders search variant', () => {
    cy.mount(
      <NoteCard
        note={mockSearchResult}
        variant="search"
        onClick={cy.spy()}
      />
    )
    cy.contains('Test Note').should('be.visible')
    // Rank: 0.85 * 100 = 85.0%
    cy.contains('85.0%').should('be.visible')
    
    // Headline with mark
    cy.get('mark').should('contain.text', 'Headline')
  })

  it('handles clicks', () => {
    const onClick = cy.spy().as('onClick')
    cy.mount(
      <NoteCard
        note={mockNote}
        variant="compact"
        onClick={onClick}
      />
    )
    cy.contains('Test Note').click()
    cy.get('@onClick').should('have.been.called')
  })

  it('handles tag clicks', () => {
    const onTagClick = cy.spy().as('onTagClick')
    cy.mount(
      <NoteCard
        note={mockNote}
        variant="compact"
        onClick={cy.spy()}
        onTagClick={onTagClick}
      />
    )
    cy.contains('tag1').click()
    cy.get('@onTagClick').should('have.been.calledWith', 'tag1')
  })

  it('shows selected state', () => {
    cy.mount(
      <NoteCard
        note={mockNote}
        variant="compact"
        isSelected={true}
        onClick={cy.spy()}
      />
    )
    // Check for bg-accent class on the container
    cy.contains('Test Note').closest('div').should('have.class', 'bg-accent')
  })
})
