import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { AppRouterContext, type AppRouterInstance } from 'next/dist/shared/lib/app-router-context.shared-runtime'
import { SearchParamsContext } from 'next/dist/shared/lib/hooks-client-context.shared-runtime'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SettingsPage } from '@ui/web/components/features/settings/SettingsPage'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { WorkspaceMemoryProvider } from '@ui/web/providers/WorkspaceMemoryProvider'
import { SPLIT_VIEW_ENABLED_KEY, SplitViewPreferenceProvider } from '@ui/web/providers/SplitViewPreferenceProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const user = { id: 'preference-user', email: 'preference@example.invalid' } as User
const otherUser = { id: 'preference-other', email: 'other@example.invalid' } as User
const fixtures = [
  { id: 'first', title: 'First note', description: '<p>First body</p>', tags: [], user_id: user.id, created_at: '2026-10-29T08:00:00Z', updated_at: '2026-10-29T08:00:00Z' },
  { id: 'second', title: 'Second note', description: '<p>Second body</p>', tags: [], user_id: user.id, created_at: '2026-10-29T08:00:00Z', updated_at: '2026-10-29T08:00:00Z' },
  { id: 'b-first', title: 'Other first', description: '<p>Other first body</p>', tags: [], user_id: otherUser.id, created_at: '2026-10-29T08:00:00Z', updated_at: '2026-10-29T08:00:00Z' },
  { id: 'b-second', title: 'Other second', description: '<p>Other second body</p>', tags: [], user_id: otherUser.id, created_at: '2026-10-29T08:00:00Z', updated_at: '2026-10-29T08:00:00Z' },
]

function Notes() { return <NotesShell controller={useNoteAppController()} /> }

function TestApp({ client }: { client: SupabaseClient }) {
  const [settings, setSettings] = React.useState(false)
  const [currentUser, setCurrentUser] = React.useState(user)
  const router = React.useMemo<AppRouterInstance>(() => ({
    back: () => setSettings(false), forward: () => {}, refresh: () => {}, prefetch: () => {},
    push: href => setSettings(href.startsWith('/settings')),
    replace: href => setSettings(href.startsWith('/settings')),
  }), [])
  return <WorkspaceMemoryProvider><SplitViewPreferenceProvider><SupabaseTestProvider supabase={client} user={currentUser}>
    <button data-cy="owner-a" style={{ display: 'none' }} onClick={() => setCurrentUser(user)}>A</button>
    <button data-cy="owner-b" style={{ display: 'none' }} onClick={() => setCurrentUser(otherUser)}>B</button>
    <AppRouterContext.Provider value={router}><SearchParamsContext.Provider value={new URLSearchParams()}>
      {settings ? <SettingsPage /> : <Notes />}
    </SearchParamsContext.Provider></AppRouterContext.Provider>
  </SupabaseTestProvider></SplitViewPreferenceProvider></WorkspaceMemoryProvider>
}

const chooseNote = (title: string) => cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', title).click()
const openSettings = () => cy.get('[data-testid="nav-action-settings"]').click()
const closeSettings = () => cy.get('[aria-label="Close settings"]').should('be.visible').click()
const togglePreference = () => cy.get('[role="switch"][id="settings-split-view"]').click()
const openPair = (first = 'First note', second = 'Second note') => {
  chooseNote(first)
  cy.get('[data-cy="workspace-split-button"]').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Choose a note')
  chooseNote(second)
  cy.get('[data-testid="split-pane-right"]').should('contain', second)
}

describe('Split view browser preference', { retries: 0 }, () => {
  let client: SupabaseClient
  beforeEach(() => {
    cy.viewport(1440, 900)
    client = createClient('https://preference-test.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const notes = fixtures.map(note => ({ ...note }))
    cy.intercept('https://preference-test.invalid/**', req => {
      if (!req.url.includes('/rest/v1/notes')) return req.reply({ body: [] })
      const params = new URL(req.url).searchParams
      const id = params.get('id')?.replace(/^eq\./, '')
      const owner = params.get('user_id')?.replace(/^eq\./, '')
      const selected = notes.find(note => note.id === id)
      if (req.method === 'PATCH' && selected) Object.assign(selected, req.body)
      const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
      req.reply({ body: single ? selected ?? null : owner ? notes.filter(note => note.user_id === owner) : notes, headers: { 'content-range': '0-1/2', 'access-control-expose-headers': 'content-range' } })
    })
    cy.clearLocalStorage()
    cy.window().then(win => win.sessionStorage.clear())
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
  })

  it('hides all split controls until the user enables the preference', () => {
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
    cy.get('[data-testid="editor-container"]').should('contain', 'First body')
    cy.get('[data-cy="workspace-split-button"]').should('not.exist')
    cy.get('[data-testid^="split-pane-"]').should('not.exist')
  })

  it('enables the feature and restores the layout after remount; disabling keeps edits and tabs', () => {
    openSettings()
    cy.get('#settings-split-view').should('have.attr', 'aria-checked', 'false')
    togglePreference()
    cy.window().then(win => expect(win.localStorage.getItem(SPLIT_VIEW_ENABLED_KEY)).to.equal('true'))
    cy.viewport(1200, 800)
    cy.screenshot('split-preference-desktop', { capture: 'viewport' })
    cy.viewport(1440, 900)
    closeSettings()
    openPair()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Second edited')
    openSettings()
    togglePreference()
    closeSettings()
    cy.get('[data-cy="workspace-split-button"]').should('not.exist')
    cy.get('[data-testid^="split-pane-"]').should('not.exist')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
    cy.get('[aria-label="Note title"]').should('have.value', 'Second edited')
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
    cy.get('[data-cy="workspace-split-button"]').should('not.exist')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
    openSettings()
    togglePreference()
    closeSettings()
    cy.get('[data-testid="split-pane-left"]').should('contain', 'First body')
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Second edited')
  })

  it('keeps an enabled choice only in memory and warns if local storage rejects it', () => {
    openSettings()
    cy.window().then(win => {
      const original = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function (this: Storage, key: string, value: string) {
        if (key === SPLIT_VIEW_ENABLED_KEY) throw new DOMException('Quota', 'QuotaExceededError')
        return original.call(this, key, value)
      })
    })
    togglePreference()
    cy.get('[role="status"]').should('contain', 'could not be saved').and('contain', 'reload')
    closeSettings()
    cy.get('[data-cy="workspace-split-button"]').should('exist')
    openSettings()
    cy.get('#settings-split-view').should('have.attr', 'aria-checked', 'true')
    closeSettings()
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
    cy.get('[data-cy="workspace-split-button"]').should('not.exist')
  })

  it('warns when disabling cannot be saved while closing the split in this document', () => {
    openSettings()
    togglePreference()
    closeSettings()
    openPair()
    openSettings()
    cy.window().then(win => {
      const original = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function (this: Storage, key: string, value: string) {
        if (key === SPLIT_VIEW_ENABLED_KEY) throw new DOMException('Quota', 'QuotaExceededError')
        return original.call(this, key, value)
      })
    })
    togglePreference()
    cy.contains('[role="status"]', 'could not be saved').should('contain', 'reload')
    closeSettings()
    cy.get('[data-cy="workspace-split-button"]').should('not.exist')
    cy.get('[data-testid^="split-pane-"]').should('not.exist')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
  })

  it('allows the browser preference to be changed from mobile settings', () => {
    cy.viewport(390, 844)
    cy.get('[data-testid="mobile-action-settings"]').click()
    cy.get('#settings-split-view').should('have.attr', 'aria-checked', 'false')
    togglePreference()
    cy.get('#settings-split-view').should('have.attr', 'aria-checked', 'true')
    cy.get('main').scrollTo('top')
    cy.screenshot('split-preference-mobile', { capture: 'viewport' })
    cy.get('[aria-label="Back"]').click()
    cy.viewport(1440, 900)
    cy.get('[data-cy="workspace-split-button"]').should('exist')
  })

  it('shares the browser preference across accounts without sharing their split workspaces', () => {
    openSettings()
    togglePreference()
    closeSettings()
    openPair()
    cy.get('[data-cy="owner-b"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"]', 'Other first').should('be.visible')
    cy.get('[data-testid="editor-container"]').should('not.contain', 'First body')
    cy.get('[data-cy="workspace-split-button"]').should('have.attr', 'aria-pressed', 'false')
    openPair('Other first', 'Other second')
    cy.get('[data-cy="owner-a"]').click({ force: true })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'First body').and('not.contain', 'Other')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Second body').and('not.contain', 'Other')
  })

  it('hides a split on mobile and narrow desktop but restores it when room returns', () => {
    openSettings()
    togglePreference()
    closeSettings()
    openPair()
    cy.viewport(1000, 900)
    cy.contains('Enlarge the workspace').should('be.visible')
    cy.get('[data-testid="split-pane-left"]').should('not.be.visible')
    cy.viewport(390, 844)
    cy.get('[data-testid="split-pane-right"]').should('be.visible')
    cy.viewport(1440, 900)
    cy.get('[data-testid="split-pane-left"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').should('be.visible')
  })

  it('does not remount or lose a live draft when another browser tab disables split', () => {
    openSettings()
    togglePreference()
    closeSettings()
    openPair()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Draft survives')
    cy.get('[aria-label="Note title"]').then($title => {
      const original = $title[0]
      cy.window().then(win => {
        win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'false')
        win.dispatchEvent(new win.StorageEvent('storage', { key: SPLIT_VIEW_ENABLED_KEY, newValue: 'false', storageArea: win.localStorage }))
      })
      cy.get('[aria-label="Note title"]').should($current => {
        expect($current[0]).to.equal(original)
        expect($current.val()).to.equal('Draft survives')
      })
    })
    cy.get('[data-cy="workspace-split-button"]').should('not.exist')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
  })

  it('cancels a pending split if the setting is disabled during the editor flush', () => {
    openSettings()
    togglePreference()
    closeSettings()
    chooseNote('First note')
    cy.get('[data-cy="note-edit-button"]').click()
    let release: (() => void) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => new Promise((resolve, reject) => {
      release = () => { void original(item).then(resolve, reject) }
    })).as('delayedWrite')
    cy.get('[aria-label="Note title"]').clear().type('Pending draft')
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('@delayedWrite').should('have.been.called')
    cy.window().then(win => {
      win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'false')
      win.dispatchEvent(new win.StorageEvent('storage', { key: SPLIT_VIEW_ENABLED_KEY, newValue: 'false', storageArea: win.localStorage }))
    })
    cy.then(() => { expect(release).to.be.a('function'); release!() })
    cy.get('@delayedWrite').then(stub => (stub as unknown as { firstCall: { returnValue: Promise<unknown> } }).firstCall.returnValue)
    cy.get('[data-cy="workspace-split-button"]').should('not.exist')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 1)
    cy.get('[aria-label="Note title"]').should('have.value', 'Pending draft')
  })
})
