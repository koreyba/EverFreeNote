import React from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'

import { Sidebar } from '../../../../ui/web/components/features/notes/Sidebar'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'

describe('Sidebar Component', () => {
  const mockUser: User = {
    id: 'user1',
    email: 'test@example.com',
    app_metadata: {},
    user_metadata: {},
    aud: 'authenticated',
    created_at: new Date().toISOString(),
  }

  const createSelectionProps = () => ({
    notesDisplayed: 0,
    notesTotal: 0,
    selectionMode: false,
    selectedCount: 0,
    bulkDeleting: false,
    isOffline: false,
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

  const createBaseProps = () => ({
    user: mockUser,
    filterByTag: null,
    onOpenSearch: cy.stub(),
    onOpenSettings: cy.stub(),
    onClearTagFilter: cy.stub(),
    onCreateNote: cy.stub(),
    onSignOut: cy.stub(),
    ...createSelectionProps(),
    children: <div data-testid="note-list">Note List Content</div>,
  })

  it('renders correctly', () => {
    cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} />))

    cy.contains('EverFreeNote').should('be.visible')
    cy.contains('test@example.com').should('be.visible')
    cy.contains('New Note').should('be.visible')
    cy.contains('Notes displayed: 0 out of 0').should('be.visible')
    cy.get('[data-testid="note-list"]').should('be.visible')
  })

  it('shows provided displayed/total counts', () => {
    cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} notesDisplayed={5} notesTotal={12} />))

    cy.contains('Notes displayed: 5 out of 12').should('be.visible')
  })

  it('does not render legacy Select Notes button when selection mode is off', () => {
    cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} selectionMode={false} />))

    cy.contains('Select Notes').should('not.exist')
    cy.contains('Select all').should('not.exist')
    cy.contains(/^Delete \(\d+\)$/).should('not.exist')
  })

  it('shows unknown total when not provided', () => {
    cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} notesDisplayed={5} notesTotal={undefined} />))

    cy.contains('Notes displayed: 5 out of unknown').should('be.visible')
  })

  it('opens search panel when trigger is clicked', () => {
    const onOpenSearch = cy.spy().as('onOpenSearch')
    cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} onOpenSearch={onOpenSearch} />))

    cy.contains('Click to search').click()
    cy.get('@onOpenSearch').should('have.been.calledOnce')
  })

  it('renders search trigger as focusable button for keyboard accessibility', () => {
    const onOpenSearch = cy.stub().as('onOpenSearch')
    cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} onOpenSearch={onOpenSearch} />))

    cy.get('[data-testid="sidebar-search-trigger"]')
      .should('have.prop', 'tagName', 'BUTTON')
      .focus()
      .should('have.focus')
    cy.get('@onOpenSearch').should('not.have.been.called')
  })

  it('keeps static search hint when tag filter is active', () => {
    const onClearTagFilter = cy.spy().as('onClearTagFilter')
    cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} filterByTag="work" onClearTagFilter={onClearTagFilter} />))

    cy.contains('Click to search').should('be.visible')
    cy.contains('Search in "work" notes...').should('not.exist')
    cy.get('@onClearTagFilter').should('not.have.been.called')
  })

  it('handles primary actions', () => {
    const onCreateNote = cy.spy().as('onCreateNote')
    const onSignOut = cy.spy().as('onSignOut')
    const onOpenSettings = cy.spy().as('onOpenSettings')

    cy.mount(
      wrapWithProvider(
        <Sidebar
          {...createBaseProps()}
          onCreateNote={onCreateNote}
          onSignOut={onSignOut}
          onOpenSettings={onOpenSettings}
        />
      )
    )

    cy.contains('New Note').click()
    cy.get('@onCreateNote').should('have.been.calledOnce')

    cy.get('button[aria-label="Open settings page"]').click()
    cy.get('@onOpenSettings').should('have.been.calledOnce')

    cy.get('button').find('.lucide-log-out').parent().click()
    cy.get('@onSignOut').should('have.been.calledOnce')
  })

  it('renders selection actions only in selection mode and confirms before bulk delete', () => {
    const onBulkDelete = cy.spy().as('onBulkDelete')

    cy.mount(
      wrapWithProvider(
        <Sidebar
          {...createBaseProps()}
          selectionMode
          selectedCount={1}
          notesDisplayed={3}
          onBulkDelete={onBulkDelete}
        />
      )
    )

    cy.contains('button', 'Select all').should('be.visible')
    cy.contains('button', 'Delete (1)').click({ force: true })
    cy.get('@onBulkDelete').should('not.have.been.called')

    cy.contains('Delete selected notes').should('be.visible')
    cy.get('input[placeholder="1"]').clear().type('1')
    cy.get('[role="alertdialog"]')
      .contains('button', /^Delete$/)
      .click({ force: true })

    cy.get('@onBulkDelete').should('have.been.calledOnce')
  })

  describe('Sync Status Indicator', () => {
    it('shows synchronized status when online with no pending or failed', () => {
      cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} isOffline={false} pendingCount={0} failedCount={0} />))

      cy.contains('Synchronized').should('be.visible')
      cy.contains('Synchronized').should('have.class', 'text-emerald-600')
    })

    it('shows syncing status with count when pendingCount > 0', () => {
      cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} isOffline={false} pendingCount={3} failedCount={0} />))

      cy.contains('Syncing: 3').should('be.visible')
      cy.contains('Syncing: 3').should('have.class', 'animate-pulse')
    })

    it('shows sync failed status with count when failedCount > 0', () => {
      cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} isOffline={false} pendingCount={0} failedCount={2} />))

      cy.contains('Sync failed: 2').should('be.visible')
      cy.contains('Sync failed: 2').should('have.class', 'text-destructive')
    })

    it('shows offline mode when isOffline is true', () => {
      cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} isOffline pendingCount={0} failedCount={0} />))

      cy.contains('Offline mode').should('be.visible')
      cy.contains('Offline mode').should('have.class', 'text-amber-600')
    })

    it('prioritizes offline status over other statuses', () => {
      cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} isOffline pendingCount={5} failedCount={3} />))

      cy.contains('Offline mode').should('be.visible')
      cy.contains('Syncing').should('not.exist')
      cy.contains('Sync failed').should('not.exist')
    })

    it('prioritizes failed status over pending status', () => {
      cy.mount(wrapWithProvider(<Sidebar {...createBaseProps()} isOffline={false} pendingCount={5} failedCount={2} />))

      cy.contains('Sync failed: 2').should('be.visible')
      cy.contains('Syncing').should('not.exist')
    })
  })
})
