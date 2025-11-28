import React from 'react'
import { Sidebar } from '@/components/features/notes/Sidebar'
import type { User } from '@supabase/supabase-js'

describe('Sidebar Component', () => {
  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  }

  const getDefaultProps = () => ({
    user: mockUser,
    filterByTag: null,
    searchQuery: '',
    onSearch: cy.stub(),
    onClearTagFilter: cy.stub(),
    onCreateNote: cy.stub(),
    onSignOut: cy.stub(),
    onImportComplete: cy.stub(),
    children: <div data-testid="note-list">Note List Content</div>
  })

  it('renders correctly', () => {
    cy.mount(<Sidebar {...getDefaultProps()} />)

    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('test@example.com').should('be.visible')
    cy.contains('New Note').should('be.visible')
    cy.get('[data-testid="note-list"]').should('be.visible')
  })

  it('handles search input', () => {
    const props = getDefaultProps()
    const onSearch = cy.spy().as('onSearch')
    cy.mount(<Sidebar {...props} onSearch={onSearch} />)

    cy.get('input[placeholder="Search notes..."]').type('test query')
    cy.get('@onSearch').should('have.been.called')
  })

  it('shows tag filter when active', () => {
    const props = getDefaultProps()
    const onClearTagFilter = cy.spy().as('onClearTagFilter')
    cy.mount(
      <Sidebar
        {...props}
        filterByTag="work"
        onClearTagFilter={onClearTagFilter}
      />
    )

    cy.contains('work').should('be.visible')
    cy.contains('Clear filter').click()
    cy.get('@onClearTagFilter').should('have.been.called')
    cy.get('input').should('have.attr', 'placeholder', 'Search in "work" notes...')
  })

  it('handles actions', () => {
    const props = getDefaultProps()
    const onCreateNote = cy.spy().as('onCreateNote')
    const onSignOut = cy.spy().as('onSignOut')

    cy.mount(
      <Sidebar
        {...props}
        onCreateNote={onCreateNote}
        onSignOut={onSignOut}
      />
    )

    cy.contains('New Note').click()
    cy.get('@onCreateNote').should('have.been.called')

    cy.get('button').find('.lucide-log-out').parent().click()
    cy.get('@onSignOut').should('have.been.called')
  })
})
