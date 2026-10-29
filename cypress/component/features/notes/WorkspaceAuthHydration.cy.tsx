import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import App from '../../../../app/page'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'
import { addWorkspaceTab, createNoteWorkspaceState, openNoteInWorkspace, serializeNoteWorkspaceState } from '@core/services/noteWorkspaceTabs'

const user = { id: 'workspace-user', email: 'workspace@example.invalid' } as User
const notes = [
  { id: 'first', title: 'Restored first', description: '<p>First restored body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
  { id: 'second', title: 'Restored second', description: '<p>Second restored body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T09:00:00Z', updated_at: '2026-10-28T09:00:00Z' },
]

function DelayedSession({ client }: { client: SupabaseClient }) {
  const [currentUser, setCurrentUser] = React.useState<User | null>(null)
  const [loading, setLoading] = React.useState(true)
  return <>
    <button onClick={() => setLoading(false)}>Resolve empty cached user</button>
    <button onClick={() => { setCurrentUser(user); setLoading(false) }}>Resolve authenticated user</button>
    <SupabaseTestProvider supabase={client} user={currentUser} loading={loading}><App /></SupabaseTestProvider>
  </>
}

describe('Restoring workspace after asynchronous authentication', { retries: 0 }, () => {
  it('keeps both open notes through a temporary null user and displays the restored active note', () => {
    cy.viewport(1440, 900)
    const client = createClient('https://workspace-auth.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://workspace-auth.invalid/**', req => {
      if (req.url.includes('/rest/v1/notes')) {
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        const noteId = new URL(req.url).searchParams.get('id')
        const selected = notes.find(item => noteId === `eq.${item.id}`) ?? notes[0]
        req.reply({ body: single ? selected : notes, headers: { 'content-range': '0-1/2', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    let workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'first-tab', user.id), notes[0])
    workspace = addWorkspaceTab(workspace, () => 'second-tab')
    workspace = openNoteInWorkspace(workspace, notes[1])
    const persisted = serializeNoteWorkspaceState(workspace)
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, persisted)
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<DelayedSession client={client} />)
    cy.contains('Loading EverFreeNote').should('exist')
    cy.contains('button', 'Resolve empty cached user').click()
    cy.window().then(win => {
      expect(win.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)).to.equal(persisted)
    })
    cy.contains('button', 'Resolve authenticated user').click()
    cy.contains('[data-cy="workspace-tab"]', 'Restored first').should('be.visible')
    cy.contains('[data-cy="workspace-tab"]', 'Restored second').should('be.visible')
    cy.get('[data-testid="editor-container"]').should('contain', 'Second restored body')
    cy.contains('[data-cy="workspace-tab"]', 'Restored first').click()
    cy.get('[data-testid="editor-container"]').should('contain', 'First restored body')
  })

  it('restores split only after the matching account and workspace hydrate', () => {
    cy.viewport(1440, 900)
    const client = createClient('https://workspace-auth.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://workspace-auth.invalid/**', req => {
      if (!req.url.includes('/rest/v1/notes')) return req.reply({ body: [] })
      const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
      const noteId = new URL(req.url).searchParams.get('id')
      const selected = notes.find(item => noteId === `eq.${item.id}`) ?? notes[0]
      req.reply({ body: single ? selected : notes, headers: { 'content-range': '0-1/2', 'access-control-expose-headers': 'content-range' } })
    })
    let workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'first-tab', user.id), notes[0])
    workspace = addWorkspaceTab(workspace, () => 'second-tab')
    workspace = openNoteInWorkspace(workspace, notes[1])
    const persisted = serializeNoteWorkspaceState({ ...workspace, split: { leftTabId: 'first-tab', rightTabId: 'second-tab', focusedTabId: 'second-tab' } })
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, persisted)
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<DelayedSession client={client} />)
    cy.contains('Loading EverFreeNote').should('exist')
    cy.contains('button', 'Resolve empty cached user').click()
    cy.get('[data-testid="split-pane-left"]').should('not.exist')
    cy.window().then(win => expect(win.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY)).to.equal(persisted))
    cy.contains('button', 'Resolve authenticated user').click()
    cy.get('[data-testid="split-pane-left"]').should('contain', 'First restored body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Second restored body')
  })
})
