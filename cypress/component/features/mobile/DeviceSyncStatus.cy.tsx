import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const user = { id: 'device-sync-status-test', email: 'sync-status@example.invalid' } as User
const note = {
  id: 'device-sync-status-note', user_id: user.id, title: 'Sync status note',
  description: '<p>Original content</p>', tags: ['work'],
  created_at: '2026-09-22T10:00:00Z', updated_at: '2026-09-22T10:00:00Z',
}

function App() {
  return <NotesShell controller={useNoteAppController()} />
}

async function waitForQueue(predicate: (statuses: string[]) => boolean) {
  for (let i = 0; i < 100; i++) {
    const statuses = (await webOfflineStorageAdapter.getQueue()).map(item => item.status)
    if (predicate(statuses)) return statuses
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('Timed out waiting for expected queue status')
}

describe('Device sync status', { retries: 0 }, () => {
  afterEach(() => {
    cy.window().then(win => {
      Reflect.deleteProperty(win.navigator, 'onLine')
      win.dispatchEvent(new win.Event('online'))
    })
    cy.document().then(doc => doc.documentElement.classList.remove('dark'))
  })

  it('shows offline and waiting changes in the mobile editor, reader, and tag view', () => {
    cy.viewport(390, 700)
    const client = createClient('https://device-status.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://device-status.invalid/**', req => {
      if (req.url.includes('/rest/v1/notes')) {
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        req.reply({ body: single ? note : [note], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    cy.clearLocalStorage()
    cy.window().then(win => win.sessionStorage.clear())
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]').should('have.class', 'sr-only').and('not.contain.text', 'Synchronized')
    cy.contains('[data-testid="note-card"] button', 'Sync status note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { value: false, configurable: true })
      win.dispatchEvent(new win.Event('offline'))
    })
    cy.get('.tiptap').type(' Offline draft')
    cy.then(() => waitForQueue(statuses => statuses.includes('pending')))
    cy.get('[data-testid="device-sync-status"]')
      .should('be.visible').and('have.attr', 'role', 'status')
      .and('have.attr', 'aria-live', 'polite').and('have.attr', 'aria-atomic', 'true')
      .and('contain.text', 'Offline').and('contain.text', 'waiting')
    cy.contains('Last local save (any note):', { timeout: 10000 }).should('be.visible')
    cy.screenshot('sync-status-mobile-edit', { capture: 'viewport' })

    cy.get('[data-cy="note-read-button"]').click()
    cy.contains('Offline draft').should('be.visible')
    cy.viewport(320, 700)
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Offline').and('contain.text', 'waiting')
    cy.document().then(doc => expect(doc.documentElement.scrollWidth).to.be.at.most(doc.defaultView!.innerWidth))
    cy.screenshot('sync-status-mobile-read', { capture: 'viewport' })

    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Offline').and('contain.text', 'waiting')
    cy.screenshot('sync-status-mobile-tags', { capture: 'viewport' })
    cy.viewport(1200, 700)
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Offline')
    cy.screenshot('sync-status-desktop-tags', { capture: 'viewport' })
  })

  it('shows failed sync without claiming remote success and clears it after retry succeeds', () => {
    cy.viewport(390, 700)
    let failing = true
    let remote = { ...note }
    const client = createClient('https://device-failure.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://device-failure.invalid/**', req => {
      if (req.url.includes('/rest/v1/notes')) {
        if (req.method === 'PATCH') {
          req.alias = 'syncPatch'
          if (failing) { req.reply({ statusCode: 503, body: { message: 'temporary outage' } }); return }
          remote = { ...remote, ...req.body }
          req.reply({ statusCode: 200, body: remote })
          return
        }
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        req.reply({ body: single ? remote : [remote], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    cy.clearLocalStorage()
    cy.window().then(win => win.sessionStorage.clear())
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.window().then(win => win.dispatchEvent(new win.Event('online')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"] button', 'Sync status note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('.tiptap').type(' Unsynced change')
    cy.wait('@syncPatch')
    cy.then(() => waitForQueue(statuses => statuses.includes('failed')))
    cy.get('[data-testid="device-sync-status"]', { timeout: 10000 }).should('be.visible').and('contain.text', '1 failed')
    cy.contains('Last local save (any note):').should('be.visible')
    cy.contains('Synchronized').should('not.exist')
    cy.screenshot('sync-status-mobile-failed', { capture: 'viewport' })
    cy.viewport(1200, 700)
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', '1 failed')
    cy.screenshot('sync-status-desktop-failed', { capture: 'viewport' })
    cy.document().then(doc => doc.documentElement.classList.add('dark'))
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', '1 failed')
    cy.screenshot('sync-status-desktop-failed-dark', { capture: 'viewport' })

    cy.then(() => { failing = false })
    cy.window().then(win => win.dispatchEvent(new win.Event('focus')))
    cy.wait('@syncPatch')
    cy.then(() => waitForQueue(statuses => statuses.length === 0))
    cy.get('[data-testid="device-sync-status"]', { timeout: 10000 }).should('have.class', 'sr-only')
      .and('contain.text', 'No waiting or failed changes reported').and('not.contain.text', 'Synchronized')
    cy.then(() => expect(remote.description).to.contain('Unsynced change'))
  })
})
