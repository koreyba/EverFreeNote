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

  it('renders correctly', () => {
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: '',
      onSearch: cy.stub(),
      onClearTagFilter: cy.stub(),
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onImportComplete: cy.stub(),
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(<Sidebar {...props} />)

    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('test@example.com').should('be.visible')
    cy.contains('New Note').should('be.visible')
    cy.get('[data-testid="note-list"]').should('be.visible')
  })

  it('handles search input', () => {
    const onSearch = cy.spy().as('onSearch')
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: '',
      onSearch,
      onClearTagFilter: cy.stub(),
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onImportComplete: cy.stub(),
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(<Sidebar {...props} />)

    cy.get('input[placeholder="Search notes..."]').type('test query')
    cy.get('@onSearch').should('have.been.called')
  })

  it('shows tag filter when active', () => {
    const onClearTagFilter = cy.spy().as('onClearTagFilter')
    const props = {
      user: mockUser,
      filterByTag: "work",
      searchQuery: '',
      onSearch: cy.stub(),
      onClearTagFilter,
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onImportComplete: cy.stub(),
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(
      <Sidebar
        {...props}
      />
    )

    cy.contains('work').should('be.visible')
    cy.contains('Clear filter').click()
    cy.get('@onClearTagFilter').should('have.been.called')
    cy.get('input').should('have.attr', 'placeholder', 'Search in "work" notes...')
  })

  it('handles actions', () => {
    const onCreateNote = cy.spy().as('onCreateNote')
    const onSignOut = cy.spy().as('onSignOut')
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: '',
      onSearch: cy.stub(),
      onClearTagFilter: cy.stub(),
      onCreateNote,
      onSignOut,
      onImportComplete: cy.stub(),
      children: <div data-testid="note-list">Note List Content</div>
    }

    cy.mount(
      <Sidebar
        {...props}
      />
    )

    cy.contains('New Note').click()
    cy.get('@onCreateNote').should('have.been.called')

    cy.get('button').find('.lucide-log-out').parent().click()
    cy.get('@onSignOut').should('have.been.called')
  })
})
