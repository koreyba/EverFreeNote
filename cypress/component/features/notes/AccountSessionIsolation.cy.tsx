import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import App from '../../../../app/page'
import { Toaster } from '@ui/web/components/ui/sonner'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const accountA = { id: 'isolation-a', email: 'a@example.invalid' } as User
const accountB = { id: 'isolation-b', email: 'b@example.invalid' } as User
const aNotes = [
  { id: 'a-tag', title: 'A tagged', description: '<p>Tag note</p>', tags: ['a-private-tag'], user_id: accountA.id, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
  { id: 'a-edit', title: 'A editor', description: '<p>A private body</p>', tags: [], user_id: accountA.id, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' },
]
const bNote = { id: 'b-note', title: 'B note', description: '<p>B body</p>', tags: [], user_id: accountB.id, created_at: '2026-01-01T00:00:00Z', updated_at: '2026-01-01T00:00:00Z' }

type SessionSwitch = { current: (next: User | null) => void }

function SessionHarness({ client, sessionSwitchRef }: { client: SupabaseClient; sessionSwitchRef: SessionSwitch }) {
  const [user, setUser] = React.useState<User | null>(accountA)
  React.useEffect(() => { sessionSwitchRef.current = setUser }, [sessionSwitchRef])
  return <>
    <button data-cy="test-account-a" onClick={() => setUser(accountA)}>A</button>
    <button data-cy="test-account-b" onClick={() => setUser(accountB)}>B</button>
    <button data-cy="test-account-none" onClick={() => setUser(null)}>Sign out</button>
    <button data-cy="test-account-refresh" onClick={() => setUser(previous => previous ? { ...previous } : null)}>Refresh</button>
    <SupabaseTestProvider supabase={client} user={user}><App /><Toaster /></SupabaseTestProvider>
  </>
}

function mountApp() {
  const client = createClient('https://account-isolation.invalid', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const sessionSwitchRef: SessionSwitch = { current: () => undefined }
  const signOut = cy.stub(client.auth, 'signOut').as('signOut')
  signOut.callsFake(async () => {
    sessionSwitchRef.current(null)
    return { error: null }
  })
  cy.intercept('https://account-isolation.invalid/**', req => {
    if (!req.url.includes('/rest/v1/notes')) { req.reply({ body: [] }); return }
    const params = new URL(req.url).searchParams
    const list = params.get('user_id')?.includes(accountB.id) ? [bNote] : aNotes
    const id = params.get('id')
    const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
    const selected = [...aNotes, bNote].find(note => id === `eq.${note.id}`) ?? list[0]
    req.reply({ body: single ? selected : list, headers: { 'content-range': `0-${list.length - 1}/${list.length}`, 'access-control-expose-headers': 'content-range' } })
  })
  cy.mount(<SessionHarness client={client} sessionSwitchRef={sessionSwitchRef} />)
}

describe('Account session isolation', { retries: 0 }, () => {
  let releaseHeldSave: (() => Promise<unknown>) | undefined
  beforeEach(() => {
    releaseHeldSave = undefined
    cy.viewport(1440, 900)
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.history.replaceState({}, '', '/')
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
  })
  afterEach(() => {
    if (releaseHeldSave) cy.then(() => releaseHeldSave?.())
    cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine') })
  })

  it('finishes A’s delayed save without exposing its draft or tag to B, then restores A’s saved edit', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A editor').click()
    cy.get('[data-cy="note-edit-button"]').click()
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.saveNote.bind(webOfflineStorageAdapter)
    cy.spy(webOfflineStorageAdapter, 'upsertQueueItem').as('queuedWrite')
    cy.stub(webOfflineStorageAdapter, 'saveNote').callsFake(note => {
      if (note.title !== 'A delayed draft') return original(note)
      return new Cypress.Promise<void>(resolve => { release = () => original(note).then(resolve) })
    })
    cy.get('[aria-label="Note title"]').clear().type('A delayed draft')
    cy.contains('[data-testid="sidebar-container"] [data-cy="interactive-tag"]', 'a-private-tag').click()
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-cy="test-account-b"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'B note').should('be.visible')
    cy.then(() => release!())
    cy.get('@queuedWrite').should('have.been.called')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'a-edit' && item.payload?.user_id === accountA.id && item.payload?.title === 'A delayed draft')).to.equal(true)
    })
    cy.get('[data-testid="sidebar-container"]').should('not.contain', 'A delayed draft').and('not.contain', 'A private body')
    cy.get('[data-testid="search-results-panel"]').should('not.exist')
    cy.get('[data-cy="test-account-a"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A delayed draft').should('be.visible')
  })

  it('preserves A’s pending edit when the account changes before the autosave timer', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A editor').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.spy(webOfflineStorageAdapter, 'upsertQueueItem').as('queuedOnSwitch')
    cy.get('[aria-label="Note title"]').clear().type('A immediate edit', { delay: 0 })
    cy.get('[data-cy="test-account-b"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'B note').should('be.visible')
    cy.get('@queuedOnSwitch').should('have.been.called')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'a-edit' && item.payload?.user_id === accountA.id && item.payload?.title === 'A immediate edit')).to.equal(true)
    })
    cy.get('[data-testid="sidebar-container"]').should('not.contain', 'A immediate edit')
    cy.get('[data-cy="test-account-a"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A immediate edit').should('be.visible')
  })

  it('shows the pending A draft when A returns before its earlier save completes', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A editor').click()
    cy.get('[data-cy="note-edit-button"]').click()
    const original = webOfflineStorageAdapter.saveNote.bind(webOfflineStorageAdapter)
    cy.spy(webOfflineStorageAdapter, 'upsertQueueItem').as('returningAQueue')
    cy.stub(webOfflineStorageAdapter, 'saveNote').callsFake(note => {
      if (note.title !== 'A in-flight draft') return original(note)
      return new Cypress.Promise<void>(resolve => { releaseHeldSave = () => original(note).then(resolve) })
    })
    cy.get('[aria-label="Note title"]').clear().type('A in-flight draft', { delay: 0 })
    cy.contains('[data-testid="sidebar-container"] [data-cy="interactive-tag"]', 'a-private-tag').click()
    cy.wrap(null).should(() => expect(releaseHeldSave).to.be.a('function'))
    cy.get('[data-cy="test-account-b"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'B note').should('be.visible')
    cy.get('[data-cy="test-account-a"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A in-flight draft').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').should('have.value', 'A in-flight draft')
    cy.get('[aria-label="Note title"]').clear().type('A later edit', { delay: 0 })
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => {
      const release = releaseHeldSave!
      releaseHeldSave = undefined
      return release()
    })
    cy.get('@returningAQueue').should('have.been.calledWithMatch', { payload: { title: 'A later edit', user_id: accountA.id } })
    cy.then(() => webOfflineStorageAdapter.loadNotes({})).should(notes => {
      expect(notes.find(note => note.id === 'a-edit')?.title).to.equal('A later edit')
    })
  })

  it('keeps a new note’s ID when A returns before its first local save completes', () => {
    mountApp()
    cy.get('[data-testid="sidebar-container"] button').contains('New Note').click()
    const original = webOfflineStorageAdapter.saveNote.bind(webOfflineStorageAdapter)
    cy.spy(webOfflineStorageAdapter, 'upsertQueueItem').as('newNoteQueue')
    cy.stub(webOfflineStorageAdapter, 'saveNote').callsFake(note => {
      if (note.title !== 'A new in-flight note') return original(note)
      return new Cypress.Promise<void>(resolve => { releaseHeldSave = () => original(note).then(resolve) })
    })
    cy.get('[aria-label="Note title"]').type('A new in-flight note', { delay: 0 })
    cy.get('[data-cy="note-save-button"]').click()
    cy.wrap(null).should(() => expect(releaseHeldSave).to.be.a('function'))
    cy.get('[data-cy="test-account-b"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'B note').should('be.visible')
    cy.get('[data-cy="test-account-a"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A new in-flight note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('A new later edit', { delay: 0 })
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => {
      const release = releaseHeldSave!
      releaseHeldSave = undefined
      return release()
    })
    cy.get('@newNoteQueue').should('have.been.calledWithMatch', { payload: { title: 'A new later edit', user_id: accountA.id } })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const writes = queue.filter(item => item.payload?.title === 'A new in-flight note' || item.payload?.title === 'A new later edit')
      expect(writes.find(item => item.payload?.title === 'A new in-flight note')?.operation).to.equal('create')
      expect(writes.find(item => item.payload?.title === 'A new later edit')?.operation).to.equal('update')
      expect(new Set(writes.map(item => item.noteId)).size).to.equal(1)
    })
  })

  it('keeps the live editor on a same-account auth refresh', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A editor').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('A refresh edit', { delay: 0 })
    cy.get('[data-cy="test-account-refresh"]').click({ force: true })
    cy.get('[aria-label="Note title"]').should('be.visible').and('have.value', 'A refresh edit')
  })

  it('does not retry a deliberately discarded pending draft during sign out', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A editor').click()
    cy.get('[data-cy="note-edit-button"]').click()
    const failedSave = cy.stub(webOfflineStorageAdapter, 'saveNote').as('failedDiscardSave')
    failedSave.rejects(new Error('Storage unavailable'))
    cy.get('[aria-label="Note title"]').clear().type('A deliberately discarded')
    cy.get('@failedDiscardSave', { timeout: 12000 }).should('have.been.called')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('[role="alertdialog"]').should('contain', 'unsaved')
    let attempts = 0
    cy.then(() => { attempts = failedSave.callCount })
    cy.get('[role="alertdialog"]').contains('button', 'Discard changes and sign out').click()
    cy.get('@signOut').should('have.been.calledOnce')
    cy.contains('Your personal note-taking companion').should('be.visible')
    cy.then(() => expect(failedSave.callCount).to.equal(attempts))
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.payload?.title === 'A deliberately discarded')).to.equal(false)
    })
  })
})
