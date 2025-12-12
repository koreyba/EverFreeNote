import React from 'react'
import { NoteList } from '@ui/web/components/features/notes/NoteList'
import { SearchResult, NoteViewModel } from '@core/types/domain'

const mockNotes: NoteViewModel[] = [
  {
    id: '1',
    title: 'Note 1',
    content: 'Content 1',
    description: 'Description 1',
    tags: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    user_id: 'u1'
  },
  {
    id: '2',
    title: 'Note 2',
    content: 'Content 2',
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
    rank: 0.9
  }
]

describe('NoteList', () => {
  const getDefaultProps = () => ({
    notes: [],
    isLoading: false,
    onSelectNote: cy.spy().as('onSelectNote'),
    onTagClick: cy.spy().as('onTagClick'),
    onLoadMore: cy.spy().as('onLoadMore'),
    hasMore: false,
    isFetchingNextPage: false,
    ftsQuery: '',
    ftsLoading: false,
    showFTSResults: false,
    onSearchResultClick: cy.spy().as('onSearchResultClick')
  })

  it('renders loading skeleton', () => {
    cy.mount(<NoteList {...getDefaultProps()} isLoading={true} />)
    // NoteListSkeleton renders divs with p-3
    cy.get('.space-y-1 > div').should('have.length', 5)
  })

  it('renders empty state', () => {
    cy.mount(<NoteList {...getDefaultProps()} notes={[]} />)
    cy.contains('No notes yet').should('be.visible')
  })

  it('renders regular list', () => {
    cy.mount(<NoteList {...getDefaultProps()} notes={mockNotes} />)
    cy.contains('Note 1').should('be.visible')
    cy.contains('Note 2').should('be.visible')
  })

  it('renders FTS loading', () => {
    cy.mount(<NoteList {...getDefaultProps()} ftsQuery="test" ftsLoading={true} />)
    cy.contains('Searching notes...').should('be.visible')
  })

  it('renders FTS results', () => {
    cy.mount(
      <NoteList
        {...getDefaultProps()}
        ftsQuery="test"
        showFTSResults={true}
        ftsData={{
          total: 1,
          executionTime: 10,
          results: mockFTSResults
        }}
      />
    )
    cy.contains('Found:').should('be.visible')
    cy.contains('1').should('be.visible')
    cy.contains('10ms').should('be.visible')
    cy.contains('Note 1').should('be.visible')
  })

  it('handles load more', () => {
    const props = getDefaultProps()
    cy.mount(
      <NoteList
        {...props}
        notes={mockNotes}
        hasMore={true}
      />
    )
    cy.contains('Load More').click()
    cy.get('@onLoadMore').should('have.been.called')
  })

  it('handles note selection', () => {
    const props = getDefaultProps()
    cy.mount(
      <NoteList
        {...props}
        notes={mockNotes}
      />
    )
    cy.contains('Note 1').click()
    cy.get('@onSelectNote').should('have.been.calledWith', mockNotes[0])
  })
})
