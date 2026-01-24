import React from 'react'
import { VirtualNoteList } from '../../ui/web/components/VirtualNoteList'
import type { Note } from '../../core/types/domain'

// Mock List component to avoid react-window issues in test environment.
// It must forward itemData to Row so the row renderer receives notes/handlers.
type MockListProps = {
  itemCount: number
  itemData: unknown
  children: React.ComponentType<{ index: number; style: React.CSSProperties; data: unknown }>
}

const MockList = ({ itemCount, itemData, children: Row }: MockListProps) => (
  <div className="mock-list">
    {Array.from({ length: itemCount }).map((_, index) => (
      <Row key={index} index={index} style={{ height: 120 }} data={itemData} />
    ))}
  </div>
)

describe('VirtualNoteList Component', () => {
  const mockNotes: Note[] = Array.from({ length: 20 }).map((_, i) => ({
    id: `${i}`,
    title: `Note ${i}`,
    description: `Description ${i}`,
    tags: ['tag1'],
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
    user_id: 'user1'
  }))

  it('renders list of notes', () => {
    const onSelectNote = cy.stub().as('onSelectNote')
    const onTagClick = cy.stub().as('onTagClick')
    
    cy.mount(
      <VirtualNoteList 
        notes={mockNotes}
        selectedNote={null}
        onSelectNote={onSelectNote}
        onTagClick={onTagClick}
        height={500}
        ListComponent={MockList}
      />
    )

    // Virtual list only renders visible items (but our mock renders all)
    cy.contains('Note 0').should('be.visible')
    cy.contains('Note 1').should('be.visible')
    // Check that we have some items
    cy.get('.p-3').should('have.length', 20)
  })

  it('handles selection', () => {
    const onSelectNote = cy.stub().as('onSelectNote')
    const onTagClick = cy.stub().as('onTagClick')

    cy.mount(
      <VirtualNoteList 
        notes={mockNotes}
        selectedNote={null}
        onSelectNote={onSelectNote}
        onTagClick={onTagClick}
        height={500}
        ListComponent={MockList}
      />
    )

    cy.contains('Note 0').click()
    cy.get('@onSelectNote').should('have.been.calledWith', mockNotes[0])
  })

  it('highlights selected note', () => {
    const onSelectNote = cy.stub().as('onSelectNote')
    const onTagClick = cy.stub().as('onTagClick')

    cy.mount(
      <VirtualNoteList 
        notes={mockNotes}
        selectedNote={mockNotes[0]}
        onSelectNote={onSelectNote}
        onTagClick={onTagClick}
        height={500}
        ListComponent={MockList}
      />
    )

    cy.contains('Note 0').parents('.p-3').should('have.class', 'bg-accent')
    cy.contains('Note 1').parents('.p-3').should('not.have.class', 'bg-accent')
  })

  it('handles tag click', () => {
    const onSelectNote = cy.stub().as('onSelectNote')
    const onTagClick = cy.stub().as('onTagClick')

    cy.mount(
      <VirtualNoteList 
        notes={mockNotes}
        selectedNote={null}
        onSelectNote={onSelectNote}
        onTagClick={onTagClick}
        height={500}
        ListComponent={MockList}
      />
    )

    // Find a tag and click it. Note: InteractiveTag might need specific selector
    cy.contains('tag1').first().click()
    // Depending on InteractiveTag implementation, we might need to adjust selector
    // But assuming it propagates click
    cy.get('@onTagClick').should('have.been.calledWith', 'tag1')
  })

  it('renders nothing when there are no notes', () => {
    const onSelectNote = cy.stub().as('onSelectNote')
    const onTagClick = cy.stub().as('onTagClick')

    cy.mount(
      <VirtualNoteList
        notes={[]}
        selectedNote={null}
        onSelectNote={onSelectNote}
        onTagClick={onTagClick}
        height={500}
        ListComponent={MockList}
      />
    )

    cy.get('.mock-list').should('not.exist')
  })

  it('renders skeleton row when item data missing', () => {
    const SparseList = ({ children: Row }: MockListProps) => (
      <div className="mock-list">
        <Row index={0} style={{ height: 120 }} data={{ notes: mockNotes.slice(0, 1), selectedNote: null, onSelectNote: cy.stub(), onTagClick: cy.stub() }} />
        <Row index={1} style={{ height: 120 }} data={{ notes: mockNotes.slice(0, 1), selectedNote: null, onSelectNote: cy.stub(), onTagClick: cy.stub() }} />
      </div>
    )

    cy.mount(
      <VirtualNoteList
        notes={mockNotes.slice(0, 1)}
        selectedNote={null}
        onSelectNote={cy.stub()}
        onTagClick={cy.stub()}
        height={500}
        ListComponent={SparseList}
      />
    )

    cy.get('.animate-pulse').should('exist')
  })
})
