import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { forgetLocalDeletionRecovery, getLocalDeletionRecoveries } from '@ui/web/lib/localDeletionRecovery'
import type { CachedNote } from '@core/types/offline'

const userA = { id: 'cleanup-test-a', email: 'a@cleanup.invalid' } as User
const userB = { id: 'cleanup-test-b', email: 'b@cleanup.invalid' } as User
const firstId = 'cleanup-first'
const secondId = 'cleanup-second'
const thirdId = 'cleanup-third'
const otherId = 'cleanup-other'
const url = 'https://cleanup-test.invalid'
const localNote = (id: string, title: string, owner = userA.id) => ({
  id, user_id: owner, title, description: `<p>${title} content</p>`, tags: [], status: 'synced' as const,
  updatedAt: '2026-10-01T00:00:00.000Z',
})

let controller: ReturnType<typeof useNoteAppController>
function TestApp() {
  const current = useNoteAppController()
  React.useEffect(() => { controller = current }, [current])
  return <><NotesShell controller={current} /><Toaster /></>
}
function SwitchableApp({ client }: { client: ReturnType<typeof createClient> }) {
  const [user, setUser] = React.useState(userA)
  return <>
    <button data-cy="account-a" onClick={() => setUser(userA)}>Account A</button>
    <button data-cy="account-b" onClick={() => setUser(userB)}>Account B</button>
    <SupabaseTestProvider supabase={client} user={user}><TestApp /></SupabaseTestProvider>
  </>
}
function openNote(title: string) {
  cy.contains('[data-testid="note-card"] button', title).click()
  cy.wrap(null).should(() => expect(controller.selectedNote?.title).to.equal(title))
}
function back() { cy.get('[data-cy="note-back-button"]').click() }
function deleteSingle() {
  cy.get('[data-cy="note-delete-button"]').click()
  cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
  cy.get('[role="alertdialog"]').should('not.exist')
}
function bulkDelete(count: number) {
  cy.contains('button', 'Select').click()
  cy.get('[data-testid="selection-mode-select-all"]').click()
  cy.get('[data-testid="selection-mode-delete"]').click()
  cy.get('[data-testid="bulk-delete-confirm-input"]').type(String(count))
  cy.get('[data-testid="bulk-delete-confirm"]').click()
  cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
}
function retryCleanup() {
  cy.get('[data-testid="device-sync-status"]').contains('summary', 'What can I do?').click()
  cy.get('[data-testid="retry-local-cleanup"]').click()
}

describe('Local cleanup after server deletion', { retries: 0 }, () => {
  let client: ReturnType<typeof createClient>
  let failedServerIds: Set<string>
  let deleteRequests: string[]
  let holdFirstDelete: boolean
  let releaseDelete: (() => void) | undefined
  let restoredFirst: boolean
  let holdFirstLookup: boolean
  let releaseLookup: (() => void) | undefined

  beforeEach(() => {
    failedServerIds = new Set()
    deleteRequests = []
    holdFirstDelete = false
    releaseDelete = undefined
    restoredFirst = false
    holdFirstLookup = false
    releaseLookup = undefined
    client = createClient(url, 'test-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    cy.viewport(390, 844)
    cy.clearLocalStorage()
    cy.window().then(win => { win.sessionStorage.clear(); win.history.replaceState({}, '', '/?view=notes') })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.intercept(`${url}/**`, req => {
      const id = new URL(req.url).searchParams.get('id')?.replace(/^eq\./, '')
      if (req.method === 'DELETE' && id) {
        deleteRequests.push(id)
        if (holdFirstDelete && id === firstId) {
          return new Cypress.Promise<void>(resolve => { releaseDelete = () => { req.reply({ statusCode: 204, body: '' }); resolve() } })
        }
        req.reply(failedServerIds.has(id) ? { statusCode: 500, body: { message: 'Synthetic failure' } } : { statusCode: 204, body: '' })
      } else if (req.method === 'GET' && id === firstId && holdFirstLookup) {
        holdFirstLookup = false
        return new Cypress.Promise<void>(resolve => { releaseLookup = () => {
          req.reply({ body: [{ id: firstId, user_id: userA.id, title: 'Old server copy', description: '<p>Old content</p>', tags: [], created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z' }] })
          resolve()
        } })
      } else if (req.method === 'GET' && restoredFirst && (id === firstId || (!id && new URL(req.url).pathname.endsWith('/notes')))) {
        req.reply({ body: [{ id: firstId, user_id: userA.id, title: 'Restored on server', description: '<p>Restored content</p>', tags: [], created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-03T00:00:00.000Z' }], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
    })
  })

  afterEach(() => {
    if (releaseDelete) cy.then(() => { releaseDelete?.(); releaseDelete = undefined })
    if (releaseLookup) cy.then(() => { releaseLookup?.(); releaseLookup = undefined })
    cy.then(() => {
      for (const user of [userA, userB]) getLocalDeletionRecoveries(user.id).forEach(entry => forgetLocalDeletionRecovery(user.id, entry))
    })
    cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine'); win.dispatchEvent(new win.Event('online')) })
  })

  it('reports successful server deletion and retries only local cleanup, preserving other notes', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'Other local copy'))
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    const original = webOfflineStorageAdapter.removeSyncedNotes!.bind(webOfflineStorageAdapter)
    let storageFailed = true
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').callsFake((notes, signal) => storageFailed ? Promise.reject(new Error('Synthetic local storage failure')) : original(notes, signal))
    deleteSingle()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Server accepted deletion; check local cleanup').and('contain.text', 'unavailable on the server')
    cy.contains('Server accepted deletion; local cleanup needs checking').should('be.visible')
    cy.contains('Note deleted successfully').should('not.exist')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include.members([firstId, secondId])
      expect(deleteRequests).to.deep.equal([firstId])
    })
    cy.screenshot('local-cleanup-failed', { capture: 'viewport' })
    cy.then(() => { storageFailed = false })
    retryCleanup()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup').and('not.contain.text', 'unavailable on the server')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include(secondId).and.not.include(firstId)
      expect(deleteRequests).to.deep.equal([firstId])
    })
    cy.screenshot('local-cleanup-recovered', { capture: 'viewport' })
  })

  it('exposes the local-only retry on desktop', () => {
    cy.viewport(1440, 900)
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    const original = webOfflineStorageAdapter.removeSyncedNotes!.bind(webOfflineStorageAdapter)
    let fail = true
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').callsFake((notes, signal) => fail ? Promise.reject(new Error('Synthetic storage failure')) : original(notes, signal))
    deleteSingle()
    cy.get('[data-testid="device-sync-status"]').should('be.visible').and('contain.text', 'Server accepted deletion; check local cleanup')
    cy.then(() => { fail = false })
    retryCleanup()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup')
    cy.then(() => expect(deleteRequests).to.deep.equal([firstId]))
  })

  it('keeps a copy changed after the failed cleanup and does not resend DELETE', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    const original = webOfflineStorageAdapter.removeSyncedNotes!.bind(webOfflineStorageAdapter)
    let storageFailed = true
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').callsFake((notes, signal) => storageFailed ? Promise.reject(new Error('Synthetic storage failure')) : original(notes, signal))
    deleteSingle()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'check local cleanup')
    cy.then(async () => {
      storageFailed = false
      await webOfflineStorageAdapter.saveNote({ ...localNote(firstId, 'Newer local edit'), status: 'pending', updatedAt: '2026-10-02T00:00:00.000Z' })
    })
    retryCleanup()
    cy.contains('Some local copies changed or could not be removed').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'check local cleanup')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === firstId)?.title).to.equal('Newer local edit')
      expect(deleteRequests).to.deep.equal([firstId])
    })
  })

  it('keeps a newer local edit made while the server deletion was in flight', () => {
    cy.then(async () => { await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')); holdFirstDelete = true })
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    cy.get('[data-cy="note-delete-button"]').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.wrap(null).should(() => expect(releaseDelete).to.be.a('function'))
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote({ ...localNote(firstId, 'Newer local edit'), status: 'pending', updatedAt: '2026-10-02T00:00:00.000Z' })
      releaseDelete!(); releaseDelete = undefined
    })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Server accepted deletion; check local cleanup')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === firstId)?.title).to.equal('Newer local edit')
      expect(deleteRequests).to.deep.equal([firstId])
    })
  })

  it('does not clear cleanup recovery with an old note response, but clears it on later server restoration', () => {
    let refreshDone = false
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    cy.then(() => {
      holdFirstLookup = true
      void controller.refreshSelectedNote(new AbortController().signal).then(() => { refreshDone = true })
    })
    cy.wrap(null).should(() => expect(releaseLookup).to.be.a('function'))
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').rejects(new Error('Synthetic storage failure'))
    deleteSingle()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Server accepted deletion; check local cleanup')
    cy.then(() => { releaseLookup!(); releaseLookup = undefined })
    cy.wrap(null).should(() => expect(refreshDone).to.equal(true))
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Server accepted deletion; check local cleanup')
    cy.then(() => { restoredFirst = true })
    cy.then(() => controller.refreshSelectedNote(new AbortController().signal))
    cy.contains('Restored on server').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup').and('not.contain.text', 'unavailable on the server')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include(firstId)
      expect(deleteRequests).to.deep.equal([firstId])
    })
  })

  it('clears recovery when a later list refresh verifies the restored server note', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').rejects(new Error('Synthetic storage failure'))
    deleteSingle()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Server accepted deletion; check local cleanup')
    back()
    cy.then(() => { restoredFirst = true })
    cy.then(() => controller.refreshNotes(new AbortController().signal))
    cy.contains('[data-testid="note-card"]', 'Restored on server').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup').and('not.contain.text', 'unavailable on the server')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include(firstId)
      expect(deleteRequests).to.deep.equal([firstId])
    })
  })

  it('keeps the status when local cleanup still fails, then succeeds without another server request', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    const original = webOfflineStorageAdapter.removeSyncedNotes!.bind(webOfflineStorageAdapter)
    let storageFailed = true
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').callsFake((notes, signal) => storageFailed ? Promise.reject(new Error('Synthetic storage failure')) : original(notes, signal))
    deleteSingle()
    retryCleanup()
    cy.contains('Some local copies changed or could not be removed').should('be.visible')
    cy.then(() => { storageFailed = false })
    cy.get('[data-testid="retry-local-cleanup"]').click()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup')
    cy.then(() => expect(deleteRequests).to.deep.equal([firstId]))
  })

  it('does not close an editor changed while local cleanup is in flight', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    const original = webOfflineStorageAdapter.removeSyncedNotes!.bind(webOfflineStorageAdapter)
    let fail = true
    let holdRetry = false
    let releaseRetry: (() => Promise<string[]>) | undefined
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').callsFake((notes, signal) => {
      if (fail) return Promise.reject(new Error('Synthetic storage failure'))
      if (holdRetry) return new Cypress.Promise<string[]>(resolve => { releaseRetry = () => original(notes, signal).then(result => { resolve(result); return result }) })
      return original(notes, signal)
    })
    deleteSingle()
    cy.then(() => { fail = false; holdRetry = true })
    retryCleanup()
    cy.wrap(null).should(() => expect(releaseRetry).to.be.a('function'))
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('New unsaved edit', { delay: 0 })
    cy.then(() => releaseRetry!())
    cy.get('[aria-label="Note title"]').should('have.value', 'New unsaved edit')
    cy.contains('An open or changed note was kept').should('be.visible')
    cy.then(() => expect(deleteRequests).to.deep.equal([firstId]))
  })

  it('reports a partial local cleanup failure in bulk and retries only that local copy', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'Second local copy'))
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy'); back()
    openNote('Second local copy'); back()
    const original = webOfflineStorageAdapter.removeSyncedNotes!.bind(webOfflineStorageAdapter)
    let failFirst = true
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').callsFake((notes: CachedNote[], signal?: AbortSignal) => failFirst && notes.some(note => note.id === firstId) ? Promise.reject(new Error('Synthetic storage failure')) : original(notes, signal))
    bulkDelete(2)
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'check local cleanup')
    cy.contains('accepted by the server; local cleanup needs checking').should('be.visible')
    cy.wrap(null).should(() => expect(controller.selectionMode).to.equal(false))
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include(firstId).and.not.include(secondId)
      expect(deleteRequests.sort()).to.deep.equal([firstId, secondId].sort())
      failFirst = false
    })
    retryCleanup()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup').and('not.contain.text', 'unavailable on the server')
    cy.then(() => expect(deleteRequests).to.have.length(2))
  })

  it('retains only server-failed selection when bulk also has a local cleanup failure', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'Second local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(thirdId, 'Third local copy'))
      failedServerIds.add(secondId)
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy'); back()
    openNote('Second local copy'); back()
    openNote('Third local copy'); back()
    const original = webOfflineStorageAdapter.removeSyncedNotes!.bind(webOfflineStorageAdapter)
    let failFirst = true
    cy.stub(webOfflineStorageAdapter, 'removeSyncedNotes').callsFake((notes: CachedNote[], signal?: AbortSignal) => failFirst && notes.some(note => note.id === firstId) ? Promise.reject(new Error('Synthetic storage failure')) : original(notes, signal))
    bulkDelete(3)
    cy.wrap(null).should(() => expect([...controller.selectedNoteIds]).to.deep.equal([secondId]))
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'check local cleanup').and('contain.text', 'unavailable on the server')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include.members([firstId, secondId]).and.not.include(thirdId)
      expect(deleteRequests).to.have.length(3)
      failFirst = false
    })
    retryCleanup()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup').and('contain.text', 'unavailable on the server')
    cy.then(() => expect(deleteRequests).to.have.length(3))
  })

  it('keeps the copy and reports a server failure without starting local cleanup', () => {
    cy.then(async () => { await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')); failedServerIds.add(firstId) })
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    cy.spy(webOfflineStorageAdapter, 'removeSyncedNotes').as('cleanup')
    deleteSingle()
    cy.contains('Failed to delete note').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server').and('not.contain.text', 'check local cleanup')
    cy.get('@cleanup').should('not.have.been.called')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => expect(notes.map(note => note.id)).to.include(firstId))
  })

  it('does not delete on the server when local snapshots cannot be read', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    const original = webOfflineStorageAdapter.loadNotes.bind(webOfflineStorageAdapter)
    let failedRead = true
    cy.then(() => { cy.stub(webOfflineStorageAdapter, 'loadNotes').callsFake(params => failedRead ? Promise.reject(new Error('Synthetic read failure')) : original(params)) })
    deleteSingle()
    cy.contains('Could not check local data. The deletion was not sent.').should('be.visible')
    cy.then(async () => {
      expect(deleteRequests).to.deep.equal([])
      failedRead = false
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include(firstId)
    })
  })

  it('reports a durable offline queue without claiming a server deletion', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false }); win.dispatchEvent(new win.Event('offline')) })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Offline')
    deleteSingle()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'waiting').and('not.contain.text', 'Server accepted deletion')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.noteId === firstId && item.operation === 'delete' && item.payload?.user_id === userA.id)).to.equal(true)
      expect(deleteRequests).to.deep.equal([])
    })
  })

  it('reports an offline queue when writing its local tombstone fails', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false }); win.dispatchEvent(new win.Event('offline')) })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Offline')
    const original = webOfflineStorageAdapter.saveNote.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'saveNote').callsFake(note => note.deleted ? Promise.reject(new Error('Synthetic storage failure')) : original(note))
    deleteSingle()
    cy.contains('It may already be queued').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'waiting').and('not.contain.text', 'Server accepted deletion')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.noteId === firstId && item.operation === 'delete')).to.equal(true)
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === firstId)?.deleted).not.to.equal(true)
      expect(deleteRequests).to.deep.equal([])
    })
  })

  it('reports the queued offline batch when one local tombstone fails', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'Second local copy'))
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={userA}><TestApp /></SupabaseTestProvider>)
    openNote('First local copy'); back()
    openNote('Second local copy'); back()
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false }); win.dispatchEvent(new win.Event('offline')) })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Offline')
    const original = webOfflineStorageAdapter.saveNote.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'saveNote').callsFake(note => note.id === secondId && note.deleted ? Promise.reject(new Error('Synthetic storage failure')) : original(note))
    cy.contains('button', 'Select').click()
    cy.get('[data-testid="selection-mode-select-all"]').click()
    cy.get('[data-testid="selection-mode-delete"]').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('2')
    cy.get('[data-testid="bulk-delete-confirm"]').click()
    cy.get('[data-testid="bulk-delete-error"]').should('be.visible').and('contain.text', 'Some deletions may already be queued')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', '2 waiting').and('not.contain.text', 'Server accepted deletion')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.getQueue()).filter(item => item.operation === 'delete').map(item => item.noteId).sort()).to.deep.equal([firstId, secondId].sort())
      expect(deleteRequests).to.deep.equal([])
    })
  })

  it('keeps cleanup recovery scoped to the original account after an in-flight switch', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'A local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(otherId, 'B local copy', userB.id))
      holdFirstDelete = true
    })
    cy.mount(<SwitchableApp client={client} />)
    openNote('A local copy')
    cy.get('[data-cy="note-delete-button"]').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.wrap(null).should(() => expect(releaseDelete).to.be.a('function'))
    cy.get('[data-cy="account-b"]').click({ force: true })
    openNote('B local copy')
    cy.then(() => { releaseDelete!(); releaseDelete = undefined })
    cy.wrap(null).should(() => expect(getLocalDeletionRecoveries(userA.id)).to.have.length(1))
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'Server accepted deletion')
    cy.contains('B local copy').should('be.visible')
    cy.get('[data-cy="account-a"]').click({ force: true })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Server accepted deletion; check local cleanup')
    retryCleanup()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include(otherId).and.not.include(firstId)
      expect(deleteRequests).to.deep.equal([firstId])
    })
  })

  it('keeps bulk cleanup recovery on the original account after an in-flight switch', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'A first copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'A second copy'))
      await webOfflineStorageAdapter.saveNote(localNote(otherId, 'B local copy', userB.id))
      holdFirstDelete = true
    })
    cy.mount(<SwitchableApp client={client} />)
    openNote('A first copy'); back()
    openNote('A second copy'); back()
    cy.contains('button', 'Select').click()
    cy.get('[data-testid="selection-mode-select-all"]').click()
    cy.get('[data-testid="selection-mode-delete"]').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('2')
    cy.get('[data-testid="bulk-delete-confirm"]').click()
    cy.wrap(null).should(() => expect(releaseDelete).to.be.a('function'))
    cy.get('[data-cy="account-b"]').click({ force: true })
    openNote('B local copy')
    cy.then(() => { releaseDelete!(); releaseDelete = undefined })
    cy.wrap(null).should(() => expect(getLocalDeletionRecoveries(userA.id)).to.have.length(2))
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'Server accepted deletion')
    cy.get('[data-cy="account-a"]').click({ force: true })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Server accepted deletion; check local cleanup')
    retryCleanup()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup')
    cy.then(async () => {
      const ids = (await webOfflineStorageAdapter.loadNotes()).map(note => note.id)
      expect(ids).to.include(otherId).and.not.include(firstId).and.not.include(secondId)
      expect(deleteRequests.sort()).to.deep.equal([firstId, secondId].sort())
    })
  })
})
