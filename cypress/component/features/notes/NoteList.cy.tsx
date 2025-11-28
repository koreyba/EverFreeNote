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

    // Check for skeleton elements (usually represented by animate-pulse or specific structure)
    cy.get('.animate-pulse').should('exist')
  })

  it('renders FTS search results when active', () => {
    const onSearchResultClickSpy = cy.spy().as('onSearchResultClick')

    cy.mount(
      <NoteList
        notes={mockNotes} // Should be ignored when showFTSResults is true
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

    // Should show search results, not regular notes
    cy.contains('Search Result 1').should('be.visible')
    cy.contains('Test Note 1').should('not.exist')
    
    // Check for search metadata
    cy.contains('Найдено: 1').should('be.visible')
    cy.contains('Быстрый поиск').should('be.visible')

    // Test click on search result
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

    cy.contains('Поиск заметок...').should('be.visible')
  })
})
