import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { getLocalDeletionRecoveries } from '@ui/web/lib/localDeletionRecovery'
import { Toaster } from 'sonner'

const user = { id: 'review-synthetic-user', email: 'review@example.invalid' } as User
const url = 'https://review-unavailable.invalid'
const noteId = 'synthetic-missing-review-note'
function TestApp() { return <NotesShell controller={useNoteAppController()} /> }

describe('Unavailable local-note warning', { retries: 0 }, () => {
  let mountApp: () => void
  beforeEach(() => {
    cy.viewport(390, 844)
    const client = createClient(url, 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    cy.intercept(`${url}/**`, req => {
      if (req.method === 'DELETE') req.reply({ statusCode: 204, body: '' })
      else req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
    })
    cy.clearLocalStorage()
    cy.window().then(win => { win.sessionStorage.clear(); win.history.replaceState({}, '', '/?view=notes') })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.then(() => webOfflineStorageAdapter.saveNote({ id: noteId, user_id: user.id, title: 'Synthetic missing note', description: '<p>Local content</p>', tags: [], status: 'synced', updatedAt: '2026-10-01T00:00:00.000Z' }))
    mountApp = () => { cy.mount(<SupabaseTestProvider supabase={client} user={user}><TestApp /></SupabaseTestProvider>) }
    mountApp()
    cy.contains('[data-testid="note-card"] button', 'Synthetic missing note').click()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
  })

  function assertDeleted() {
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => expect(notes.filter(n => n.id === noteId)).to.have.length(0))
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
    mountApp()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
    cy.contains('[data-testid="note-card"]', 'Synthetic missing note').should('not.exist')
  }

  it('clears the warning after deleting the sole unavailable local copy', () => {
    cy.screenshot('unavailable-warning-before', { capture: 'viewport' })
    cy.get('[data-cy="note-delete-button"]').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
    cy.screenshot('unavailable-warning-after', { capture: 'viewport' })
    assertDeleted()
  })

  it('clears the warning after bulk-deleting the sole unavailable local copy', () => {
    cy.get('[data-cy="note-back-button"]').click()
    cy.contains('button', 'Select').click()
    cy.get('[data-testid="selection-mode-select-all"]').click()
    cy.get('[data-testid="selection-mode-delete"]').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('1')
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.get('[role="alertdialog"]').should('not.exist')
    assertDeleted()
  })
})

const secondUser = { id: 'review-other-user', email: 'other@example.invalid' } as User
const firstId = 'synthetic-first-missing'
const secondId = 'synthetic-second-missing'
const otherId = 'synthetic-other-missing'
const localNote = (id: string, title: string, owner = user.id) => ({
  id, user_id: owner, title, description: `<p>${title} body</p>`, tags: [], status: 'synced' as const,
  updatedAt: '2026-10-01T00:00:00.000Z',
})

let currentController: ReturnType<typeof useNoteAppController>
function ControlledApp() {
  const controller = useNoteAppController()
  React.useEffect(() => { currentController = controller }, [controller])
  return <><NotesShell controller={controller} /><Toaster /></>
}

function SwitchableApp({ client }: { client: ReturnType<typeof createClient> }) {
  const [currentUser, setCurrentUser] = React.useState<User>(user)
  return <>
    <button data-cy="switch-first-account" onClick={() => setCurrentUser(user)}>First account</button>
    <button data-cy="switch-other-account" onClick={() => setCurrentUser(secondUser)}>Other account</button>
    <SupabaseTestProvider supabase={client} user={currentUser}><ControlledApp /></SupabaseTestProvider>
  </>
}

function openMissing(title: string) {
  cy.contains('[data-testid="note-card"] button', title).click()
  cy.wrap(null).should(() => expect(currentController.selectedNote?.title).to.equal(title))
  cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
}

function backToList() {
  cy.get('[data-cy="note-back-button"]').click()
}

function confirmSingleDelete() {
  cy.get('[data-cy="note-delete-button"]').click()
  cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
  cy.get('[role="alertdialog"]').should('not.exist')
}

function selectAndConfirmBulk(count: number) {
  cy.contains('button', 'Select').click()
  cy.get('[data-testid="selection-mode-select-all"]').click()
  cy.get('[data-testid="selection-mode-delete"]').click()
  cy.get('[data-testid="bulk-delete-confirm-input"]').type(String(count))
  cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
}

describe('Unavailable local-note warning with multiple notes and sessions', { retries: 0 }, () => {
  let client: ReturnType<typeof createClient>
  let failedDeletes: Set<string>
  let restoredFirst: boolean
  let heldDelete: (() => void) | undefined
  let holdFirstDelete: boolean
  let sentDeletes: string[]
  let holdExistence: boolean
  let heldExistence: (() => void) | undefined
  let holdPage: boolean
  let heldPage: (() => void) | undefined

  beforeEach(() => {
    failedDeletes = new Set()
    restoredFirst = false
    heldDelete = undefined
    holdFirstDelete = false
    sentDeletes = []
    holdExistence = false
    heldExistence = undefined
    holdPage = false
    heldPage = undefined
    client = createClient(url, 'test-public-key', { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } })
    cy.viewport(390, 844)
    cy.clearLocalStorage()
    cy.window().then(win => { win.sessionStorage.clear(); win.history.replaceState({}, '', '/?view=notes') })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.intercept(`${url}/**`, req => {
      const id = new URL(req.url).searchParams.get('id')?.replace(/^eq\./, '')
      if (req.method === 'DELETE' && id) {
        sentDeletes.push(id)
        if (holdFirstDelete && id === firstId) {
          return new Cypress.Promise<void>(resolve => { heldDelete = () => { req.reply({ statusCode: 204, body: '' }); resolve() } })
        }
        req.reply(failedDeletes.has(id) ? { statusCode: 500, body: { message: 'Synthetic delete failure' } } : { statusCode: 204, body: '' })
      } else if (req.method === 'GET' && !id && new URL(req.url).pathname.endsWith('/notes') && holdPage) {
        holdPage = false
        return new Cypress.Promise<void>(resolve => { heldPage = () => {
          req.reply({ body: [{ id: firstId, user_id: user.id, title: 'Old server copy', description: '<p>Old body</p>', tags: [], created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-01T00:00:00.000Z' }], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
          resolve()
        } })
      } else if (req.method === 'GET' && id?.startsWith('in.(') && holdExistence) {
        return new Cypress.Promise<void>(resolve => { heldExistence = () => {
          req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
          resolve()
        } })
      } else if (req.method === 'PATCH' && id === secondId) {
        req.reply({ statusCode: 406, body: { code: 'PGRST116', message: 'Synthetic missing note' } })
      } else if (req.method === 'GET' && restoredFirst && (id === firstId || (!id && new URL(req.url).pathname.endsWith('/notes')))) {
        req.reply({ body: [{ id: firstId, user_id: user.id, title: 'Restored on server', description: '<p>Restored body</p>', tags: [], created_at: '2026-10-01T00:00:00.000Z', updated_at: '2026-10-03T00:00:00.000Z' }], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
      } else {
        req.reply({ body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
      }
    })
  })

  afterEach(() => {
    if (heldDelete) cy.then(() => { heldDelete?.(); heldDelete = undefined })
    if (heldExistence) cy.then(() => { heldExistence?.(); heldExistence = undefined })
    if (heldPage) cy.then(() => { heldPage?.(); heldPage = undefined })
    cy.window().then(win => { Reflect.deleteProperty(win.navigator, 'onLine'); win.dispatchEvent(new win.Event('online')) })
  })

  it('keeps the warning for the second missing note until that note is deleted', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'Second local copy'))
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    backToList()
    openMissing('Second local copy')
    backToList()
    openMissing('First local copy')
    confirmSingleDelete()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => {
      expect(notes.map(note => note.id)).to.include(secondId).and.not.include(firstId)
    })
    cy.then(() => currentController.hideNotePane())
    openMissing('Second local copy')
    confirmSingleDelete()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
  })

  it('retains the warning and local copy when single deletion is cancelled or rejected', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    cy.get('[data-cy="note-delete-button"]').click()
    cy.get('[role="alertdialog"]').contains('button', 'Cancel').click()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(() => { failedDeletes.add(firstId) })
    confirmSingleDelete()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => expect(notes.map(note => note.id)).to.include(firstId))
    cy.then(() => expect(sentDeletes).to.deep.equal([firstId]))
  })

  it('retains the warning and local copy when bulk deletion is cancelled', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    backToList()
    cy.contains('button', 'Select').click()
    cy.get('[data-testid="selection-mode-select-all"]').click()
    cy.get('[data-testid="selection-mode-delete"]').click()
    cy.get('[data-testid="bulk-delete-cancel"]').click()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).map(note => note.id)).to.include(firstId)
      expect(await webOfflineStorageAdapter.getQueue()).to.have.length(0)
      expect(sentDeletes).to.deep.equal([])
    })
  })

  it('clears only successful IDs when bulk deletion partially fails', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'Second local copy'))
      failedDeletes.add(secondId)
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    backToList()
    openMissing('Second local copy')
    backToList()
    selectAndConfirmBulk(2)
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.contains('Failed to delete 1 notes').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => {
      expect(notes.map(note => note.id)).to.include(secondId).and.not.include(firstId)
    })
    cy.then(() => { failedDeletes.delete(secondId) })
    cy.then(() => currentController.deleteNotesByIds([secondId])).then(result => expect(result.failed).to.equal(0))
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
  })

  it('clears the local-copy warning after durable offline deletion, while showing the waiting operation', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false }); win.dispatchEvent(new win.Event('offline')) })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Offline')
    confirmSingleDelete()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server').and('contain.text', 'waiting')
    cy.then(async () => {
      const queue = await webOfflineStorageAdapter.getQueue()
      const notes = await webOfflineStorageAdapter.loadNotes()
      expect(queue.some(item => item.noteId === firstId && item.operation === 'delete' && item.status === 'pending' && item.payload?.user_id === user.id)).to.equal(true)
      expect(notes.find(note => note.id === firstId)?.deleted).to.equal(true)
      expect(sentDeletes).to.deep.equal([])
    })
  })

  it('clears both warnings after an offline bulk delete while retaining both queued operations', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'Second local copy'))
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    backToList()
    openMissing('Second local copy')
    backToList()
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false }); win.dispatchEvent(new win.Event('offline')) })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Offline')
    selectAndConfirmBulk(2)
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server').and('contain.text', '2 waiting')
    cy.then(async () => {
      const queue = await webOfflineStorageAdapter.getQueue()
      const notes = await webOfflineStorageAdapter.loadNotes()
      expect(queue.filter(item => item.operation === 'delete' && item.status === 'pending' && item.payload?.user_id === user.id).map(item => item.noteId).sort()).to.deep.equal([firstId, secondId].sort())
      expect(notes.filter(note => note.deleted).map(note => note.id).sort()).to.deep.equal([firstId, secondId].sort())
      expect(sentDeletes).to.deep.equal([])
    })
  })

  it('reports a failed queued delete after reconnect without restoring the removed-copy warning', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false }); win.dispatchEvent(new win.Event('offline')) })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Offline')
    confirmSingleDelete()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'waiting')
    cy.then(() => { failedDeletes.add(firstId) })
    cy.window().then(win => { Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true }); win.dispatchEvent(new win.Event('online')) })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'failed').and('not.contain.text', 'unavailable on the server')
    cy.then(async () => {
      const queue = await webOfflineStorageAdapter.getQueue()
      expect(queue.some(item => item.noteId === firstId && item.operation === 'delete' && item.status === 'failed' && item.payload?.user_id === user.id)).to.equal(true)
      expect(sentDeletes).to.include(firstId)
    })
  })

  it('does not suppress another missing note’s failed queued edit', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote({ ...localNote(secondId, 'Failed local edit'), status: 'pending' })
      await webOfflineStorageAdapter.upsertQueueItem({
        id: 'other-failed-update', noteId: secondId, operation: 'update', payload: { user_id: user.id },
        clientUpdatedAt: '2026-10-01T00:00:00.000Z', status: 'failed',
        lastError: 'This note is unavailable on the server. Local changes remain on this device.',
      })
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'failed')
    openMissing('First local copy')
    confirmSingleDelete()
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server').and('contain.text', 'failed')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => expect(queue.find(item => item.id === 'other-failed-update')?.status).to.equal('failed'))
  })

  it('clears the warning when a missing copy is found again on the server', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    cy.then(() => { restoredFirst = true })
    cy.then(() => currentController.refreshSelectedNote(new AbortController().signal))
    cy.contains('Restored on server').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
  })

  it('clears the warning when list refresh finds the missing copy on the server', () => {
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    backToList()
    cy.then(() => { restoredFirst = true })
    cy.then(() => currentController.refreshNotes(new AbortController().signal))
    cy.contains('[data-testid="note-card"]', 'Restored on server').should('be.visible')
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
  })

  it('clears only the restored ID when another local copy is still missing', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy'))
      await webOfflineStorageAdapter.saveNote(localNote(secondId, 'Second local copy'))
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    backToList()
    openMissing('Second local copy')
    backToList()
    cy.then(() => { restoredFirst = true })
    cy.then(() => currentController.refreshNotes(new AbortController().signal))
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    cy.then(() => currentController.deleteNotesByIds([secondId])).then(result => expect(result.failed).to.equal(0))
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
  })

  it('does not restore a warning from an older refresh after deletion', () => {
    let refreshDone = false
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    openMissing('First local copy')
    cy.then(() => {
      holdExistence = true
      void currentController.refreshNotes(new AbortController().signal).then(() => { refreshDone = true })
    })
    cy.wrap(null).should(() => expect(heldExistence).to.be.a('function'))
    confirmSingleDelete()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
    cy.then(() => { heldExistence!(); heldExistence = undefined })
    cy.wrap(null).should(() => expect(refreshDone).to.equal(true))
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
  })

  it('does not clear a newer missing-copy warning using an older server response', () => {
    let refreshDone = false
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"] button', 'First local copy').should('be.visible')
    cy.then(() => {
      holdPage = true
      void currentController.refreshNotes(new AbortController().signal).then(() => { refreshDone = true })
    })
    cy.wrap(null).should(() => expect(heldPage).to.be.a('function'))
    openMissing('First local copy')
    cy.then(() => { heldPage!(); heldPage = undefined })
    cy.wrap(null).should(() => expect(refreshDone).to.equal(true))
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
  })

  it('ignores a list response started before deletion, but displays a later restoration', () => {
    let refreshDone = false
    cy.then(() => webOfflineStorageAdapter.saveNote(localNote(firstId, 'First local copy')))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><ControlledApp /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"] button', 'First local copy').should('be.visible')
    cy.then(() => {
      holdPage = true
      void currentController.refreshNotes(new AbortController().signal).then(() => { refreshDone = true })
    })
    cy.wrap(null).should(() => expect(heldPage).to.be.a('function'))
    openMissing('First local copy')
    confirmSingleDelete()
    cy.then(() => currentController.hideNotePane())
    cy.contains('[data-testid="note-card"]', 'First local copy').should('not.exist')
    cy.then(() => { heldPage!(); heldPage = undefined })
    cy.wrap(null).should(() => expect(refreshDone).to.equal(true))
    cy.contains('[data-testid="note-card"]', 'Old server copy').should('not.exist')
    cy.then(() => { restoredFirst = true })
    cy.then(() => currentController.refreshNotes(new AbortController().signal))
    cy.contains('[data-testid="note-card"]', 'Restored on server').should('be.visible')
  })

  it('does not clear the new account’s warning when the previous account deletion completes late', () => {
    cy.then(async () => {
      await webOfflineStorageAdapter.saveNote(localNote(firstId, 'First account copy'))
      await webOfflineStorageAdapter.saveNote(localNote(otherId, 'Other account copy', secondUser.id))
      holdFirstDelete = true
    })
    cy.mount(<SwitchableApp client={client} />)
    openMissing('First account copy')
    cy.get('[data-cy="note-delete-button"]').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.wrap(null).should(() => expect(heldDelete).to.be.a('function'))
    cy.get('[data-cy="switch-other-account"]').click({ force: true })
    openMissing('Other account copy')
    cy.then(() => { heldDelete!(); heldDelete = undefined })
    cy.wrap(null).should(() => expect(getLocalDeletionRecoveries(user.id)).to.have.length(1))
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => {
      expect(notes.map(note => note.id)).to.include.members([firstId, otherId])
    })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'unavailable on the server')
    confirmSingleDelete()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'unavailable on the server')
    cy.get('[data-cy="switch-first-account"]').click({ force: true })
    cy.get('[data-testid="device-sync-status"]').should('contain.text', 'Server accepted deletion; check local cleanup')
    cy.get('[data-testid="device-sync-status"]').contains('summary', 'What can I do?').click()
    cy.get('[data-testid="retry-local-cleanup"]').click()
    cy.get('[data-testid="device-sync-status"]').should('not.contain.text', 'check local cleanup')
    cy.then(async () => {
      const ids = (await webOfflineStorageAdapter.loadNotes()).map(note => note.id)
      expect(ids).to.not.include(firstId)
      expect(ids).to.not.include(otherId)
      expect(sentDeletes).to.deep.equal([firstId, otherId])
    })
  })
})
