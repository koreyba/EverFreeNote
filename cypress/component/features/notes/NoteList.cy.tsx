import React from 'react'
import { NoteList } from '@/components/features/notes/NoteList'
import type { Note, SearchResult } from '@/types/domain'

describe('NoteList Component', () => {
  const mockNotes: (Note & { content?: string | null })[] = [
    {
      id: '1',
      title: 'Test Note 1',
      description: 'Description 1',
      tags: ['work'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user1'
    },
    {
      id: '2',
      title: 'Test Note 2',
      description: 'Description 2',
      tags: ['personal'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user1'
    }
  ]

  const mockFtsResults: SearchResult[] = [
    {
      id: '3',
      title: 'Search Result 1',
      description: 'Found content',
      headline: 'Found <mark>content</mark>',
      rank: 0.5,
      tags: ['search'],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user1'
    }
  ]

  it('renders list of notes correctly', () => {
    cy.mount(
      <NoteList
        notes={mockNotes}
        isLoading={false}
        onSelectNote={cy.stub().as('onSelect')}
        onTagClick={cy.stub().as('onTagClick')}
        onLoadMore={cy.stub()}
        hasMore={false}
        isFetchingNextPage={false}
        ftsQuery=""
        ftsLoading={false}
        showFTSResults={false}
        onSearchResultClick={cy.stub()}
      />
    )

    cy.contains('Test Note 1').should('be.visible')
    cy.contains('Test Note 2').should('be.visible')
    cy.contains('work').should('be.visible')
  })

  it('handles note selection', () => {
    const onSelectSpy = cy.spy().as('onSelect')

    cy.mount(
      <NoteList
        notes={mockNotes}
        isLoading={false}
        onSelectNote={onSelectSpy}
        onTagClick={cy.stub()}
        onLoadMore={cy.stub()}
        hasMore={false}
        isFetchingNextPage={false}
        ftsQuery=""
        ftsLoading={false}
        showFTSResults={false}
        onSearchResultClick={cy.stub()}
      />
    )

    cy.contains('Test Note 1').click()
    cy.get('@onSelect').should('have.been.calledWith', mockNotes[0])
  })

  it('displays loading skeleton', () => {
    cy.mount(
      <NoteList
        notes={[]}
        isLoading={true}
        onSelectNote={cy.stub()}
        onTagClick={cy.stub()}
        onLoadMore={cy.stub()}
        hasMore={false}
        isFetchingNextPage={false}
        ftsQuery=""
        ftsLoading={false}
        showFTSResults={false}
        onSearchResultClick={cy.stub()}
      />
    )

    cy.get('.animate-pulse').should('exist')
  })

  it('renders FTS search results when active', () => {
    const onSearchResultClickSpy = cy.spy().as('onSearchResultClick')

    cy.mount(
      <NoteList
        notes={mockNotes}
        isLoading={false}
        onSelectNote={cy.stub()}
        onTagClick={cy.stub()}
        onLoadMore={cy.stub()}
        hasMore={false}
        isFetchingNextPage={false}
        ftsQuery="content"
        ftsLoading={false}
        showFTSResults={true}
        ftsData={{
          total: 1,
          executionTime: 10,
          results: mockFtsResults
        }}
        onSearchResultClick={onSearchResultClickSpy}
      />
    )

    cy.contains('Search Result 1').should('be.visible')
    cy.contains('Test Note 1').should('not.exist')

    cy.contains('10ms').should('be.visible')
    cy.contains('1').should('exist')

    cy.contains('Search Result 1').click()
    cy.get('@onSearchResultClick').should('have.been.calledWith', mockFtsResults[0])
  })

  it('displays loading state for FTS', () => {
    cy.mount(
      <NoteList
        notes={mockNotes}
        isLoading={false}
        onSelectNote={cy.stub()}
        onTagClick={cy.stub()}
        onLoadMore={cy.stub()}
        hasMore={false}
        isFetchingNextPage={false}
        ftsQuery="search term"
        ftsLoading={true}
        showFTSResults={false}
        onSearchResultClick={cy.stub()}
      />
    )

    cy.get('.animate-spin').should('be.visible')
  })

  it('renders load more button and calls handler', () => {
    const onLoadMore = cy.stub().as('onLoadMore')

    cy.mount(
      <NoteList
        notes={mockNotes}
        isLoading={false}
        onSelectNote={cy.stub()}
        onTagClick={cy.stub()}
        onLoadMore={onLoadMore}
        hasMore={true}
        isFetchingNextPage={false}
        ftsQuery=""
        ftsLoading={false}
        showFTSResults={false}
        onSearchResultClick={cy.stub()}
      />
    )

    cy.contains('Load More').should('be.visible').click()
    cy.get('@onLoadMore').should('have.been.calledOnce')
  })

  it('shows spinner instead of button while fetching next page', () => {
    cy.mount(
      <NoteList
        notes={mockNotes}
        isLoading={false}
        onSelectNote={cy.stub()}
        onTagClick={cy.stub()}
        onLoadMore={cy.stub()}
        hasMore={true}
        isFetchingNextPage={true}
        ftsQuery=""
        ftsLoading={false}
        showFTSResults={false}
        onSearchResultClick={cy.stub()}
      />
    )

    cy.get('.animate-spin').should('be.visible')
    cy.contains('Load More').should('not.exist')
  })

  it('shows empty state when no notes and not loading', () => {
    cy.mount(
      <NoteList
        notes={[]}
        isLoading={false}
        onSelectNote={cy.stub()}
        onTagClick={cy.stub()}
        onLoadMore={cy.stub()}
        hasMore={false}
        isFetchingNextPage={false}
        ftsQuery=""
        ftsLoading={false}
        showFTSResults={false}
        onSearchResultClick={cy.stub()}
      />
    )

    cy.contains('No notes yet').should('be.visible')
    cy.contains('Create your first note to get started!').should('be.visible')
  })
})
