import React from 'react'
import type { SupabaseClient, User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { Sidebar } from '@ui/web/components/features/notes/Sidebar'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'

const user = { id: 'sidebar-user', email: 'sidebar@example.invalid' } as User
const supabase = { auth: {} } as SupabaseClient

function renderSidebar(options: { withSearch?: boolean; width?: number } = {}) {
  cy.mount(
    <SupabaseTestProvider supabase={supabase} user={user}>
      <div className="flex" style={{ width: options.width ?? 1000, height: 800 }}>
        <Sidebar
          user={user} filterByTag={null} notesDisplayed={0} notesTotal={0}
          selectionMode={false} selectedCount={0} bulkDeleting={false} isOffline={false}
          onEnterSelectionMode={() => {}} onExitSelectionMode={() => {}} onSelectAll={() => {}}
          onBulkDelete={() => {}} onClearTagFilter={() => {}} onOpenSettings={() => {}}
          onCreateNote={() => {}} onSignOut={() => {}} onOpenSearch={() => {}}
          data-testid="sidebar-container" className="w-full"
        >Notes</Sidebar>
        {options.withSearch && <aside data-testid="search-results-panel" data-notes-search-pane style={{ width: 350, flex: 'none' }} />}
        <main className="flex-1 min-w-0" data-testid="editor-container" />
      </div>
    </SupabaseTestProvider>
  )
}

describe('Resizable notes sidebar', { retries: 0 }, () => {
  beforeEach(() => {
    cy.viewport(1280, 900)
    cy.clearLocalStorage()
  })

  it('widens the notes sidebar by dragging its right edge', () => {
    renderSidebar()
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '320px')
    cy.get('[role="separator"][aria-label="Resize notes sidebar"]')
      .trigger('pointerdown', { pointerType: 'mouse', pointerId: 1, isPrimary: true, button: 0, clientX: 320 })
    cy.document().trigger('pointermove', { pointerType: 'mouse', pointerId: 1, clientX: 400 })
    cy.document().trigger('pointerup', { pointerType: 'mouse', pointerId: 1, clientX: 400 })
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '400px')
  })

  it('keeps the width within bounds and supports keyboard resizing', () => {
    renderSidebar()
    cy.get('[role="separator"][aria-label="Resize notes sidebar"]').focus()
      .trigger('keydown', { key: 'End' })
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '500px')
    cy.get('[role="separator"][aria-label="Resize notes sidebar"]').trigger('keydown', { key: 'Home' })
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '280px')
    cy.get('[role="separator"][aria-label="Resize notes sidebar"]').trigger('keydown', { key: 'ArrowRight' })
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '300px')
  })

  it('remembers the chosen width and restores it', () => {
    renderSidebar()
    cy.get('[role="separator"][aria-label="Resize notes sidebar"]').trigger('keydown', { key: 'ArrowRight' })
    cy.window().its('localStorage').invoke('getItem', 'notes-sidebar-width').should('equal', '340')
    renderSidebar()
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '340px')
  })

  it('leaves room for the editor when the search panel is open', () => {
    renderSidebar({ withSearch: true })
    cy.get('[role="separator"][aria-label="Resize notes sidebar"]').trigger('keydown', { key: 'End' })
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '370px')
    cy.get('[data-testid="editor-container"]').should('have.css', 'width', '280px')
    cy.get('[data-testid="search-results-panel"]').invoke('css', 'width', '400px')
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '320px')
    cy.get('[data-testid="editor-container"]').should('have.css', 'width', '280px')
    cy.get('[data-testid="search-results-panel"]').invoke('css', 'width', '300px')
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '370px')
  })

  it('keeps the mobile sidebar full width without a resize handle', () => {
    cy.viewport(390, 844)
    renderSidebar({ width: 390 })
    cy.get('[data-testid="sidebar-container"]').should('have.css', 'width', '390px')
    cy.get('[role="separator"][aria-label="Resize notes sidebar"]').should('not.be.visible')
  })
})
