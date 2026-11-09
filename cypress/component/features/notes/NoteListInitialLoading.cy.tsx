import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const user = { id: 'startup-test-user', email: 'startup@example.invalid' } as User
const notes = ['Cached note', 'Second note', 'Third note'].map((title, index) => ({
  id: `startup-note-${index}`, user_id: user.id, title, description: '<p>Note content</p>', tags: [],
  created_at: '2026-11-09T10:00:00Z', updated_at: '2026-11-09T10:00:00Z',
}))

let controller: ReturnType<typeof useNoteAppController>
let responseGate: Promise<void>
let releaseResponse: () => void
let responseStatus: number

function holdResponse() {
  responseGate = new Cypress.Promise<void>(resolve => { releaseResponse = resolve })
}

function App() {
  const current = useNoteAppController()
  React.useEffect(() => { controller = current }, [current])
  const query = current.notesQuery
  const state = query.isLoading ? 'loading' : query.isFetching ? 'refreshing' : query.isError ? 'error' : 'ready'
  return <>
    <NotesShell controller={current} />
    <output data-cy="note-load-state">{state}:{current.notes.length}</output>
  </>
}

describe('Notes initial loading with a partial local cache', { retries: 0 }, () => {
  beforeEach(() => {
    cy.viewport(390, 844)
    responseStatus = 200
    holdResponse()
    const client = createClient('https://notes-startup.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://notes-startup.invalid/**', req => {
      const url = new URL(req.url)
      if (url.pathname === '/rest/v1/notes' && url.searchParams.has('offset')) {
        return responseGate.then(() => {
          req.reply({
            statusCode: responseStatus,
            body: responseStatus === 200 ? notes : { message: 'Service unavailable' },
            headers: { 'content-range': '0-2/3', 'access-control-expose-headers': 'content-range' },
          })
        })
      }
      req.reply({ body: [] })
    })
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.history.replaceState({}, '', '/?view=notes')
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true })
      win.dispatchEvent(new win.Event('online'))
    })
    cy.then(async () => {
      await webOfflineStorageAdapter.clearAll()
      await webOfflineStorageAdapter.saveNote({
        id: notes[0].id, user_id: user.id, title: notes[0].title,
        description: notes[0].description, tags: [], status: 'synced', updatedAt: notes[0].updated_at,
      })
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.get('[data-cy="note-load-state"]').should('have.text', 'loading:1')
  })

  afterEach(() => {
    releaseResponse()
    cy.mount(<></>)
    cy.window().then(win => {
      Reflect.deleteProperty(win.navigator, 'onLine')
      win.dispatchEvent(new win.Event('online'))
    })
  })

  it('shows skeletons until the full first page is available in desktop list view', () => {
    cy.viewport(1280, 800)
    cy.get('[data-testid="note-card"]', { timeout: 0 }).should('not.exist')
    cy.get('#notes-list-container .animate-pulse').should('be.visible')
    cy.screenshot('notes-desktop-initial-loading', { capture: 'viewport' })
    cy.then(() => releaseResponse())
    cy.get('[data-cy="note-load-state"]').should('have.text', 'ready:3')
    cy.get('[data-testid="note-card"]').should('have.length', 3)
    cy.contains('[data-testid="note-card"]', 'Second note').should('be.visible')
    cy.get('#notes-list-container .animate-pulse').should('not.exist')
    cy.screenshot('notes-desktop-first-page', { capture: 'viewport' })
  })

  it('shows skeletons until the full first page is available in grid view', () => {
    cy.get('[aria-label="Grid view"]').click()
    cy.get('[data-testid="note-card"]', { timeout: 0 }).should('not.exist')
    cy.get('#notes-list-container .animate-pulse').should('be.visible')
    cy.screenshot('notes-grid-initial-loading', { capture: 'viewport' })
    cy.then(() => releaseResponse())
    cy.get('[data-cy="note-load-state"]').should('have.text', 'ready:3')
    cy.get('[data-testid="note-card"]').should('have.length', 3)
    cy.contains('[data-testid="note-card"]', 'Second note').should('be.visible')
    cy.get('#notes-list-container .animate-pulse').should('not.exist')
    cy.screenshot('notes-grid-first-page', { capture: 'viewport' })
  })

  it('makes the cached note available when connectivity is lost during the first request', () => {
    cy.get('[aria-label="Grid view"]').click()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false })
      win.dispatchEvent(new win.Event('offline'))
    })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Offline')
    cy.get('[data-cy="note-load-state"]').should('have.text', 'loading:1')
    cy.contains('[data-testid="note-card"]', 'Cached note').should('be.visible')
    cy.get('#notes-list-container .animate-pulse').should('not.exist')
    cy.contains('[data-testid="note-card"] button', 'Cached note').click()
    cy.contains('Note content').should('be.visible')
  })

  it('falls back to the cached note when the first request fails', () => {
    cy.then(() => { responseStatus = 503; releaseResponse() })
    cy.get('[data-cy="note-load-state"]').should('have.text', 'error:1')
    cy.contains('[data-testid="note-card"]', 'Cached note').should('be.visible')
    cy.get('#notes-list-container .animate-pulse').should('not.exist')
  })

  it('keeps an already loaded page visible during a background refresh', () => {
    cy.then(() => releaseResponse())
    cy.get('[data-cy="note-load-state"]').should('have.text', 'ready:3')
    cy.then(() => { holdResponse(); void controller.notesQuery.refetch() })
    cy.get('[data-cy="note-load-state"]').should('have.text', 'refreshing:3')
    cy.get('[data-testid="note-card"]').should('have.length', 3)
    cy.get('#notes-list-container .animate-pulse').should('not.exist')
    cy.then(() => releaseResponse())
    cy.get('[data-cy="note-load-state"]').should('have.text', 'ready:3')
  })
})
