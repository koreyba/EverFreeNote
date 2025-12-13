import React from 'react'
import { NoteCard } from '@ui/web/components/features/notes/NoteCard'
import type { Note, SearchResult } from '@core/types/domain'
import { ThemeProvider } from '@/components/theme-provider'

describe('NoteCard Component', () => {
  const baseNote: Note = {
    id: '1',
    title: 'My note',
    description: 'Short <b>desc</b>',
    tags: ['work', 'personal', 'ideas'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'user-1'
  }

  it('renders compact variant with selection and tag clicks', () => {
    const onClick = cy.stub().as('onClick')
    const onTagClick = cy.stub().as('onTagClick')

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <NoteCard
          note={baseNote}
          variant='compact'
          isSelected
          onClick={onClick}
          onTagClick={onTagClick}
        />
      </ThemeProvider>
    )

    cy.contains('My note').should('be.visible')
    cy.contains('Short desc').should('be.visible')
    cy.get('.bg-accent').should('exist')

    cy.contains('work').click()
    cy.get('@onTagClick').should('have.been.calledWith', 'work')

    cy.contains('My note').click()
    cy.get('@onClick').should('have.been.calledOnce')
  })

  it('renders search variant with rank, headline, and overflow tag badge', () => {
    const onClick = cy.stub().as('onSearchClick')
    const onTagClick = cy.stub().as('onTagClick')

    const searchNote: SearchResult = {
      ...baseNote,
      id: 'search-1',
      title: 'Search hit',
      headline: '<mark>highlight</mark><script>ignored()</script>',
      rank: 0.734,
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
      content: '',
      user_id: 'user-1'
    }

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <NoteCard
          note={searchNote}
          variant='search'
          onClick={onClick}
          onTagClick={onTagClick}
        />
      </ThemeProvider>
    )

    cy.contains('73.4%').should('be.visible')
    cy.get('mark').should('contain.text', 'highlight')
    cy.contains('+1').should('be.visible')

    cy.get('[data-cy=\'interactive-tag\']').first().click()
    cy.get('@onTagClick').should('have.been.calledWith', 'a')

    cy.contains('Search hit').click()
    cy.get('@onSearchClick').should('have.been.calledOnce')
  })

  it('falls back to placeholder title when missing in search variant', () => {
    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <NoteCard
          note={{ ...baseNote, title: '', content: '', user_id: 'user-1' } as SearchResult}
          variant='search'
          onClick={cy.stub()}
        />
      </ThemeProvider>
    )

    cy.contains('Без названия').should('be.visible')
  })
})

