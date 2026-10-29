import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { SPLIT_VIEW_ENABLED_KEY, SplitViewPreferenceProvider } from '@ui/web/providers/SplitViewPreferenceProvider'

const user = { id: 'delete-user', email: 'delete@example.invalid' } as User
const notes = [
  { id: 'first', title: 'First note', description: '<p>First body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
  { id: 'second', title: 'Second note', description: '<p>Second body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T09:00:00Z', updated_at: '2026-10-28T09:00:00Z' },
]

function TestApp() {
  return <SplitViewPreferenceProvider><NotesShell controller={useNoteAppController()} /></SplitViewPreferenceProvider>
}

function openActiveSplitEditor() {
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
  cy.get('[data-cy="workspace-split-button"]').click()
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
  cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
}

describe('Deleting while an editor save is pending', { retries: 0 }, () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
    const client = createClient('https://delete-notes.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://delete-notes.invalid/**', req => {
      if (req.url.includes('/rest/v1/notes')) {
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        const noteId = new URL(req.url).searchParams.get('id')
        const note = notes.find(item => noteId === `eq.${item.id}`) ?? notes[0]
        req.reply({ body: single ? note : notes, headers: { 'content-range': '0-1/2', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'true')
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><TestApp /></SupabaseTestProvider>)
  })

  afterEach(() => {
    cy.window().then(win => {
      Reflect.deleteProperty(win.navigator, 'onLine')
      win.dispatchEvent(new Event('online'))
    })
  })

  it('waits for the active split editor save before deleting its note', () => {
    openActiveSplitEditor()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.operation !== 'update' || item.payload?.title !== 'Pending edit' || release) return original(item)
      return new Cypress.Promise<void>(resolve => { release = () => original(item).then(() => resolve()) })
    }).as('queueWrites')

    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Pending edit')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] [data-cy="note-more-button"]').click()
    cy.contains('[role="menuitem"]', 'Delete note').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()

    cy.get('[role="alertdialog"]').contains('button', 'Deleting').should('be.disabled')
    cy.get('@queueWrites').should(spy => {
      const calls = (spy as unknown as { getCalls: () => Array<{ args: Array<{ operation: string }> }> }).getCalls()
      expect(calls.some(call => call.args[0].operation === 'delete')).to.equal(false)
    })
    cy.then(() => release!())
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.get('@queueWrites').should(spy => {
      const calls = (spy as unknown as { getCalls: () => Array<{ args: Array<{ noteId: string; operation: string }> }> }).getCalls()
      const operations = calls.map(call => call.args[0]).filter(item => item.noteId === 'second').map(item => item.operation)
      expect(operations[0]).to.equal('update')
      expect(operations.at(-1)).to.equal('delete')
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const operations = queue.filter(item => item.noteId === 'second').map(item => item.operation)
      expect(operations).to.include('update')
      expect(operations).to.include('delete')
    })
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.deleted).to.equal(true)
    })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'First body')
  })

  it('waits for a manual save even when the draft is unchanged', () => {
    openActiveSplitEditor()
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.operation !== 'update' || item.payload?.title !== 'Second note') return original(item)
      return new Cypress.Promise<void>(resolve => { release = () => original(item).then(() => resolve()) })
    }).as('queueWrites')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-save-button"]').click()
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] [data-cy="note-more-button"]').click()
    cy.contains('[role="menuitem"]', 'Delete note').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()

    cy.get('[role="alertdialog"]').contains('button', 'Deleting').should('be.disabled')
    cy.get('@queueWrites').should(spy => {
      const calls = (spy as unknown as { getCalls: () => Array<{ args: Array<{ operation: string }> }> }).getCalls()
      expect(calls.some(call => call.args[0].operation === 'delete')).to.equal(false)
    })
    cy.then(() => release!())
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.deleted).to.equal(true)
    })
  })

  it('cancels single deletion and keeps the draft when the pending manual save fails', () => {
    openActiveSplitEditor()
    let rejectSave: (() => void) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    const write = cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.operation !== 'update') return original(item)
      return new Cypress.Promise<void>((_resolve, reject) => {
        rejectSave = () => reject(new Error('Storage unavailable'))
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-save-button"]').click()
    cy.wrap(null).should(() => expect(rejectSave).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] [data-cy="note-more-button"]').click()
    cy.contains('[role="menuitem"]', 'Delete note').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.get('[role="alertdialog"]').contains('button', 'Deleting').should('be.disabled')
    cy.then(() => rejectSave!())
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Second note')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.operation === 'delete')).to.equal(false)
    })
    cy.then(() => write.restore())
    cy.get('[data-testid="split-pane-right"] [data-cy="note-save-button"]').click()
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.operation === 'update' && item.noteId === 'second')).to.equal(true)
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-more-button"]').click()
    cy.contains('[role="menuitem"]', 'Delete note').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.get('[role="alertdialog"]').should('not.exist')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.operation === 'delete' && item.noteId === 'second')).to.equal(true)
    })
  })

  it('waits for an active save before queuing a bulk selection', () => {
    openActiveSplitEditor()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.operation !== 'update' || release) return original(item)
      return new Cypress.Promise<void>(resolve => { release = () => original(item).then(() => resolve()) })
    })
    cy.spy(webOfflineStorageAdapter, 'appendQueueItems').as('bulkQueue')
    cy.get('[aria-label="Note title"]').clear().type('Bulk pending edit')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="sidebar-container"] [aria-label^="Select note"]').first().click({ force: true })
    cy.get('[data-testid="selection-mode-select-all"]').click()
    cy.get('[data-testid="selection-mode-delete"]').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('2')
    cy.get('[data-testid="bulk-delete-confirm"]').click()
    cy.get('[data-testid="bulk-delete-confirm"]').should('be.disabled').and('contain', 'Deleting')
    cy.get('@bulkQueue').should('not.have.been.called')
    cy.then(() => release!())
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.get('@bulkQueue').should('have.been.calledOnce')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const update = queue.find(item => item.noteId === 'second' && item.operation === 'update')
      const deletions = queue.filter(item => item.operation === 'delete')
      expect(update?.payload?.title).to.equal('Bulk pending edit')
      expect(deletions.map(item => item.noteId).sort()).to.deep.equal(['first', 'second'])
      expect(deletions.every(item => item.payload?.user_id === user.id)).to.equal(true)
      expect(deletions.every(item => item.clientUpdatedAt > update!.clientUpdatedAt)).to.equal(true)
    })
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'first')?.deleted).to.equal(true)
      expect(cached.find(note => note.id === 'second')?.deleted).to.equal(true)
    })
  })

  it('does not delete an active note or the rest of a selection when saving fails', () => {
    openActiveSplitEditor()
    const write = cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').as('failedWrite')
    write.rejects(new Error('Storage unavailable'))
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Unsaved edit')
    cy.get('[data-testid="sidebar-container"] [aria-label^="Select note"][aria-label*="First note"]').click({ force: true })
    cy.get('[data-testid="sidebar-container"] [aria-label^="Select note"][aria-label*="Second note"]').click({ force: true })
    cy.get('[data-testid="selection-mode-delete"]').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('2')
    cy.get('[data-testid="bulk-delete-confirm"]').click()

    cy.get('@failedWrite').should('have.been.called')
    cy.get('[data-testid="bulk-delete-error"]').should('contain', 'save')
    cy.get('[data-testid="bulk-delete-dialog"]').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.filter(item => item.operation === 'delete')).to.have.length(0)
    })
    cy.get('[data-testid="bulk-delete-cancel"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Unsaved edit')
    cy.then(() => write.restore())
  })

  it('can delete a different note without waiting for the active editor', () => {
    openActiveSplitEditor()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.operation !== 'update' || release) return original(item)
      return new Cypress.Promise<void>(resolve => { release = () => original(item).then(() => resolve()) })
    })
    cy.get('[aria-label="Note title"]').clear().type('Still editing second')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="sidebar-container"] [aria-label^="Select note"][aria-label*="First note"]').click({ force: true })
    cy.get('[data-testid="selection-mode-delete"]').click()
    cy.get('[data-testid="bulk-delete-confirm-input"]').type('1')
    cy.get('[data-testid="bulk-delete-confirm"]').click()
    cy.get('[data-testid="bulk-delete-dialog"]').should('not.exist')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'first')?.deleted).to.equal(true)
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Still editing second')
    cy.then(() => release!())
  })
})
