import React from 'react'
import { NoteList } from '../../../../ui/web/components/features/notes/NoteList'
import type { Note, SearchResult } from '../../../../core/types/domain'

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

describe('NoteList Component', () => {
  const getBaseProps = () => ({
    notes: [],
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

  it('renders loading skeleton', () => {
    cy.mount(<NoteList {...getBaseProps()} isLoading={true} />)
    // NoteListSkeleton renders divs with animate-pulse
    cy.get('.animate-pulse').should('exist')
  })

  it('renders empty state', () => {
    cy.mount(<NoteList {...getBaseProps()} notes={[]} />)
    cy.contains('No notes yet').should('be.visible')
  })

  it('renders regular list', () => {
    cy.mount(
      <div style={{ height: 500, width: 500 }}>
        <NoteList {...getBaseProps()} notes={mockNotes} />
      </div>
    )
    cy.contains('Note 1').should('be.visible')
    cy.contains('Note 2').should('be.visible')
  })

  it('renders FTS loading', () => {
    cy.mount(<NoteList {...getBaseProps()} ftsQuery='test' ftsLoading={true} />)
    cy.contains('Searching notes...').should('be.visible')
  })

  it('renders FTS results', () => {
    cy.mount(
      <div style={{ height: 500, width: 500 }}>
        <NoteList
          {...getBaseProps()}
          ftsQuery='test'
          showFTSResults={true}
          ftsData={{
            total: 1,
            executionTime: 10,
            results: mockFTSResults
          }}
        />
      </div>
    )
    cy.contains('Found:').should('be.visible')
    cy.contains('1').should('be.visible')
    cy.contains('10ms').should('be.visible')
    cy.contains('Note 1').should('be.visible')
  })

  it('handles note selection', () => {
    const props = getBaseProps()
    cy.mount(
      <div style={{ height: 500, width: 500 }}>
        <NoteList
          {...props}
          notes={mockNotes}
        />
      </div>
    )
    cy.contains('Note 1').click()
    cy.get('@onSelectNote').should('have.been.calledWith', Cypress.sinon.match.has('id', mockNotes[0].id))
  })

  it('keeps one swipe action open and deletes the intended note', () => {
    cy.viewport(390, 844)
    const onDeleteNote = cy.stub().as('onDeleteNote')
    cy.mount(<NoteList {...getBaseProps()} notes={mockNotes} onDeleteNote={onDeleteNote} height={500} width={390} />)
    const swipeLeft = (title: string) => {
      cy.contains('[data-testid="note-card"]', title)
        .trigger('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 250, clientY: 100 })
        .trigger('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 155, clientY: 102 })
        .trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 155, clientY: 102 })
        .trigger('click')
    }
    swipeLeft('Note 1')
    cy.get('button[aria-label=\'Delete note "Note 1"\']').should('be.visible')
    swipeLeft('Note 2')
    cy.get('button[aria-label=\'Delete note "Note 1"\']').should('be.disabled').and('have.attr', 'aria-hidden', 'true')
    cy.get('button[aria-label=\'Delete note "Note 2"\']').should('be.visible').click()
    cy.get('@onDeleteNote').should('have.been.calledOnceWith', Cypress.sinon.match.has('id', '2'))
    cy.get('@onSelectNote').should('not.have.been.called')
  })

  it('does not reveal delete during vertical scrolling or a short swipe', () => {
    cy.viewport(390, 844)
    cy.mount(<NoteList {...getBaseProps()} notes={mockNotes} onDeleteNote={cy.stub()} height={500} width={390} />)
    cy.contains('[data-testid="note-card"]', 'Note 1')
      .trigger('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 250, clientY: 100 })
      .trigger('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 245, clientY: 160 })
      .trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 245, clientY: 160 })
    cy.get('button[aria-label=\'Delete note "Note 1"\']').should('be.disabled').and('have.attr', 'aria-hidden', 'true')
    cy.contains('[data-testid="note-card"]', 'Note 1')
      .trigger('pointerdown', { pointerType: 'touch', pointerId: 2, clientX: 250, clientY: 100 })
      .trigger('pointermove', { pointerType: 'touch', pointerId: 2, clientX: 225, clientY: 102 })
      .trigger('pointerup', { pointerType: 'touch', pointerId: 2, clientX: 225, clientY: 102 })
    cy.get('button[aria-label=\'Delete note "Note 1"\']').should('be.disabled').and('have.attr', 'aria-hidden', 'true')
  })

  it('reveals delete on mobile full-text search results', () => {
    cy.viewport(390, 844)
    const onDeleteNote = cy.stub().as('onDeleteSearchResult')
    cy.mount(<NoteList {...getBaseProps()} onDeleteNote={onDeleteNote} height={500} width={390}
      showFTSResults ftsData={{ total: 1, results: mockFTSResults }} />)
    cy.contains('[data-testid="note-card"]', 'Note 1')
      .trigger('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 250, clientY: 100 })
      .trigger('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 160, clientY: 102 })
      .trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 160, clientY: 102 })
    cy.get('button[aria-label=\'Delete note "Note 1"\']').should('be.visible').click()
    cy.get('@onDeleteSearchResult').should('have.been.calledOnceWith', Cypress.sinon.match.has('id', '1'))
  })

  describe('FTS Header Logic', () => {
    const mockResult = (overrides: Partial<SearchResult> = {}): SearchResult => ({
      id: '1',
      title: 'Result',
      description: '',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'user1',
      rank: 0.5,
      headline: '',
      ...overrides,
    })

    it('uses server total when provided', () => {
      const ftsData = {
        total: 50,
        executionTime: 123,
        results: [mockResult()],
      }
  
      cy.mount(
        <div style={{ height: 500, width: 500 }}>
          <NoteList
            {...getBaseProps()}
            showFTSResults
            ftsData={ftsData}
          />
        </div>
      )
  
      cy.contains('Found: 50').should('be.visible')
    })
  
    it('falls back to loaded count when total is unknown', () => {
      const ftsData = {
        total: undefined,
        executionTime: 123,
        results: [mockResult(), mockResult({ id: '2' })],
      }
  
      cy.mount(
        <div style={{ height: 500, width: 500 }}>
          <NoteList
            {...getBaseProps()}
            showFTSResults
            ftsData={ftsData}
          />
        </div>
      )
  
      cy.contains('Found: 2').should('be.visible')
    })
  })
})
