import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import type { CachedNote, MutationQueueItem } from '@core/types/offline'

const url = Cypress.env('AUDIT_SUPABASE_URL') ?? 'http://127.0.0.1:63421'
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) throw new Error('Local test database required')
let controller: ReturnType<typeof useNoteAppController>
function App() {
  const current = useNoteAppController()
  React.useEffect(() => { controller = current }, [current])
  return <><NotesShell controller={current} /><Toaster /></>
}
async function waitForQueue(predicate: (statuses: string[]) => boolean) {
  for (let i = 0; i < 100; i++) {
    const statuses = (await webOfflineStorageAdapter.getQueue()).map(item => item.status)
    if (predicate(statuses)) return
    await new Promise(resolve => setTimeout(resolve, 50))
  }
  throw new Error('Timed out waiting for queue state')
}

describe('Cache privacy subset', { retries: 0 }, () => {
  const password = `Synthetic-privacy-${Date.now()}!`
  let admin: SupabaseClient
  let owner: SupabaseClient
  let other: SupabaseClient
  let userA: User
  let userB: User

  before(() => cy.then({ timeout: 30000 }, async () => {
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    admin = createClient(url, Cypress.env('AUDIT_SERVICE_KEY'), options)
    owner = createClient(url, Cypress.env('AUDIT_ANON_KEY'), options)
    other = createClient(url, Cypress.env('AUDIT_ANON_KEY'), options)
    const emailA = `cache-owner-a-${Date.now()}@example.test`
    const emailB = `cache-owner-b-${Date.now()}@example.test`
    const a = await admin.auth.admin.createUser({ email: emailA, password, email_confirm: true })
    if (a.error || !a.data.user) throw a.error ?? new Error('Missing fixture A')
    userA = a.data.user
    const b = await admin.auth.admin.createUser({ email: emailB, password, email_confirm: true })
    if (b.error || !b.data.user) throw b.error ?? new Error('Missing fixture B')
    userB = b.data.user
    const loginA = await owner.auth.signInWithPassword({ email: emailA, password })
    const loginB = await other.auth.signInWithPassword({ email: emailB, password })
    if (loginA.error || loginB.error) throw loginA.error ?? loginB.error
  }))

  after(() => cy.then({ timeout: 30000 }, async () => {
    if (userA) { const result = await admin.auth.admin.deleteUser(userA.id); if (result.error) throw result.error }
    if (userB) { const result = await admin.auth.admin.deleteUser(userB.id); if (result.error) throw result.error }
  }))

  beforeEach(() => {
    cy.viewport(390, 844)
    cy.then(async () => {
      const a = await admin.from('notes').delete().eq('user_id', userA.id)
      const b = await admin.from('notes').delete().eq('user_id', userB.id)
      if (a.error || b.error) throw a.error ?? b.error
      await webOfflineStorageAdapter.clearAll()
    })
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.history.replaceState({}, '', '/?view=notes')
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false })
      win.dispatchEvent(new win.Event('offline'))
    })
  })

  afterEach(() => cy.window().then(win => {
    Reflect.deleteProperty(win.navigator, 'onLine')
    win.dispatchEvent(new win.Event('online'))
  }))

  it('hides an ownerless draft from B but restores it to A when its original operation proves ownership', () => {
    const id = crypto.randomUUID()
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote({ id, title: 'A private offline draft', description: 'A only', tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'owner-a-create', noteId: id, operation: 'create', payload: { user_id: userA.id, title: 'A private offline draft', description: 'A only', tags: [] }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
    })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('Notes').should('be.visible')
    cy.contains('A private offline draft').should('not.exist')
    cy.mount(<SupabaseTestProvider supabase={owner} user={userA}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'A private offline draft', { timeout: 10000 }).should('be.visible')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.id === 'owner-a-create')).to.equal(true)
      expect((await webOfflineStorageAdapter.loadNotes()).find(item => item.id === id)?.title).to.equal('A private offline draft')
    })
  })

  it('does not erase a newer IndexedDB edit when synced tombstone cleanup races it', () => {
    const id = crypto.randomUUID()
    cy.then(async () => {
      const tombstone = { id, user_id: userA.id, title: 'Deleted', description: '', tags: [], status: 'synced' as const, deleted: true, updatedAt: '2026-10-01T00:00:00.000Z' }
      const restored = { ...tombstone, title: 'Newer local draft', description: 'Preserve this', status: 'pending' as const, deleted: false, updatedAt: '2026-10-02T00:00:00.000Z' }
      await webOfflineStorageAdapter.saveNote(tombstone)
      await Promise.all([
        webOfflineStorageAdapter.removeSyncedTombstones!([tombstone]),
        webOfflineStorageAdapter.saveNote(restored),
      ])
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === id)).to.deep.equal(restored)
    })
  })

  it('does not overwrite a newer IndexedDB edit while claiming an older snapshot', () => {
    const id = crypto.randomUUID()
    cy.then(async () => {
      const legacy: CachedNote = { id, title: 'Legacy draft', description: 'Original', tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' }
      const item: MutationQueueItem = { id: 'claim-race', noteId: id, operation: 'create', payload: { user_id: userA.id, title: legacy.title, description: legacy.description, tags: legacy.tags }, clientUpdatedAt: legacy.updatedAt, status: 'pending' }
      const edited: CachedNote = { ...legacy, user_id: userA.id, title: 'Newer draft', updatedAt: '2026-10-02T00:00:00.000Z' }
      await webOfflineStorageAdapter.saveNote(legacy)
      await webOfflineStorageAdapter.upsertQueueItem(item)
      await Promise.all([
        webOfflineStorageAdapter.claimLegacySnapshot!(legacy, item, userA.id),
        webOfflineStorageAdapter.saveNote(edited),
      ])
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === id)).to.deep.equal(edited)
      expect((await webOfflineStorageAdapter.getQueue()).some(entry => entry.id === item.id)).to.equal(true)
    })
  })

  it('retains the note and operation if an IndexedDB ownership write fails', () => {
    const id = crypto.randomUUID()
    let legacy: CachedNote
    let item: MutationQueueItem
    cy.then(async () => {
      legacy = { id, title: 'Keep on quota error', description: 'Unsynced data', tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' }
      item = { id: 'claim-write-failure', noteId: id, operation: 'create', payload: { user_id: userA.id, title: legacy.title, description: legacy.description, tags: legacy.tags }, clientUpdatedAt: legacy.updatedAt, status: 'pending' }
      await webOfflineStorageAdapter.saveNote(legacy)
      await webOfflineStorageAdapter.upsertQueueItem(item)
    })
    cy.window().then(win => {
      const prototype = win.IDBObjectStore.prototype
      const originalPut = prototype.put
      cy.stub(prototype, 'put').callsFake(function (this: IDBObjectStore, value: unknown, key?: IDBValidKey) {
        if (this.name === 'notes' && (value as CachedNote).id === id && (value as CachedNote).user_id === userA.id) {
          throw new win.DOMException('Simulated write failure', 'QuotaExceededError')
        }
        return originalPut.call(this, value, key)
      })
    })
    cy.then(async () => {
      let error: unknown
      try { await webOfflineStorageAdapter.claimLegacySnapshot!(legacy, item, userA.id) } catch (caught) { error = caught }
      expect(error).to.be.instanceOf(DOMException)
      expect((error as DOMException).name).to.equal('QuotaExceededError')
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === id)).to.deep.equal(legacy)
      expect((await webOfflineStorageAdapter.getQueue()).some(entry => entry.id === item.id)).to.equal(true)
    })
  })

  it('does not expose a different ownerless copy just because B has an operation with the same ID', () => {
    const id = crypto.randomUUID()
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote({ id, title: 'Unrelated private cache', description: 'Do not reveal', tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'different-owned-update', noteId: id, operation: 'update', payload: { user_id: userB.id, title: 'Other update', description: 'Other content', tags: [] }, clientUpdatedAt: '2026-10-02T00:00:00.000Z', status: 'pending' })
    })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]', { timeout: 10000 }).should('contain.text', 'needs account verification')
    cy.contains('Unrelated private cache').should('not.exist')
    cy.then(async () => expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === id)?.title).to.equal('Unrelated private cache'))
  })

  it('retains proven IndexedDB ownership after create succeeds and A returns offline', () => {
    const id = crypto.randomUUID()
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote({ id, title: 'Owned legacy creation', description: 'Keep offline', tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'claimed-create', noteId: id, operation: 'create', payload: { user_id: userA.id, title: 'Owned legacy creation', description: 'Keep offline', tags: [] }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
    })
    cy.intercept({ method: 'POST', pathname: '/rest/v1/notes' }).as('sendCreate')
    cy.mount(<SupabaseTestProvider supabase={owner} user={userA}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'Owned legacy creation').should('be.visible')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.wait('@sendCreate')
    cy.then(() => waitForQueue(statuses => statuses.length === 0))
    cy.then(async () => {
      const note = (await webOfflineStorageAdapter.loadNotes()).find(item => item.id === id)
      expect(note).to.include({ user_id: userA.id, title: 'Owned legacy creation' })
    })
    cy.intercept({ method: 'GET', pathname: '/rest/v1/notes' }, { forceNetworkError: true })
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false }); win.dispatchEvent(new win.Event('offline')) })
    cy.mount(<SupabaseTestProvider supabase={owner} user={userA}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'Owned legacy creation', { timeout: 10000 }).should('be.visible')
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('Owned legacy creation').should('not.exist')
  })

  it('keeps a legacy create unsent when the ownership claim hits quota and retries after recovery', () => {
    const id = crypto.randomUUID()
    let failing = true
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote({ id, title: 'Claim retry draft', description: 'Keep this', tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'claim-retry', noteId: id, operation: 'create', payload: { user_id: userA.id, title: 'Claim retry draft', description: 'Keep this', tags: [] }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
    })
    cy.then(() => {
      const original = webOfflineStorageAdapter.claimLegacySnapshot!
      cy.stub(webOfflineStorageAdapter, 'claimLegacySnapshot').callsFake(async (snapshot: CachedNote, item: MutationQueueItem, ownerId: string, signal?: AbortSignal) => {
        if (failing) throw new DOMException('Simulated quota exhaustion', 'QuotaExceededError')
        return original(snapshot, item, ownerId, signal)
      })
    })
    cy.intercept({ method: 'POST', pathname: '/rest/v1/notes' }).as('sendCreate')
    cy.mount(<SupabaseTestProvider supabase={owner} user={userA}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'Claim retry draft').should('be.visible')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.get('[data-testid="device-sync-status"]', { timeout: 15000 }).should('contain.text', "Could not safely retain a local note's account")
    cy.screenshot('privacy-ownership-claim-blocked', { capture: 'viewport' })
    cy.get('@sendCreate.all').should('have.length', 0)
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.id === 'claim-retry')).to.equal(true)
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === id)?.title).to.equal('Claim retry draft')
      failing = false
    })
    cy.get('[data-testid="device-sync-status"] summary').click()
    cy.contains('[data-testid="device-sync-status"] button', 'Check again').click()
    cy.wait('@sendCreate')
    cy.then(() => waitForQueue(statuses => statuses.length === 0))
    cy.then(async () => expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === id)?.user_id).to.equal(userA.id))
  })

  it('keeps an unverified changed draft hidden and shows recovery guidance in editor and Tags', () => {
    const id = crypto.randomUUID()
    const visibleId = crypto.randomUUID()
    cy.then(async () => {
      const result = await owner.from('notes').insert([
        { id, user_id: userA.id, title: 'Different server version', description: 'Server text', tags: [], created_at: '2026-09-01T00:00:00Z' },
        { id: visibleId, user_id: userA.id, title: 'A ordinary note', description: 'Visible text', tags: [] },
      ])
      if (result.error) throw result.error
      await webOfflineStorageAdapter.saveNote({ id, title: 'Hidden private draft', description: 'Private changes', tags: [], status: 'pending', created_at: '2026-09-01T00:00:00Z', updatedAt: '2026-10-01T00:00:00Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'unknown-update', noteId: id, operation: 'update', payload: { title: 'Hidden private draft', description: 'Private changes', tags: [] }, clientUpdatedAt: '2026-10-01T00:00:00Z', status: 'pending' })
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('unexpectedPatch')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.mount(<SupabaseTestProvider supabase={owner} user={userA}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]', { timeout: 15000 }).should('contain.text', 'needs account verification')
    cy.contains('Hidden private draft').should('not.exist')
    cy.get('[data-testid="device-sync-status"] summary').click()
    cy.contains('Some older drafts cannot be verified automatically').should('be.visible')
    cy.contains('[data-testid="device-sync-status"] button', 'Check again').click()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'needs account verification')
    cy.contains('[data-testid="note-card"] button', 'A ordinary note').click()
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'needs account verification')
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'needs account verification')
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.contains('Tag Management').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'needs account verification')
    cy.get('@unexpectedPatch.all').then(requests => {
      expect(requests.filter((request: { request: { url: string } }) => new URL(request.request.url).searchParams.get('id') === `eq.${id}`)).to.have.length(0)
    })
    cy.screenshot('privacy-unverified-mobile-tags', { capture: 'viewport' })
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.id === 'unknown-update')).to.equal(true)
      expect((await webOfflineStorageAdapter.loadNotes()).find(item => item.id === id)?.title).to.equal('Hidden private draft')
    })
  })

  it('retries an owned offline create after a synthetic 503 against the real local API', () => {
    const id = crypto.randomUUID()
    let attempts = 0
    let failing = true
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote({ id, user_id: userA.id, title: 'Recover after outage', description: 'Queued body', tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'owned-create', noteId: id, operation: 'create', payload: { user_id: userA.id, title: 'Recover after outage', description: 'Queued body', tags: [] }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
    })
    cy.intercept({ method: 'POST', pathname: '/rest/v1/notes' }, req => {
      attempts += 1
      if (failing) req.reply({ statusCode: 503, body: { message: 'Synthetic temporary outage' } })
      else req.continue()
    }).as('createAttempt')
    cy.mount(<SupabaseTestProvider supabase={owner} user={userA}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'Recover after outage').should('be.visible')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.wait('@createAttempt')
    cy.then(() => waitForQueue(statuses => statuses.includes('failed')))
    cy.get('[data-testid="device-sync-status"]').should('contain.text', '1 failed')
    cy.then(() => { failing = false })
    cy.window().then(win => win.dispatchEvent(new win.Event('focus')))
    cy.wait('@createAttempt')
    cy.then(() => waitForQueue(statuses => statuses.length === 0))
    cy.then(async () => {
      const row = await owner.from('notes').select('id,user_id,title,description').eq('id', id).single()
      if (row.error) throw row.error
      expect(row.data).to.include({ id, user_id: userA.id, title: 'Recover after outage', description: 'Queued body' })
      expect(attempts).to.be.at.least(2)
    })
  })

  it('retains and identifies an owned copy missing remotely and blocks an affected tag change', () => {
    const id = crypto.randomUUID()
    const visibleId = crypto.randomUUID()
    cy.then(async () => {
      const result = await owner.from('notes').insert({ id: visibleId, user_id: userA.id, title: 'Server note', description: 'Server body', tags: ['old'] })
      if (result.error) throw result.error
      await webOfflineStorageAdapter.saveNote({ id, user_id: userA.id, title: 'Retained local copy', description: 'Local only', tags: ['old'], status: 'synced', updatedAt: '2026-10-01T00:00:00.000Z' })
    })
    cy.intercept({ method: 'POST', pathname: '/rest/v1/notes' }).as('unexpectedCreate')
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('unexpectedPatch')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.mount(<SupabaseTestProvider supabase={owner} user={userA}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"] button', 'Retained local copy', { timeout: 10000 }).click()
    cy.contains('Local only').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.screenshot('privacy-local-copy-mobile', { capture: 'viewport' })
    cy.then(async () => {
      await controller.refreshNotes(new AbortController().signal)
      expect((await webOfflineStorageAdapter.loadNotes()).find(item => item.id === id)?.description).to.equal('Local only')
      const result = await controller.handleRenameTag('old', 'new')
      expect(String(result)).to.match(/local copies|open note/i)
    })
    cy.get('@unexpectedCreate.all').should('have.length', 0)
    cy.get('@unexpectedPatch.all').should('have.length', 0)
  })
})
