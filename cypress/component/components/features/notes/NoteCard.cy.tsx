import React from 'react'
import { NoteCard } from '@ui/web/components/features/notes/NoteCard'
import { SearchResult, NoteViewModel } from '@core/types/domain'
import { ThemeProvider } from '@/components/theme-provider'

const mockNote: NoteViewModel = {
  id: '1',
  title: 'Test Note',
  content: '<div>Test Content</div>',
  description: 'Test Description',
  tags: ['tag1', 'tag2'],
  created_at: '2023-01-01T00:00:00Z',
  updated_at: '2023-01-02T00:00:00Z',
  user_id: 'user1'
}

const mockSearchResult: SearchResult = {
  ...mockNote,
  headline: 'Test <mark>Headline</mark>',
  rank: 0.85
}

describe('NoteCard', () => {
  it('renders compact variant', () => {
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <NoteCard
          note={mockNote}
          variant="compact"
          onClick={cy.spy()}
        />
      </ThemeProvider>
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
      <ThemeProvider attribute="class" defaultTheme="light">
        <NoteCard
          note={mockSearchResult}
          variant="search"
          onClick={cy.spy()}
        />
      </ThemeProvider>
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
      <ThemeProvider attribute="class" defaultTheme="light">
        <NoteCard
          note={mockNote}
          variant="compact"
          onClick={onClick}
        />
      </ThemeProvider>
    )
    cy.contains('Test Note').click()
    cy.get('@onClick').should('have.been.called')
  })

  it('handles tag clicks', () => {
    const onTagClick = cy.spy().as('onTagClick')
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <NoteCard
          note={mockNote}
          variant="compact"
          onClick={cy.spy()}
          onTagClick={onTagClick}
        />
      </ThemeProvider>
    )
    cy.contains('tag1').click()
    cy.get('@onTagClick').should('have.been.calledWith', 'tag1')
  })

  it('shows selected state', () => {
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <NoteCard
          note={mockNote}
          variant="compact"
          isSelected={true}
          onClick={cy.spy()}
        />
      </ThemeProvider>
    )
    // Check that any ancestor container has bg-accent (selection highlight)
    cy.contains('Test Note')
      .parents('div')
      .filter('.bg-accent')
      .should('exist')
  })
})
