import React from 'react'
import axe from 'axe-core'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { toast, Toaster } from 'sonner'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import type { CachedNote, MutationQueueItem } from '@core/types/offline'
import { OfflineSyncManager } from '@core/services/offlineSyncManager'

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

function checkAccountStatus(text: string) {
  cy.get('[data-testid="device-sync-status"] [role="status"]')
    .should('have.attr', 'aria-live', 'polite')
    .and('have.attr', 'aria-atomic', 'true')
    .and('contain.text', text)
    .and('not.contain.text', 'Device-wide')
    .then(element => axe.run(element[0], { runOnly: { type: 'rule', values: ['aria-allowed-role', 'aria-valid-attr', 'aria-valid-attr-value'] } }))
    .then(result => expect(result.violations).to.deep.equal([]))
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

  afterEach(() => {
    // Dispose the previous account's sync manager before restoring connectivity;
    // otherwise its pending work can leak into the next test's intercepts.
    cy.mount(<></>)
    cy.window().then(win => {
      Reflect.deleteProperty(win.navigator, 'onLine')
      win.dispatchEvent(new win.Event('online'))
    })
  })

  it('enforces server-side ownership for authenticated users in the local fixture', () => {
    const id = crypto.randomUUID()
    cy.then(async () => {
      const created = await owner.from('notes').insert({ id, user_id: userA.id, title: 'A server note', description: 'A only', tags: [] })
      expect(created.error).to.equal(null)
      const read = await other.from('notes').select('id').eq('id', id)
      expect(read.error).to.equal(null)
      expect(read.data).to.deep.equal([])
      const update = await other.from('notes').update({ title: 'B overwrite' }).eq('id', id).select('id')
      expect(update.error).to.equal(null)
      expect(update.data).to.deep.equal([])
      const deletion = await other.from('notes').delete().eq('id', id).select('id')
      expect(deletion.error).to.equal(null)
      expect(deletion.data).to.deep.equal([])
      const forged = await other.from('notes').insert({ id: crypto.randomUUID(), user_id: userA.id, title: 'B forged note', tags: [] })
      expect(forged.error).not.to.equal(null)
      const original = await owner.from('notes').select('title,description').eq('id', id).single()
      expect(original.error).to.equal(null)
      expect(original.data).to.deep.equal({ title: 'A server note', description: 'A only' })
    })
  })

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

  it('announces an empty queue for B only while A still has pending work on this device', () => {
    const bId = crypto.randomUUID()
    const aId = crypto.randomUUID()
    cy.then(async () => {
      const inserted = await other.from('notes').insert({ id: bId, user_id: userB.id, title: 'B note', description: '<p>B body</p>', tags: [] })
      if (inserted.error) throw inserted.error
      await webOfflineStorageAdapter.saveNote({ id: aId, user_id: userA.id, title: 'A private title', description: 'A private body', tags: ['private'], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'a-private-queue', noteId: aId, operation: 'create', payload: { user_id: userA.id, title: 'A private title', description: 'A private body', tags: ['private'] }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
    })
    cy.intercept({ method: 'POST', pathname: '/rest/v1/notes' }).as('unexpectedCreate')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"] button', 'B note', { timeout: 10000 }).click()
    cy.get('[data-testid="device-sync-status"]').should('have.class', 'sr-only')
    checkAccountStatus('This account on this device: No waiting or failed changes reported')
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[data-testid="device-sync-status"]').should('have.class', 'sr-only')
    checkAccountStatus('This account on this device: No waiting or failed changes reported')
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.contains('Tag Management').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('have.class', 'sr-only')
    checkAccountStatus('This account on this device: No waiting or failed changes reported')
    cy.contains('A private title').should('not.exist')
    cy.contains('A private body').should('not.exist')
    cy.get('@unexpectedCreate.all').should('have.length', 0)
    cy.then(async () => expect((await webOfflineStorageAdapter.getQueue()).some(item => item.id === 'a-private-queue')).to.equal(true))
  })

  it('shows B’s own counts and device offline separately in mobile reader, editor and Tags', () => {
    const aId = crypto.randomUUID()
    const bId = crypto.randomUUID()
    cy.then(async () => {
      const inserted = await other.from('notes').insert({ id: bId, user_id: userB.id, title: 'B note', description: '<p>B body</p>', tags: [] })
      if (inserted.error) throw inserted.error
      for (const [id, ownerId, title] of [[aId, userA.id, 'A private title'], [bId, userB.id, 'B note']]) {
        await webOfflineStorageAdapter.saveNote({ id, user_id: ownerId, title, description: `<p>${title} body</p>`, tags: [], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      }
      const items: MutationQueueItem[] = [
        { id: 'a-waiting', noteId: aId, operation: 'update', payload: { user_id: userA.id }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' },
        { id: 'a-failed', noteId: aId, operation: 'update', payload: { user_id: userA.id }, clientUpdatedAt: '2026-10-01T00:00:01.000Z', status: 'failed' },
        { id: 'b-waiting', noteId: bId, operation: 'update', payload: { user_id: userB.id }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' },
        { id: 'b-failed-1', noteId: bId, operation: 'update', payload: { user_id: userB.id }, clientUpdatedAt: '2026-10-01T00:00:01.000Z', status: 'failed' },
        { id: 'b-failed-2', noteId: bId, operation: 'update', payload: { user_id: userB.id }, clientUpdatedAt: '2026-10-01T00:00:02.000Z', status: 'failed' },
      ]
      for (const item of items) await webOfflineStorageAdapter.upsertQueueItem(item)
    })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"] button', 'B note', { timeout: 10000 }).click()
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Device: Offline')
    checkAccountStatus('This account on this device: 2 failed · 1 waiting')
    cy.screenshot('account-status-mobile-reading', { capture: 'viewport' })
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Device: Offline')
    checkAccountStatus('This account on this device: 2 failed · 1 waiting')
    cy.screenshot('account-status-mobile-editing', { capture: 'viewport' })
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.contains('Tag Management').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Device: Offline')
    checkAccountStatus('This account on this device: 2 failed · 1 waiting')
    cy.screenshot('account-status-mobile-tags', { capture: 'viewport' })
    cy.contains('A private title').should('not.exist')
    cy.mount(<SupabaseTestProvider supabase={owner} user={userA}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Device: Offline')
    checkAccountStatus('This account on this device: 1 failed · 1 waiting')
    cy.contains('B note').should('not.exist')
    cy.then(async () => expect(await webOfflineStorageAdapter.getQueue()).to.have.length(5))
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

  it('lets B manage tags while A has pending, failed, dirty and proven legacy local data', () => {
    const bId = crypto.randomUUID()
    const foreignIds = Array.from({ length: 4 }, () => crypto.randomUUID())
    cy.then(async () => {
      const inserted = await other.from('notes').insert({ id: bId, user_id: userB.id, title: 'B note', description: 'B text', tags: ['old', 'keep'] })
      if (inserted.error) throw inserted.error
      const statuses = ['pending', 'failed', 'pending', 'pending'] as const
      for (let index = 0; index < foreignIds.length; index++) {
        const note: CachedNote = { id: foreignIds[index], ...(index === 3 ? {} : { user_id: userA.id }), title: `A private ${index}`, description: 'A secret', tags: ['old'], status: statuses[index], updatedAt: '2026-10-01T00:00:00.000Z' }
        await webOfflineStorageAdapter.saveNote(note)
        if (index !== 2) await webOfflineStorageAdapter.upsertQueueItem({ id: `foreign-${index}`, noteId: note.id, operation: 'create', payload: { user_id: userA.id, title: note.title, description: note.description, tags: note.tags }, clientUpdatedAt: note.updatedAt, status: statuses[index] })
      }
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('patch')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'B note', { timeout: 10000 }).should('be.visible')
    cy.contains('A private').should('not.exist')
    cy.contains('A secret').should('not.exist')
    cy.then(async () => {
      expect(await controller.handleRenameTag('old', 'new')).to.equal(true)
      const b = await other.from('notes').select('tags').eq('id', bId).single()
      if (b.error) throw b.error
      expect(b.data.tags).to.deep.equal(['new', 'keep'])
      const cache = await webOfflineStorageAdapter.loadNotes()
      for (const id of foreignIds) expect(cache.find(note => note.id === id)?.tags).to.deep.equal(['old'])
      expect((await webOfflineStorageAdapter.getQueue()).filter(item => item.id.startsWith('foreign-'))).to.have.length(3)
    })
    cy.get('@patch.all').then(requests => {
      expect(requests).to.have.length(1)
      expect(new URL(requests[0].request.url).searchParams.get('id')).to.equal(`eq.${bId}`)
    })
    cy.screenshot('privacy-tags-foreign-queue', { capture: 'viewport' })
  })

  it('blocks an unknown queued operation with a specific message and retains it', () => {
    const bId = crypto.randomUUID()
    const unknownId = crypto.randomUUID()
    cy.then(async () => {
      const inserted = await other.from('notes').insert({ id: bId, user_id: userB.id, title: 'B note', description: 'B text', tags: ['old'] })
      if (inserted.error) throw inserted.error
      await webOfflineStorageAdapter.saveNote({ id: unknownId, title: 'Hidden draft', description: 'Hidden text', tags: ['old'], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'unknown-op', noteId: unknownId, operation: 'update', payload: { title: 'Hidden draft', description: 'Hidden text', tags: ['old'] }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('patch')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'B note', { timeout: 10000 }).should('be.visible')
    cy.contains('Hidden draft').should('not.exist')
    cy.then(async () => {
      expect(String(await controller.handleRenameTag('old', 'new'))).to.contain('Some local changes need account verification')
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.id === 'unknown-op')).to.equal(true)
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === unknownId)?.description).to.equal('Hidden text')
      const b = await other.from('notes').select('tags').eq('id', bId).single()
      if (b.error) throw b.error
      expect(b.data.tags).to.deep.equal(['old'])
    })
    cy.get('@patch.all').should('have.length', 0)
    cy.screenshot('privacy-tags-unknown-queue', { capture: 'viewport' })
  })

  it('never patches an ownerless cached copy just because its ID matches B’s server note', () => {
    const id = crypto.randomUUID()
    const unknown: CachedNote = { id, title: 'Hidden draft', description: 'Hidden text', tags: ['different'], status: 'synced', updatedAt: '2026-10-01T00:00:00.000Z' }
    cy.then(async () => {
      const inserted = await other.from('notes').insert({ id, user_id: userB.id, title: 'B note', description: 'B text', tags: ['old'] })
      if (inserted.error) throw inserted.error
      await webOfflineStorageAdapter.saveNote(unknown)
    })
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'B note', { timeout: 10000 }).should('be.visible')
    cy.contains('Hidden draft').should('not.exist')
    cy.then(async () => {
      expect(await controller.handleRenameTag('old', 'new')).to.equal(true)
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === id)).to.deep.equal(unknown)
      const b = await other.from('notes').select('tags').eq('id', id).single()
      if (b.error) throw b.error
      expect(b.data.tags).to.deep.equal(['new'])
    })
  })

  it('still blocks B’s own pending, failed and unqueued dirty changes', () => {
    const bId = crypto.randomUUID()
    const localIds = Array.from({ length: 3 }, () => crypto.randomUUID())
    cy.then(async () => {
      const inserted = await other.from('notes').insert({ id: bId, user_id: userB.id, title: 'B note', description: 'B text', tags: ['old'] })
      if (inserted.error) throw inserted.error
      for (let index = 0; index < localIds.length; index++) {
        const status = index === 1 ? 'failed' : 'pending'
        const note: CachedNote = { id: localIds[index], user_id: userB.id, title: `B local ${index}`, description: 'Save first', tags: ['old'], status, updatedAt: '2026-10-01T00:00:00.000Z' }
        await webOfflineStorageAdapter.saveNote(note)
        if (index !== 2) await webOfflineStorageAdapter.upsertQueueItem({ id: `own-${index}`, noteId: note.id, operation: 'create', payload: { user_id: userB.id, title: note.title, description: note.description, tags: note.tags }, clientUpdatedAt: note.updatedAt, status })
      }
    })
    cy.stub(OfflineSyncManager.prototype, 'drainQueue').resolves()
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('patch')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'B note', { timeout: 10000 }).should('be.visible')
    cy.then(async () => {
      expect(String(await controller.handleRenameTag('old', 'new'))).to.contain('Finish syncing your notes')
      expect((await webOfflineStorageAdapter.getQueue()).filter(item => item.id.startsWith('own-'))).to.have.length(2)
      expect((await webOfflineStorageAdapter.loadNotes()).filter(note => localIds.includes(note.id))).to.have.length(3)
    })
    cy.get('@patch.all').should('have.length', 0)
  })

  it('does not announce success when another same-origin page queues a write during the server PATCH', () => {
    const bId = crypto.randomUUID()
    let started = false
    let release!: () => void
    let result: Promise<boolean | string>
    cy.then(async () => {
      const inserted = await other.from('notes').insert({ id: bId, user_id: userB.id, title: 'B note', description: 'B text', tags: ['old'] })
      if (inserted.error) throw inserted.error
    })
    cy.stub(toast, 'success').as('successToast')
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, req => new Promise<void>(resolve => {
      started = true
      release = () => { req.continue(); resolve() }
    })).as('heldPatch')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'B note', { timeout: 10000 }).should('be.visible')
    cy.then(() => { result = controller.handleRenameTag('old', 'new') })
    cy.wrap(null).should(() => expect(started).to.equal(true))
    cy.window().then(win => new Promise<void>((resolve, reject) => {
      const frame = win.document.createElement('iframe')
      frame.style.display = 'none'
      win.document.body.appendChild(frame)
      const open = frame.contentWindow!.indexedDB.open('everfreenote-offline', 2)
      open.onerror = () => reject(open.error)
      open.onsuccess = () => {
        const db = open.result
        const tx = db.transaction('queue', 'readwrite')
        tx.objectStore('queue').put({ id: 'other-page-write', noteId: bId, operation: 'update', payload: { user_id: userB.id, title: 'Newer draft', description: 'Other page', tags: ['old'] }, clientUpdatedAt: '2026-10-02T00:00:00.000Z', status: 'pending' })
        tx.oncomplete = () => { db.close(); frame.remove(); resolve() }
        tx.onerror = () => { db.close(); frame.remove(); reject(tx.error) }
      }
    }))
    cy.then(() => release())
    cy.then(() => result).should('eq', false)
    cy.get('@successToast').should('not.have.been.called')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.id === 'other-page-write')).to.equal(true)
      const b = await other.from('notes').select('tags').eq('id', bId).single()
      if (b.error) throw b.error
      expect(b.data.tags).to.deep.equal(['new'])
    })
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

  function seedLifecycleDraft() {
    const id = crypto.randomUUID()
    cy.then(async () => {
      const result = await other.from('notes').insert({ id, user_id: userB.id, title: 'Lifecycle server', description: 'Before', tags: ['old'] })
      if (result.error) throw result.error
      await webOfflineStorageAdapter.saveNote({ id, user_id: userB.id, title: 'Lifecycle draft', description: 'Offline edit', tags: ['old'], status: 'pending', updatedAt: '2026-10-01T00:00:00.000Z' })
      await webOfflineStorageAdapter.upsertQueueItem({ id: 'lifecycle-write', noteId: id, operation: 'update', payload: { user_id: userB.id, title: 'Lifecycle draft', description: 'Offline edit', tags: ['old'] }, clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'pending' })
    })
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('lifecyclePatch')
    cy.mount(<SupabaseTestProvider supabase={other} user={userB}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Device: Offline').and('contain.text', '1 waiting')
    return id
  }

  it('demonstrates that restoring online while the old app is mounted starts its queued sync', () => {
    const id = seedLifecycleDraft()
    cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine'); win.dispatchEvent(new win.Event('online')) })
    cy.wait('@lifecyclePatch').then(({ request, response }) => {
      expect(new URL(request.url).searchParams.get('id')).to.equal(`eq.${id}`)
      expect(request.body).to.include({ title: 'Lifecycle draft', description: 'Offline edit' })
      expect(response?.statusCode).to.equal(200)
    })
    cy.then(() => waitForQueue(statuses => statuses.length === 0))
  })

  it('does not start queued sync when connectivity is restored after app teardown', () => {
    const id = seedLifecycleDraft()
    cy.mount(<></>)
    cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine'); win.dispatchEvent(new win.Event('online')) })
    cy.window().then(win => new Promise(resolve => win.setTimeout(resolve, 500)))
    cy.get('@lifecyclePatch.all').should('have.length', 0)
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.id === 'lifecycle-write')).to.equal(true)
      const row = await other.from('notes').select('title,description').eq('id', id).single()
      if (row.error) throw row.error
      expect(row.data).to.deep.equal({ title: 'Lifecycle server', description: 'Before' })
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
