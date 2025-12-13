import React from 'react'
import { NoteList } from '@ui/web/components/features/notes/NoteList'
import type { Note, SearchResult } from '@core/types/domain'

const mockNotes: Note[] = [
  {
    id: '1',
    title: 'Note 1',
    description: 'Description 1',
    tags: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    user_id: 'u1'
  },
  {
    id: '2',
    title: 'Note 2',
    description: 'Description 2',
    tags: [],
    created_at: '2023-01-02T00:00:00Z',
    updated_at: '2023-01-02T00:00:00Z',
    user_id: 'u1'
  }
]

const mockFTSResults: SearchResult[] = [
  {
    ...mockNotes[0],
    headline: 'Found <b>Note</b>',
    rank: 0.9,
    content: 'Content 1'
  }
]

describe('NoteList Pagination', () => {
  const getBaseProps = () => ({
    notes: mockNotes,
    isLoading: false,
    onSelectNote: cy.stub().as('onSelectNote'),
    onToggleSelect: cy.stub().as('onToggleSelect'),
    onTagClick: cy.stub().as('onTagClick'),
    onLoadMore: cy.stub().as('onLoadMore'),
    hasMore: false,
    isFetchingNextPage: false,
    ftsQuery: '',
    ftsLoading: false,
    showFTSResults: false,
    ftsHasMore: false,
    ftsLoadingMore: false,
    onLoadMoreFts: cy.stub().as('onLoadMoreFts'),
    onSearchResultClick: cy.stub().as('onSearchResultClick'),
  })

  it('renders "Load more" button as the last item in regular list', () => {
    cy.mount(
      <div style={{ height: 500, width: 500 }}>
        <NoteList {...getBaseProps()} hasMore={true} />
      </div>
    )
    
    // Should see notes
    cy.contains('Note 1').should('be.visible')
    cy.contains('Note 2').should('be.visible')
    
    // Should see Load More button
    cy.contains('button', 'Load more...').should('be.visible')
    
    // Verify it's inside the virtual list
    // The button should be inside a div with absolute positioning (which react-window uses for rows)
    cy.contains('button', 'Load more...')
      .closest('[style*="position: absolute"]')
      .should('exist')
  })

  it('renders loading spinner as the last item when fetching next page', () => {
    cy.mount(
      <div style={{ height: 500, width: 500 }}>
        <NoteList {...getBaseProps()} hasMore={true} isFetchingNextPage={true} />
      </div>
    )
    
    // Should see notes
    cy.contains('Note 1').should('be.visible')
    
    // Should NOT see Load More button
    cy.contains('button', 'Load more...').should('not.exist')
    
    // Should see spinner (Loader2 usually has animate-spin class)
    cy.get('.animate-spin').should('be.visible')
  })

  it('renders "Load more" button as the last item in FTS list', () => {
    cy.mount(
      <div style={{ height: 500, width: 500 }}>
        <NoteList 
          {...getBaseProps()} 
          showFTSResults={true}
          ftsData={{
            total: 10,
            executionTime: 10,
            results: mockFTSResults
          }}
          ftsHasMore={true}
        />
      </div>
    )
    
    // Should see search result
    cy.contains('Note 1').should('be.visible')
    
    // Should see Load More button
    cy.contains('button', 'Load more...').should('be.visible')
  })
})
