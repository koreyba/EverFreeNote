import React from 'react'
import { VirtualNoteList } from '@/components/VirtualNoteList'
import type { Note } from '@/types/domain'

// Mock List component to bypass react-window complexity in tests
const MockList = ({ children, itemCount, itemData, height, width }: any) => {
  const Row = children
  const items = []
  for (let i = 0; i < itemCount; i++) {
    items.push(
      <Row
        key={i}
        index={i}
        style={{ height: 120, width: '100%' }}
        data={itemData}
      />
    )
  }
  return <div style={{ height, width }} role="list">{items}</div>
}

describe('VirtualNoteList', () => {
  const mockNotes: Note[] = [
    {
      id: '1',
      title: 'Note 1',
      description: 'Description 1',
      tags: ['tag1', 'tag2'],
      updated_at: '2023-01-01T00:00:00Z',
      user_id: 'user1',
      created_at: '2023-01-01T00:00:00Z',
    },
    {
      id: '2',
      title: 'Note 2',
      description: 'Description 2',
      tags: [],
      updated_at: '2023-01-02T00:00:00Z',
      user_id: 'user1',
      created_at: '2023-01-02T00:00:00Z',
    },
  ]

  it('renders nothing if notes list is empty', () => {
    cy.mount(
      <VirtualNoteList
        notes={[]}
        selectedNote={null}
        onSelectNote={cy.spy()}
        onTagClick={cy.spy()}
        height={500}
        ListComponent={MockList}
      />
    )
    cy.get('[role="list"]').should('not.exist')
  })

  it('renders visible notes', () => {
    cy.mount(
      <div style={{ width: 500, height: 500 }}>
        <VirtualNoteList
          notes={mockNotes}
          selectedNote={null}
          onSelectNote={cy.spy()}
          onTagClick={cy.spy()}
          height={500}
          ListComponent={MockList}
        />
      </div>
    )
    cy.contains('Note 1').should('be.visible')
    cy.contains('Description 1').should('be.visible')
    cy.contains('Note 2').should('be.visible')
    cy.contains('Description 2').should('be.visible')
  })

  it('highlights selected note', () => {
    cy.mount(
      <div style={{ width: 500, height: 500 }}>
        <VirtualNoteList
          notes={mockNotes}
          selectedNote={mockNotes[0]}
          onSelectNote={cy.spy()}
          onTagClick={cy.spy()}
          height={500}
          ListComponent={MockList}
        />
      </div>
    )
    // Selected note has specific classes
    cy.contains('Note 1').closest('.group').should('have.class', 'bg-accent')
    cy.contains('Note 2').closest('.group').should('not.have.class', 'bg-accent')
  })

  it('calls onSelectNote when a note is clicked', () => {
    const onSelectNote = cy.spy().as('onSelectNote')
    cy.mount(
      <div style={{ width: 500, height: 500 }}>
        <VirtualNoteList
          notes={mockNotes}
          selectedNote={null}
          onSelectNote={onSelectNote}
          onTagClick={cy.spy()}
          height={500}
          ListComponent={MockList}
        />
      </div>
    )
    cy.contains('Note 1').click()
    cy.get('@onSelectNote').should('have.been.calledWith', mockNotes[0])
  })

  it('calls onTagClick when a tag is clicked and stops propagation', () => {
    const onTagClick = cy.spy().as('onTagClick')
    const onSelectNote = cy.spy().as('onSelectNote')
    
    cy.mount(
      <div style={{ width: 500, height: 500 }}>
        <VirtualNoteList
          notes={mockNotes}
          selectedNote={null}
          onSelectNote={onSelectNote}
          onTagClick={onTagClick}
          height={500}
          ListComponent={MockList}
        />
      </div>
    )
    
    // Note 1 has tags
    cy.contains('tag1').click()
    
    cy.get('@onTagClick').should('have.been.calledWith', 'tag1')
    cy.get('@onSelectNote').should('not.have.been.called')
  })
})
