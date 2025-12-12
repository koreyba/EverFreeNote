import React from 'react'
import { Sidebar } from '@/components/features/notes/Sidebar'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'

describe('Sidebar Component', () => {
  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString()
  }

  const createSelectionProps = () => ({
    notesDisplayed: 0,
    notesTotal: 0,
    selectionMode: false,
    selectedCount: 0,
    bulkDeleting: false,
    onEnterSelectionMode: cy.stub(),
    onExitSelectionMode: cy.stub(),
    onSelectAll: cy.stub(),
    onClearSelection: cy.stub(),
    onBulkDelete: cy.stub(),
  })

  const createMockSupabase = (user: User | null) => {
    return {
      auth: {
        getUser: cy.stub().resolves({ data: { user } }),
        signOut: cy.stub().resolves({ error: null }),
      },
      storage: {
        from: cy.stub().returns({
          upload: cy.stub().resolves({ data: { path: '' }, error: null }),
          getPublicUrl: cy.stub().returns({ data: { publicUrl: 'https://example.com' }, error: null }),
        }),
      },
    } as unknown as SupabaseClient
  }

  const wrapWithProvider = (node: React.ReactNode, user: User | null = mockUser) => (
    <SupabaseTestProvider supabase={createMockSupabase(user)} user={user}>
      {node}
    </SupabaseTestProvider>
  )

  it('renders correctly', () => {
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: '',
      onSearch: cy.stub(),
      onClearTagFilter: cy.stub(),
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onDeleteAccount: cy.stub(),
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(wrapWithProvider(<Sidebar {...props} />))

    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('test@example.com').should('be.visible')
    cy.contains('New Note').should('be.visible')
    cy.contains('Notes displayed: 0 out of 0').should('be.visible')
    cy.get('[data-testid="note-list"]').should('be.visible')
  })

  it('shows provided displayed/total counts', () => {
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: '',
      onSearch: cy.stub(),
      onClearTagFilter: cy.stub(),
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onDeleteAccount: cy.stub(),
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      notesDisplayed: 5,
      notesTotal: 12,
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(wrapWithProvider(<Sidebar {...props} />))

    cy.contains('Notes displayed: 5 out of 12').should('be.visible')
  })

  it('shows unknown total when not provided', () => {
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: '',
      onSearch: cy.stub(),
      onClearTagFilter: cy.stub(),
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onDeleteAccount: cy.stub(),
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      notesDisplayed: 5,
      notesTotal: undefined,
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(wrapWithProvider(<Sidebar {...props} />))

    cy.contains('Notes displayed: 5 out of unknown').should('be.visible')
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
      onDeleteAccount: cy.stub(),
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(wrapWithProvider(<Sidebar {...props} />))

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
      onDeleteAccount: cy.stub(),
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(wrapWithProvider(<Sidebar {...props} />))

    cy.contains('work').should('be.visible')
    cy.contains('Clear Tags').click()
    cy.get('@onClearTagFilter').should('have.been.called')
    cy.get('input').should('have.attr', 'placeholder', 'Search in "work" notes...')
  })

  it('handles clear search button', () => {
    const onSearch = cy.spy().as('onSearch')
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: 'test query',
      onSearch,
      onClearTagFilter: cy.stub(),
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onDeleteAccount: cy.stub(),
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(wrapWithProvider(<Sidebar {...props} />))

    // Button should be visible when there is a query
    cy.get('button').find('.lucide-x').should('exist')
    
    // Tooltip check (might need trigger)
    cy.get('button').find('.lucide-x').parent().trigger('mouseenter')
    cy.contains('Clear Search').should('exist')

    cy.get('button').find('.lucide-x').parent().click()
    cy.get('@onSearch').should('have.been.calledWith', '')
  })

  it('does not show clear search button when query is empty', () => {
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: '',
      onSearch: cy.stub(),
      onClearTagFilter: cy.stub(),
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onDeleteAccount: cy.stub(),
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      children: <div data-testid="note-list">Note List Content</div>
    }
    cy.mount(wrapWithProvider(<Sidebar {...props} />))

    cy.get('button').find('.lucide-x').should('not.exist')
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
      onDeleteAccount: cy.stub(),
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      children: <div data-testid="note-list">Note List Content</div>
    }

    cy.mount(wrapWithProvider(<Sidebar {...props} />))

    cy.contains('New Note').click()
    cy.get('@onCreateNote').should('have.been.called')

    cy.get('button').find('.lucide-log-out').parent().click()
    cy.get('@onSignOut').should('have.been.called')
  })

  it('shows delete account dialog and requires acknowledgement', () => {
    const onDeleteAccount = cy.spy().as('onDeleteAccount')
    const props = {
      user: mockUser,
      filterByTag: null,
      searchQuery: '',
      onSearch: cy.stub(),
      onClearTagFilter: cy.stub(),
      onCreateNote: cy.stub(),
      onSignOut: cy.stub(),
      onDeleteAccount,
      deleteAccountLoading: false,
      onImportComplete: cy.stub(),
      onExportComplete: cy.stub(),
      ...createSelectionProps(),
      children: <div data-testid="note-list">Note List Content</div>
    }

    cy.mount(wrapWithProvider(<Sidebar {...props} />))

    cy.get('button').find('.lucide-settings').parent().click()
    cy.contains('Delete my account').click()

    cy.contains('Delete my account').should('be.visible')
    cy.contains('Delete account').should('be.disabled')

    // shadcn Checkbox renders role="checkbox"
    cy.get('[role="checkbox"]').click({ force: true })
    cy.contains('Delete account').click()

    cy.get('@onDeleteAccount').should('have.been.calledOnce')
  })
})
