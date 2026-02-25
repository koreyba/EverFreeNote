import React from 'react'
import { NoteList } from '../../../../ui/web/components/features/notes/NoteList'
import type { Note } from '../../../../core/types/domain'

const generateNotes = (count: number): Note[] => {
  return Array.from({ length: count }, (_, i) => ({
    id: `${i}`,
    title: `Note ${i}`,
    description: `Description ${i}`,
    tags: [],
    created_at: '2023-01-01T00:00:00Z',
    updated_at: '2023-01-01T00:00:00Z',
    user_id: 'u1'
  }))
}

describe('NoteList Virtualization', () => {
  const getBaseProps = () => ({
    isLoading: false,
    onSelectNote: cy.stub(),
    onToggleSelect: cy.stub(),
    onTagClick: cy.stub(),
    onLoadMore: cy.stub(),
    hasMore: false,
    isFetchingNextPage: false,
    ftsQuery: '',
    ftsLoading: false,
    showFTSResults: false,
    ftsHasMore: false,
    ftsLoadingMore: false,
    onLoadMoreFts: cy.stub(),
    onSearchResultClick: cy.stub(),
  })

  it('renders only visible items for large lists', () => {
    const notes = generateNotes(100)
    
    // We pass explicit height/width to NoteList to bypass AutoSizer in tests
    // This ensures we are testing the virtualization logic, not AutoSizer's behavior in Cypress
    cy.mount(
      <div style={{ height: 500, width: 500 }}>
        <NoteList {...getBaseProps()} notes={notes} height={500} width={500} />
      </div>
    )

    // Check that we have the first note
    cy.contains('Note 0').should('be.visible')
    
    // Check that we DON'T have the last note (it shouldn't be rendered yet)
    cy.contains('Note 99').should('not.exist')
    
    // Verify DOM node count. 
    // Assuming row height is around 50-100px, 500px height should render ~5-10 items + overscan (5).
    // So we expect < 20 items.
    cy.get('[data-testid="note-card"]').should('have.length.lt', 20)
  })

  it('renders new items on scroll', () => {
    const notes = generateNotes(100)
    
    cy.mount(
      <div style={{ height: 500, width: 500 }}>
        <NoteList {...getBaseProps()} notes={notes} height={500} width={500} />
      </div>
    )

    // Scroll to bottom of the virtual list container
    // We need to find the scrollable container.
    // NoteList renders: <div className="flex-1 h-full min-h-0"> <Sizer> ...
    // The scrollable div is the one created by react-window.
    // We can find it by finding the parent of the first note card that has overflow style.
    
    // We use { ensureScrollable: false } because sometimes Cypress thinks the element is not scrollable 
    // if it's covered or has specific styles, but react-window divs are scrollable.
    
    // Target the scrollable container directly. react-window renders a div with overflow: auto/scroll.
    cy.get('div[style*="overflow"]').should('exist').scrollTo('bottom', { ensureScrollable: false, duration: 100 })
    
    // Wait for virtualization to catch up
    
    // Now the last note should be visible
    cy.contains('Note 99').should('be.visible')
    
    // And the first note should be gone (virtualized out)
    cy.contains('Note 0').should('not.exist')
  })
})
