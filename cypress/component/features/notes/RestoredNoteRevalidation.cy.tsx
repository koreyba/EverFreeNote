import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'
import { addWorkspaceTab, createNoteWorkspaceState, openNoteInWorkspace, serializeNoteWorkspaceState, updateWorkspaceTab } from '@core/services/noteWorkspaceTabs'

const owner = { id: 'restored-owner', email: 'restored@example.invalid' } as User
const baseUrl = 'https://restored-notes.invalid'
const missing = { id: 'missing-restored', user_id: owner.id, title: 'Missing restored note', description: '<p>Keep this local copy</p>', tags: [], created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z' }
const existing = { id: 'existing-restored', user_id: owner.id, title: 'Existing restored note', description: '<p>Second local copy</p>', tags: [], created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z' }

function TestApp() { return <NotesShell controller={useNoteAppController()} /> }
function seedMissing(editing = false) {
  let workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'missing-tab', owner.id), missing)
  if (editing) workspace = updateWorkspaceTab(workspace, 'missing-tab', { mode: 'editing', saveState: 'error', saveError: 'Earlier local error', draft: { title: 'Unsaved private draft', description: '<p>Unsaved changes</p>' } })
  cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serializeNoteWorkspaceState(workspace)))
  cy.then(() => webOfflineStorageAdapter.saveNote({ ...missing, status: 'synced', updatedAt: missing.updated_at }))
}

describe('Restored note revalidation', { retries: 0 }, () => {
  beforeEach(() => {
    cy.viewport(1280, 900)
    cy.clearLocalStorage()
    cy.window().then(win => { win.sessionStorage.clear(); win.history.replaceState({}, '', '/?view=notes') })
    cy.then(() => webOfflineStorageAdapter.clearAll())
  })

  afterEach(() => {
    cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine'); win.dispatchEvent(new win.Event('online')) })
  })

  it('warns for a missing restored note while keeping both tabs and their local contents', () => {
    const client = createClient(baseUrl, 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const requests: { method: string; id: string | null; owner: string | null }[] = []
    cy.intercept(`${baseUrl}/**`, req => {
      const url = new URL(req.url)
      if (url.pathname.endsWith('/notes')) requests.push({ method: req.method, id: url.searchParams.get('id'), owner: url.searchParams.get('user_id') })
      const id = url.searchParams.get('id')
      if (req.method === 'GET' && id?.startsWith('in.(')) {
        req.reply({ body: [{ id: existing.id }], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
      } else if (req.method === 'GET' && id === `eq.${existing.id}`) req.reply({ body: existing })
      else req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
    })
    let workspace = openNoteInWorkspace(createNoteWorkspaceState(() => 'missing-tab', owner.id), missing)
    workspace = addWorkspaceTab(workspace, () => 'existing-tab')
    workspace = openNoteInWorkspace(workspace, existing)
    cy.window().then(win => win.sessionStorage.setItem(NOTE_WORKSPACE_STORAGE_KEY, serializeNoteWorkspaceState(workspace)))
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote({ ...missing, status: 'synced', updatedAt: missing.updated_at })
      await webOfflineStorageAdapter.saveNote({ ...existing, status: 'synced', updatedAt: existing.updated_at })
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={owner}><TestApp /></SupabaseTestProvider>)
    cy.contains('[data-cy="workspace-tab"]', missing.title).should('be.visible')
    cy.contains('[data-cy="workspace-tab"]', existing.title).should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(async () => {
      const cached = await webOfflineStorageAdapter.loadNotes()
      expect(cached.find(note => note.id === missing.id)?.description).to.equal(missing.description)
      expect(cached.find(note => note.id === existing.id)?.description).to.equal(existing.description)
      expect(requests.some(request => request.method === 'GET' && request.owner === `eq.${owner.id}` && request.id?.includes(missing.id) && request.id.includes(existing.id))).to.equal(true)
      expect(requests.some(request => request.method === 'DELETE' || request.method === 'PATCH' || request.method === 'POST')).to.equal(false)
    })
  })

  it('keeps restored notes available offline and checks them after reconnect', () => {
    const client = createClient(baseUrl, 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const checks: string[] = []
    cy.intercept(`${baseUrl}/**`, req => {
      const id = new URL(req.url).searchParams.get('id')
      if (req.method === 'GET' && id?.startsWith('in.(')) checks.push(id)
      req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
    })
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false }); win.dispatchEvent(new win.Event('offline')) })
    seedMissing()
    cy.mount(<SupabaseTestProvider supabase={client} user={owner}><TestApp /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Restored notes have not been checked').and('contain.text', 'Offline')
    cy.contains('[data-cy="workspace-tab"]', missing.title).should('be.visible')
    cy.then(() => expect(checks).to.have.length(0))
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(() => expect(checks.some(id => id.includes(missing.id))).to.equal(true))
  })

  it('reports a network error without claiming deletion and retries the check', () => {
    const client = createClient(baseUrl, 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    let fail = true
    cy.intercept(`${baseUrl}/**`, req => {
      const id = new URL(req.url).searchParams.get('id')
      if (req.method === 'GET' && id?.startsWith('in.(') && fail) req.reply({ statusCode: 503, body: { message: 'Synthetic network failure' } })
      else req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
    })
    seedMissing()
    cy.mount(<SupabaseTestProvider supabase={client} user={owner}><TestApp /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Could not check restored notes').and('not.contain.text', 'unavailable on the server')
    cy.get('[data-testid="device-sync-status"]').contains('summary', 'What can I do?').click()
    cy.then(() => { fail = false })
    cy.get('[data-testid="retry-restored-note-check"]').click()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server').and('not.contain.text', 'Could not check restored notes')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => expect(notes.find(note => note.id === missing.id)?.description).to.equal(missing.description))
  })

  it('clears the warning when a later check finds a restored server record', () => {
    const client = createClient(baseUrl, 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    let restored = false
    cy.intercept(`${baseUrl}/**`, req => {
      const id = new URL(req.url).searchParams.get('id')
      if (req.method === 'GET' && id?.startsWith('in.(') && restored) req.reply({ body: [{ id: missing.id }], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
      else req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
    })
    seedMissing()
    cy.mount(<SupabaseTestProvider supabase={client} user={owner}><TestApp /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(() => { restored = true })
    cy.window().then(win => win.dispatchEvent(new win.Event('focus')))
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => expect(notes.find(note => note.id === missing.id)?.description).to.equal(missing.description))
  })

  it('keeps a restored unsaved editor draft while reporting its missing server record', () => {
    const client = createClient(baseUrl, 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    const writes: string[] = []
    cy.intercept(`${baseUrl}/**`, req => {
      if (new URL(req.url).pathname.endsWith('/rest/v1/notes') && (req.method === 'PATCH' || req.method === 'POST' || req.method === 'DELETE')) writes.push(req.method)
      req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
    })
    seedMissing(true)
    cy.mount(<SupabaseTestProvider supabase={client} user={owner}><TestApp /></SupabaseTestProvider>)
    cy.get('[aria-label="Note title"]').should('have.value', 'Unsaved private draft')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.get('[aria-label="Note title"]').should('have.value', 'Unsaved private draft')
    // The editor's autosave debounce is 500 ms; observe the full window.
    cy.wait(750)
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === missing.id)?.description).to.equal(missing.description)
      expect(writes).to.deep.equal([])
    })
  })
})
