import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const user = { id: 'sidebar-viewport-user', email: 'sidebar@example.invalid' } as User
const notes = Array.from({ length: 30 }, (_, index) => ({
  id: `sidebar-viewport-${index}`,
  user_id: user.id,
  title: `Sidebar note ${String(index + 1).padStart(2, '0')}`,
  description: '<p>Example content</p>',
  tags: ['example'],
  created_at: '2026-09-22T10:00:00Z',
  updated_at: '2026-09-22T10:00:00Z',
}))

function App() {
  return <NotesShell controller={useNoteAppController()} />
}

function mountNotes() {
  const client = createClient('https://sidebar-viewport.invalid', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  cy.intercept('https://sidebar-viewport.invalid/**', req => {
    if (req.url.includes('/rest/v1/notes')) {
      const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
      req.reply({
        body: single ? notes[0] : notes,
        headers: { 'content-range': '0-29/30', 'access-control-expose-headers': 'content-range' },
      })
    } else {
      req.reply({ body: [] })
    }
  })
  cy.clearLocalStorage()
  cy.window().then(win => win.sessionStorage.clear())
  cy.then(() => webOfflineStorageAdapter.clearAll())
  cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
  cy.contains('[data-testid="note-card"]', 'Sidebar note 01').should('be.visible')
}

function goOffline() {
  cy.window().then(win => {
    Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false })
    win.dispatchEvent(new win.Event('offline'))
  })
  cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Offline')
}

function assertFooterWithinViewport() {
  cy.get('#notes-sidebar [data-cy="sign-out-button"], #notes-sidebar [aria-label="Open settings page"]')
    .should('have.length', 2).each($button => {
      const button = $button[0]
      const rect = button.getBoundingClientRect()
      const doc = button.ownerDocument
      const win = doc.defaultView!
      expect(rect.top, 'profile action starts within the viewport').to.be.at.least(0)
      expect(rect.bottom, 'profile action ends within the viewport').to.be.at.most(win.innerHeight)
      const target = doc.elementFromPoint((rect.left + rect.right) / 2, (rect.top + rect.bottom) / 2)
      expect(target && button.contains(target), 'profile action is not covered').to.equal(true)
    })
}

describe('Sidebar viewport layout', { retries: 0 }, () => {
  afterEach(() => {
    cy.window().then(win => {
      Reflect.deleteProperty(win.navigator, 'onLine')
      win.dispatchEvent(new win.Event('online'))
    })
    cy.document().then(doc => doc.documentElement.classList.remove('dark'))
  })

  it('keeps the desktop profile visible when a sync warning appears', () => {
    cy.viewport(1280, 800)
    mountNotes()
    assertFooterWithinViewport()
    goOffline()
    cy.screenshot('sidebar-desktop-offline', { capture: 'viewport' })
    assertFooterWithinViewport()
    cy.get('[data-cy="sign-out-button"]').focus().should('have.focus')
    assertFooterWithinViewport()
  })

  it('keeps the footer accessible and the long list scrollable on a short dark desktop', () => {
    cy.viewport(1024, 600)
    mountNotes()
    cy.document().then(doc => doc.documentElement.classList.add('dark'))
    goOffline()
    assertFooterWithinViewport()
    cy.get('#notes-list-container [role="list"]').should($list => {
      expect($list[0].scrollHeight, 'long note list overflows').to.be.greaterThan($list[0].clientHeight)
    }).scrollTo('bottom')
    cy.contains('[data-testid="note-card"]', 'Sidebar note 30').should('be.visible')
    // Virtual rows can resize when they enter view; scroll again after the last
    // row has rendered, then verify it can be reached in full.
    cy.get('#notes-list-container [role="list"]').scrollTo('bottom')
    cy.contains('[data-testid="note-card"]', 'Sidebar note 30').should($card => {
      const list = $card[0].closest('[role="list"]')
      expect(list, 'note list scroll container').not.to.equal(null)
      expect($card[0].getBoundingClientRect().bottom, 'last note is fully reachable')
        .to.be.at.most(list!.getBoundingClientRect().bottom + 1)
    })
    assertFooterWithinViewport()
    cy.screenshot('sidebar-desktop-short-dark', { capture: 'viewport' })
  })

  it('keeps mobile navigation and the sync warning within the viewport', () => {
    cy.viewport(320, 700)
    mountNotes()
    goOffline()
    cy.get('[data-cy="sign-out-button"]').should('not.be.visible')
    cy.get('[data-testid="mobile-action-settings"]').should('be.visible').then($button => {
      const rect = $button[0].getBoundingClientRect()
      expect(rect.bottom, 'mobile navigation remains within the viewport').to.be.at.most(700)
    })
    cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(320))
    cy.screenshot('sidebar-mobile-offline', { capture: 'viewport' })
    cy.viewport(390, 844)
    cy.get('[data-testid="device-sync-status"]').should('be.visible')
    cy.get('[data-testid="mobile-action-settings"]').should('be.visible').then($button => {
      expect($button[0].getBoundingClientRect().bottom, 'mobile navigation remains visible after resize').to.be.at.most(844)
    })
    cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(390))
  })
})
