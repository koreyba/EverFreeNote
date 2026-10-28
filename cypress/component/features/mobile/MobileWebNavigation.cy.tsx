import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const user = { id: 'mobile-web-user', email: 'mobile@example.invalid' } as User
const note = {
  id: 'mobile-note', user_id: user.id, title: 'Navigation note',
  description: '<p>Mobile navigation content</p>', tags: ['work'],
  created_at: '2026-09-22T10:00:00Z', updated_at: '2026-09-22T10:00:00Z',
}

function MobileWebApp() {
  const controller = useNoteAppController()
  return <NotesShell controller={controller} />
}

describe('Mobile web navigation', { retries: 0 }, () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    const client = createClient('https://mobile-web.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://mobile-web.invalid/**', (req) => {
      if (req.url.includes('/rest/v1/notes')) {
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        req.reply({ body: single ? note : [note], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    cy.clearLocalStorage()
    cy.window().then((win) => win.sessionStorage.clear())
    cy.then(() => webOfflineStorageAdapter.clearAll())
    function MountedApp() {
      return <SupabaseTestProvider supabase={client} user={user}><MobileWebApp /></SupabaseTestProvider>
    }
    cy.mount(<MountedApp />)
  })

  it('opens search from a note and returns to the note list with Notes', () => {
    cy.contains('[data-testid="note-card"] button', 'Navigation note').click()
    cy.contains('Mobile navigation content').should('be.visible')
    cy.get('[data-testid="mobile-action-search"]').click()
    cy.get('[data-testid="search-panel-input"]').should('be.visible')
    cy.get('[data-testid="mobile-nav-notes"]').click()
    cy.get('[data-testid="sidebar-container"]').should('be.visible')
    cy.contains('[data-testid="note-card"]', 'Navigation note').should('be.visible')
  })

  it('keeps the account email out of the mobile note list', () => {
    cy.get('[data-testid="sidebar-container"]').contains(user.email!).should('not.be.visible')
    cy.contains('[data-testid="note-card"]', 'Navigation note').should('be.visible')
  })

  it('offers an explicit way to select notes for bulk actions', () => {
    cy.contains('[data-testid="sidebar-container"] button', 'Select').click()
    cy.contains('[data-testid="note-card"] button', 'Navigation note').click()
    cy.get('[data-testid="selection-mode-count"]').should('have.attr', 'aria-label', '1 selected')
    cy.get('[data-testid="selection-mode-delete"]').should('be.enabled')
    cy.get('[data-testid="selection-mode-cancel"]').click()
    cy.get('[data-testid="selection-mode-actions"]').should('not.exist')
  })

  it('reveals a delete action on a left swipe without opening the note', () => {
    cy.intercept('DELETE', 'https://mobile-web.invalid/rest/v1/notes*').as('deleteNote')
    cy.contains('[data-testid="note-card"]', 'Navigation note').as('noteCard')
    cy.get('@noteCard').trigger('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 260, clientY: 200 })
      .trigger('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 170, clientY: 203 })
      .trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 170, clientY: 203 })
      .trigger('click')
    cy.get('[data-testid="sidebar-container"]').should('be.visible')
    cy.get('button[aria-label^="Delete note"]').should('have.attr', 'aria-label', 'Delete note "Navigation note"').should('be.visible').click()
    cy.get('[role="alertdialog"]').should('contain', 'Navigation note')
    cy.get('[role="alertdialog"]').contains('button', 'Cancel').click()
    cy.get('@deleteNote.all').should('have.length', 0)
    cy.contains('[data-testid="note-card"]', 'Navigation note').should('be.visible')
  })

  it('deletes only the swiped note after confirmation', () => {
    cy.intercept('DELETE', 'https://mobile-web.invalid/rest/v1/notes*', { statusCode: 204 }).as('confirmedDelete')
    cy.contains('[data-testid="note-card"]', 'Navigation note')
      .trigger('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 260, clientY: 200 })
      .trigger('pointermove', { pointerType: 'touch', pointerId: 1, clientX: 170, clientY: 203 })
      .trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 170, clientY: 203 })
    cy.get('button[aria-label^="Delete note"]').should('be.visible').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.wait('@confirmedDelete').its('request.url').should('include', 'mobile-note')
  })

  it('keeps long-press selection working alongside swipe', () => {
    cy.contains('[data-testid="note-card"]', 'Navigation note').should('be.visible')
    cy.clock()
    cy.contains('[data-testid="note-card"] button', 'Navigation note')
      .trigger('pointerdown', { pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 200 })
    cy.tick(550)
    cy.contains('[data-testid="note-card"] button', 'Navigation note')
      .trigger('pointerup', { pointerType: 'touch', pointerId: 1, clientX: 200, clientY: 200 })
      .trigger('click')
    cy.get('[data-testid="selection-mode-count"]').should('have.attr', 'aria-label', '1 selected')
    cy.get('[data-testid="sidebar-container"]').should('be.visible')
  })

  it('shows all notes for a tag selected from the Tags page after a previous search', () => {
    cy.contains('[data-testid="note-card"]', 'Navigation note').should('be.visible')
    cy.get('[data-testid="mobile-action-search"]').click()
    cy.get('[data-testid="search-panel-input"]').type('Navigation{enter}')
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.contains('button', /^work/).click()
    cy.get('[data-testid="search-panel-input"]').should('have.value', '')
    cy.contains('[data-testid="note-card"]', 'Navigation note').should('be.visible')
  })

  it('reopens a tag after returning to Notes and choosing the same tag again', () => {
    cy.contains('[data-testid="note-card"]', 'Navigation note').should('be.visible')
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.contains('button', /^work/).click()
    cy.get('[data-testid="search-panel-input"]').should('be.visible')
    cy.get('[data-testid="mobile-nav-notes"]').click()
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.contains('button', /^work/).click()
    cy.get('[data-testid="search-panel-input"]').should('be.visible')
  })
})
