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
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'
import { SPLIT_VIEW_ENABLED_KEY, SplitViewPreferenceProvider } from '@ui/web/providers/SplitViewPreferenceProvider'

const userA = { id: 'layout-owner-a', email: 'layout-a@example.invalid' } as User
const userB = { id: 'layout-owner-b', email: 'layout-b@example.invalid' } as User

function Notes() {
  return <NotesShell controller={useNoteAppController()} />
}

function TestApp({ client }: { client: SupabaseClient }) {
  const [user, setUser] = React.useState(userA)
  const [settings, setSettings] = React.useState(false)
  const router = React.useMemo<AppRouterInstance>(() => ({
    back: () => setSettings(false), forward: () => {}, refresh: () => {}, prefetch: () => {},
    push: (href) => setSettings(href.startsWith('/settings')),
    replace: (href) => setSettings(href.startsWith('/settings')),
  }), [])
  return (
    <WorkspaceMemoryProvider>
      <SplitViewPreferenceProvider>
      <button data-cy="switch-owner-a" style={{ display: 'none' }} onClick={() => setUser(userA)}>A</button>
      <button data-cy="switch-owner-b" style={{ display: 'none' }} onClick={() => setUser(userB)}>B</button>
      <SupabaseTestProvider supabase={client} user={user}>
        <AppRouterContext.Provider value={router}>
          <SearchParamsContext.Provider value={new URLSearchParams()}>
            {settings ? <SettingsPage /> : <Notes />}
          </SearchParamsContext.Provider>
        </AppRouterContext.Provider>
      </SupabaseTestProvider>
      </SplitViewPreferenceProvider>
    </WorkspaceMemoryProvider>
  )
}

const openPair = (first = 'A first', second = 'A second') => {
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', first).click()
  cy.get('[data-cy="workspace-split-button"]').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Choose a note')
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', second).click()
  cy.get('[data-testid="split-pane-right"]').should('contain', second)
}

describe('Restoring a split workspace', { retries: 0 }, () => {
  let client: SupabaseClient
  beforeEach(() => {
    cy.viewport(1440, 900)
    client = createClient('https://layout-test.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    const makeNote = (id: string, title: string, owner: string) => ({
      id, title, description: `<p>${title} body</p>`, tags: [], user_id: owner,
      created_at: '2026-10-29T08:00:00Z', updated_at: '2026-10-29T08:00:00Z',
    })
    const notes = [
      makeNote('a-first', 'A first', userA.id), makeNote('a-second', 'A second', userA.id),
      makeNote('b-first', 'B first', userB.id), makeNote('b-second', 'B second', userB.id),
    ]
    cy.intercept('https://layout-test.invalid/**', (req) => {
      if (!req.url.includes('/rest/v1/notes')) return req.reply({ body: [] })
      const params = new URL(req.url).searchParams
      const id = params.get('id')?.replace(/^eq\./, '')
      const owner = params.get('user_id')?.replace(/^eq\./, '')
      const selected = notes.find(note => note.id === id)
      if (req.method === 'PATCH' && selected) Object.assign(selected, req.body)
      const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
      const results = owner ? notes.filter(note => note.user_id === owner) : notes
      req.reply({ body: single ? selected ?? null : results, headers: { 'content-range': '0-1/2', 'access-control-expose-headers': 'content-range' } })
    })
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'true')
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
  })

  it('restores both pane identities after a fresh app mount', () => {
    openPair()
    cy.window().then(win => {
      const stored = JSON.parse(win.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)!)
      expect(stored.split).to.have.all.keys('leftTabId', 'rightTabId', 'focusedTabId')
      expect(stored.userId).to.equal(userA.id)
    })
    // A new provider tree discards the in-memory copy, as a hard reload does.
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'A first body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'A second body')
    cy.get('[data-cy="workspace-split-button"]').should('have.attr', 'aria-pressed', 'true')
    cy.viewport(1200, 800)
    cy.screenshot('split-restored-after-remount', { capture: 'viewport' })
  })

  it('restores the layout after visiting the actual Settings page and closing it', () => {
    openPair()
    cy.get('[data-testid="nav-action-settings"]').click()
    cy.get('[aria-label="Close settings"]').should('be.visible').click()
    cy.get('[data-testid="split-pane-left"]').should('contain', 'A first body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'A second body')
  })

  it('reopens edits in the correct pane after saving and reconstructing the app', () => {
    openPair()
    cy.spy(webOfflineStorageAdapter, 'saveNote').as('savedNote')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('A second edited')
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.get('@savedNote').should((spy) => {
      const calls = (spy as unknown as { getCalls: () => Array<{ args: Array<{ id: string, title: string }> }> }).getCalls()
      expect(calls.some(call => call.args[0].id === 'a-second' && call.args[0].title === 'A second edited')).to.equal(true)
      expect(calls.some(call => call.args[0].id === 'a-first' && call.args[0].title === 'A second edited')).to.equal(false)
    })
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'A first body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'A second edited')
    cy.get('[data-testid="split-pane-right"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'A second edited')
  })

  it('honors an explicit split close after reconstructing the app', () => {
    openPair()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-cy="workspace-split-button"]').should('have.attr', 'aria-pressed', 'false')
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
    cy.get('[data-cy="workspace-split-button"]').should('have.attr', 'aria-pressed', 'false')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
  })

  it('does not mix layouts or notes while switching A → B → A', () => {
    openPair()
    cy.get('[data-cy="switch-owner-b"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"]', 'B first').should('be.visible')
    cy.get('[data-testid="editor-container"]').should('not.contain', 'A first')
    cy.get('[data-cy="workspace-split-button"]').should('have.attr', 'aria-pressed', 'false')
    openPair('B first', 'B second')
    cy.get('[data-cy="switch-owner-a"]').click({ force: true })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'A first body').and('not.contain', 'B first')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'A second body').and('not.contain', 'B second')
  })

  it('ignores a pending split from A after switching to B during save', () => {
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A first').click()
    cy.get('[data-cy="note-edit-button"]').click()
    let release: (() => void) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => new Promise((resolve, reject) => {
      release = () => { void original(item).then(resolve, reject) }
    })).as('delayedWrite')
    cy.get('[aria-label="Note title"]').clear().type('A pending draft')
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('@delayedWrite').should('have.been.called')
    cy.get('[data-cy="switch-owner-b"]').click({ force: true })
    cy.contains('[data-testid="sidebar-container"]', 'B first').should('be.visible')
    cy.then(() => { expect(release).to.be.a('function'); release!() })
    cy.get('@delayedWrite').then(stub => (stub as unknown as { firstCall: { returnValue: Promise<unknown> } }).firstCall.returnValue)
    cy.get('[data-cy="workspace-split-button"]').should('have.attr', 'aria-pressed', 'false')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 1)
    cy.get('[data-testid="editor-container"]').should('not.contain', 'A pending draft')
  })

  it('keeps both the split and explicit close through Settings when storage writes fail', () => {
    openPair()
    cy.window().then(win => {
      const original = win.Storage.prototype.setItem
      cy.stub(win.Storage.prototype, 'setItem').callsFake(function (this: Storage, key: string, value: string) {
        if (key === NOTE_WORKSPACE_STORAGE_KEY) throw new DOMException('Quota', 'QuotaExceededError')
        return original.call(this, key, value)
      }).as('blockedStorage')
    })
    cy.get('[data-testid="nav-action-settings"]').click()
    cy.get('[aria-label="Close settings"]').click()
    cy.get('[data-testid="split-pane-left"]').should('contain', 'A first body')
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-testid="split-pane-left"]').should('not.exist')
    cy.get('[data-testid="nav-action-settings"]').click()
    cy.get('[aria-label="Close settings"]').click()
    cy.get('[data-cy="workspace-split-button"]').should('have.attr', 'aria-pressed', 'false')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
  })

  it('keeps the existing split through Settings when workspace reads fail', () => {
    openPair()
    cy.window().then(win => {
      const original = win.Storage.prototype.getItem
      cy.stub(win.Storage.prototype, 'getItem').callsFake(function (this: Storage, key: string) {
        if (key === NOTE_WORKSPACE_STORAGE_KEY) throw new DOMException('Blocked', 'SecurityError')
        return original.call(this, key)
      })
    })
    cy.get('[data-testid="nav-action-settings"]').click()
    cy.get('[aria-label="Close settings"]').click()
    cy.get('[data-testid="split-pane-left"]').should('contain', 'A first body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'A second body')
  })

  it('restores an empty split pane so the second note can still be chosen', () => {
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A first').click()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Choose a note')
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'A first body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Choose a note')
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'A second').click()
    cy.get('[data-testid="split-pane-right"]').should('contain', 'A second body')
  })

  it('does not restore split after closing one of its tabs', () => {
    openPair()
    cy.get('[aria-label="Close A second"]').click()
    cy.get('[data-testid="split-pane-left"]').should('not.exist')
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
    cy.get('[data-cy="workspace-split-button"]').should('have.attr', 'aria-pressed', 'false')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 1)
    cy.get('[data-testid="editor-container"]').should('contain', 'A first body')
  })

  it('restores a hidden split after mobile mount and preserves it on desktop', () => {
    openPair()
    cy.viewport(390, 844)
    cy.mount(<TestApp client={client} />, { wrapWithSupabase: false })
    cy.get('[data-testid="split-pane-right"]').should('be.visible').and('contain', 'A second body')
    cy.get('[data-testid="split-pane-left"]').should('not.be.visible')
    cy.viewport(1440, 900)
    cy.get('[data-testid="split-pane-left"]').should('be.visible').and('contain', 'A first body')
    cy.get('[data-testid="split-pane-right"]').should('be.visible').and('contain', 'A second body')
  })
})
