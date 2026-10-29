import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import App from '../../../../app/page'
import { Toaster } from '@ui/web/components/ui/sonner'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'
import { addWorkspaceTab, createNoteWorkspaceState, openNoteInWorkspace, serializeNoteWorkspaceState, updateWorkspaceTab } from '@core/services/noteWorkspaceTabs'

const user = { id: 'signout-user', email: 'signout@example.invalid' } as User
const otherUser = { id: 'other-user', email: 'other@example.invalid' } as User
const notes = [
  { id: 'first', title: 'First note', description: '<p>First body</p>', tags: ['qa-tag'], user_id: user.id, created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
  { id: 'second', title: 'Second note', description: '<p>Second body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T09:00:00Z', updated_at: '2026-10-28T09:00:00Z' },
]

function SessionHarness({ client }: { client: SupabaseClient }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(user)
  return <>
    <button data-cy="signout-test-none" onClick={() => setCurrentUser(null)}>Clear test session</button>
    <button data-cy="signout-test-user" onClick={() => setCurrentUser(user)}>Restore test session</button>
    <button data-cy="signout-test-other" onClick={() => setCurrentUser(otherUser)}>Other test account</button>
    <SupabaseTestProvider supabase={client} user={currentUser}><App /><Toaster /></SupabaseTestProvider>
  </>
}

function mountApp(signOutFails = false) {
  const client = createClient('https://signout-test.invalid', 'test-public-key', {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })
  const signOut = cy.stub(client.auth, 'signOut').as('signOut')
  if (signOutFails) signOut.rejects(new Error('Auth unavailable'))
  else signOut.resolves({ error: null })
  cy.intercept('https://signout-test.invalid/**', req => {
    if (!req.url.includes('/rest/v1/notes')) { req.reply({ body: [] }); return }
    const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
    const noteId = new URL(req.url).searchParams.get('id')
    const selected = notes.find(item => noteId === `eq.${item.id}`) ?? notes[0]
    req.reply({ body: single ? selected : notes, headers: { 'content-range': '0-1/2', 'access-control-expose-headers': 'content-range' } })
  })
  cy.mount(<SessionHarness client={client} />)
}

function seedFailedDraft(active: boolean, saveState: 'dirty' | 'error' = 'error') {
  let state = openNoteInWorkspace(createNoteWorkspaceState(() => 'first-tab', user.id), notes[0])
  state = updateWorkspaceTab(state, 'first-tab', {
    mode: 'editing', draft: { title: 'Unsaved private draft', description: '<p>Do not lose</p>', tags: '' },
    saveState, saveError: saveState === 'error' ? 'Storage unavailable' : null,
  })
  if (!active) {
    state = addWorkspaceTab(state, () => 'second-tab')
    state = openNoteInWorkspace(state, notes[1])
  }
  return serializeNoteWorkspaceState(state)
}

describe('Safe sign out with local drafts', { retries: 0 }, () => {
  beforeEach(() => {
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
    cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine') })
  })

  it('signs out normally with no unsaved notes while online', () => {
    cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine') })
    mountApp()
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('@signOut').should('have.been.calledOnce')
    cy.contains('Your personal note-taking companion').should('be.visible')
  })

  it('keeps a failed restored draft and stays signed in when the user cancels sign out', () => {
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, seedFailedDraft(true)))
    mountApp()
    cy.get('[aria-label="Note title"]').should('have.value', 'Unsaved private draft')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('[role="alertdialog"]').should('contain', 'unsaved')
    cy.get('@signOut').should('not.have.been.called')
    cy.get('[role="alertdialog"]').contains('button', 'Keep editing').click()
    cy.get('[aria-label="Note title"]').should('have.value', 'Unsaved private draft')
    cy.window().its('sessionStorage').invoke('getItem', NOTE_WORKSPACE_STORAGE_KEY).should('contain', 'Unsaved private draft')
  })

  it('warns about a restored dirty draft even if no autosave is currently scheduled', () => {
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, seedFailedDraft(true, 'dirty')))
    mountApp()
    cy.get('[aria-label="Note title"]').should('have.value', 'Unsaved private draft')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('[role="alertdialog"]').should('contain', 'unsaved')
    cy.get('@signOut').should('not.have.been.called')
  })

  it('cancels the old account sign-out prompt if the session switches accounts', () => {
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, seedFailedDraft(true)))
    mountApp()
    cy.get('[aria-label="Note title"]').should('have.value', 'Unsaved private draft')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('[role="alertdialog"]').should('contain', 'unsaved')
    // A provider event can change the account while the modal is open.
    cy.get('[data-cy="signout-test-other"]').click({ force: true })
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.get('@signOut').should('not.have.been.called')
    cy.get('[data-cy="workspace-tab"]').should('not.contain', 'Unsaved private draft')
  })

  it('warns for a failed inactive tab and discards it only after explicit confirmation', () => {
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, seedFailedDraft(false)))
    mountApp()
    cy.get('[data-testid="editor-container"]').should('contain', 'Second body')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('[role="alertdialog"]').should('contain', 'unsaved')
    cy.get('@signOut').should('not.have.been.called')
    cy.get('[role="alertdialog"]').contains('button', 'Discard changes and sign out').click()
    cy.get('@signOut').should('have.been.calledOnce')
    cy.window().its('sessionStorage').invoke('getItem', NOTE_WORKSPACE_STORAGE_KEY).should('equal', null)
    cy.get('[data-cy="signout-test-none"]').click()
    cy.get('[data-cy="signout-test-other"]').click()
    cy.get('[data-cy="workspace-tab"]').should('not.contain', 'Unsaved private draft')
    cy.get('[data-cy="signout-test-none"]').click()
    cy.get('[data-cy="signout-test-user"]').click()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
    cy.get('[data-testid="editor-container"]').should('contain', 'First body').and('not.contain', 'Unsaved private draft')
  })

  it('keeps an evicted unsaved tab in memory when settings is requested', () => {
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, seedFailedDraft(false)))
    mountApp()
    cy.get('[data-cy="workspace-tab"]').should('have.length', 2)
    cy.window().then(win => {
      const snapshot = JSON.parse(win.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)!)
      snapshot.tabs = snapshot.tabs.filter((tab: { id: string }) => tab.id !== 'first-tab')
      win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, JSON.stringify(snapshot))
      const originalSetItem = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function (this: Storage, key: string, value: string) {
        if (key === NOTE_WORKSPACE_STORAGE_KEY) throw new Error('Simulated quota failure')
        originalSetItem.call(this, key, value)
      })
    })
    cy.get('[aria-label="Open settings page"]').click()
    cy.contains('Some unsaved changes cannot be kept').should('be.visible')
    cy.get('[data-cy="workspace-tab"]').should('have.length', 2)
    cy.get('[data-cy="workspace-tab-close"]').first().click()
    cy.get('[role="alertdialog"]').should('contain', 'unsaved changes')
    cy.get('[role="alertdialog"]').contains('button', 'Keep editing').click()
    cy.get('[data-cy="workspace-tab"]').should('have.length', 2)
    cy.get('[data-cy="workspace-tab-close"]').first().click()
    cy.get('[role="alertdialog"]').contains('button', 'Discard and close').click()
    cy.get('[data-cy="workspace-tab"]').should('have.length', 1)
  })

  it('keeps the failed editor visible through tag navigation and a mobile resize, then permits retry', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    const failedSave = cy.stub(webOfflineStorageAdapter, 'saveNote').as('failedTagSave')
    failedSave.rejects(new Error('Storage unavailable'))
    cy.get('[aria-label="Note title"]').clear().type('Draft before tag navigation')
    cy.get('@failedTagSave', { timeout: 12000 }).should('have.been.called')
    cy.contains('Auto-save failed. Your changes will retry.').should('be.visible')
    cy.contains('[data-testid="sidebar-container"] [data-cy="interactive-tag"]', 'qa-tag').click()
    cy.get('[data-testid="search-results-panel"]').should('not.exist')
    cy.viewport(390, 844)
    cy.get('[aria-label="Note title"]').should('be.visible').and('have.value', 'Draft before tag navigation')
    cy.then(() => failedSave.restore())
    cy.viewport(1440, 900)
    cy.contains('[data-testid="sidebar-container"] [data-cy="interactive-tag"]', 'qa-tag').click()
    cy.get('[data-testid="search-results-panel"]').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.title === 'Draft before tag navigation')).to.equal(true)
    })
  })

  it('keeps the draft if sign out fails after the user chose to discard', () => {
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, seedFailedDraft(true)))
    mountApp(true)
    cy.get('[aria-label="Note title"]').should('have.value', 'Unsaved private draft')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('[role="alertdialog"]').should('contain', 'unsaved')
    cy.get('[role="alertdialog"]').contains('button', 'Discard changes and sign out').click()
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.contains('Could not sign out. Please try again.').should('be.visible')
    cy.get('[aria-label="Note title"]').should('have.value', 'Unsaved private draft')
    cy.window().its('sessionStorage').invoke('getItem', NOTE_WORKSPACE_STORAGE_KEY).should('contain', 'Unsaved private draft')
  })

  it('saves a new edit before ordinary sign out when local storage works', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Saved before sign out')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('@signOut').should('have.been.calledOnce')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Saved before sign out')
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.title === 'Saved before sign out')).to.equal(true)
    })
  })

  it('warns and keeps the live editor when local saving fails', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    const failedSave = cy.stub(webOfflineStorageAdapter, 'saveNote').as('failedSave')
    failedSave.rejects(new Error('Storage unavailable'))
    cy.get('[aria-label="Note title"]').clear().type('Failed live edit')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('@failedSave').should('have.been.called')
    cy.get('[role="alertdialog"]').should('contain', 'unsaved')
    cy.get('@signOut').should('not.have.been.called')
    cy.get('[role="alertdialog"]').contains('button', 'Keep editing').click()
    cy.get('[aria-label="Note title"]').should('have.value', 'Failed live edit')
    cy.then(() => failedSave.restore())
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.title === 'Failed live edit')).to.equal(true)
    })
    cy.get('[data-cy="sign-out-button"]').click()
    cy.get('@signOut').should('have.been.calledOnce')
  })

  it('lets the user cancel while a slow save is being checked', () => {
    mountApp()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.payload?.title !== 'Slow sign out' || release) return original(item)
      return new Cypress.Promise<void>(resolve => { release = () => original(item).then(() => resolve()) })
    })
    cy.get('[aria-label="Note title"]').clear().type('Slow sign out')
    cy.get('[data-cy="sign-out-button"]').click()
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[role="alertdialog"]').should('contain', 'Checking')
    cy.get('[role="alertdialog"]').contains('button', 'Keep editing').click()
    cy.then(() => release!())
    cy.get('[aria-label="Note title"]').should('have.value', 'Slow sign out')
    cy.get('@signOut').should('not.have.been.called')
  })
})
