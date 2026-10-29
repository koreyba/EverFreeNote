import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'
import { createNoteWorkspaceState, openNoteInWorkspace, serializeNoteWorkspaceState } from '@core/services/noteWorkspaceTabs'
import { NoteService } from '@core/services/notes'

const a = { id: 'race-owner-a', email: 'a@race.invalid' } as User
const b = { id: 'race-owner-b', email: 'b@race.invalid' } as User
const note = (owner: User) => ({ id: `note-${owner.id}`, user_id: owner.id, title: `Private ${owner.id}`, description: `<p>Private ${owner.id} body</p>`, tags: [], created_at: '2026-10-01T00:00:00Z', updated_at: '2026-10-01T00:00:00Z' })
const noteA = note(a)
const noteB = note(b)
const workspace = (owner: User) => serializeNoteWorkspaceState(openNoteInWorkspace(createNoteWorkspaceState(() => `tab-${owner.id}`, owner.id), note(owner)))

function App({ client }: { client: SupabaseClient }) {
  const [user, setUser] = React.useState(a)
  return <>
    <button data-cy="switch-a" onClick={() => setUser(a)}>A</button>
    <button data-cy="switch-b" onClick={() => setUser(b)}>B</button>
    <SupabaseTestProvider supabase={client} user={user}><Content /></SupabaseTestProvider>
  </>
}
function Content() { return <NotesShell controller={useNoteAppController()} /> }

describe('Restored account validation races', { retries: 0 }, () => {
  it('does not apply delayed checks across a rapid A to B to A switch', () => {
    const client = createClient('https://restored-race.invalid', 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const pending: { ids: string[]; owner: string; resolve: (value: string[]) => void; promise: Promise<string[]> }[] = []
    cy.stub(NoteService.prototype, 'getExistingNoteIds').callsFake((ids: string[], owner: string) => {
      let release!: (value: string[]) => void
      const promise = new Promise<string[]>(resolve => { release = resolve })
      pending.push({ ids, owner, resolve: release, promise })
      return promise
    })
    const writes: string[] = []
    cy.intercept('https://restored-race.invalid/**', req => {
      if (new URL(req.url).pathname.endsWith('/rest/v1/notes') && ['POST', 'PATCH', 'DELETE'].includes(req.method)) writes.push(req.method)
      req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
    })
    cy.viewport(1280, 900)
    cy.clearLocalStorage()
    cy.window().then(win => { win.sessionStorage.clear(); win.history.replaceState({}, '', '/?view=notes'); win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, workspace(a)) })
    cy.then(async () => {
      await webOfflineStorageAdapter.clearAll()
      await webOfflineStorageAdapter.saveNote({ ...noteA, status: 'synced', updatedAt: noteA.updated_at })
      await webOfflineStorageAdapter.saveNote({ ...noteB, status: 'synced', updatedAt: noteB.updated_at })
    })
    cy.mount(<App client={client} />)
    cy.wrap(null).should(() => expect(pending).to.have.length(1))
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, workspace(b)))
    cy.get('[data-cy="switch-b"]').click({ force: true })
    cy.contains('[data-cy="workspace-tab"]', noteB.title).should('be.visible')
    cy.get('[data-cy="workspace-tab"]').should('not.contain.text', noteA.title)
    cy.wrap(null).should(() => expect(pending).to.have.length(2))
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, workspace(a)))
    cy.get('[data-cy="switch-a"]').click({ force: true })
    cy.contains('[data-cy="workspace-tab"]', noteA.title).should('be.visible')
    cy.get('[data-cy="workspace-tab"]').should('not.contain.text', noteB.title)
    cy.wrap(null).should(() => expect(pending).to.have.length(3))
    cy.then(() => {
      expect(pending.map(request => ({ ids: request.ids, owner: request.owner }))).to.deep.equal([
        { ids: [noteA.id], owner: a.id }, { ids: [noteB.id], owner: b.id }, { ids: [noteA.id], owner: a.id },
      ])
      pending[0].resolve([])
      pending[1].resolve([])
      return Promise.all([pending[0].promise, pending[1].promise])
    })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Checking restored notes').and('not.contain.text', 'unavailable on the server')
    cy.then(() => { pending[2].resolve([noteA.id]); return pending[2].promise })
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'Checking restored notes').and('not.contain.text', 'unavailable on the server')
    cy.then(async () => {
      const cached = await webOfflineStorageAdapter.loadNotes()
      expect(cached.find(item => item.id === noteA.id)?.description).to.equal(noteA.description)
      expect(cached.find(item => item.id === noteB.id)?.description).to.equal(noteB.description)
      expect(writes).to.deep.equal([])
    })
  })
})
