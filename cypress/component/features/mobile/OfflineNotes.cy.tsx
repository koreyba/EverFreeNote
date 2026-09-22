import React from 'react'
import { Capacitor } from '@capacitor/core'
import type { CachedNote } from '@core/types/offline'
import { createClient, type User } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { dispatchAppBack } from '@ui/web/lib/appBack'

const user = { id: 'offline-test-user', email: 'offline@example.invalid' } as User

function AppUnderTest() {
  const controller = useNoteAppController()
  if (!controller.user) return <div>Restoring session</div>
  return <><NotesShell controller={controller} /><Toaster /><output data-cy="queue-state">{controller.pendingCount + controller.failedCount}</output></>
}

describe('Durable offline notes in the shared Android UI', { retries: 0 }, () => {
  it('creates with a stale online flag, reopens from IndexedDB, and syncs the same ID after reconnect', () => {
    cy.viewport(390, 844)
    let online = false
    const remoteNotes = new Map<string, Record<string, unknown>>()
    let localId: string
    const client = createClient('https://offline-test.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.stub(client.auth, 'getSession').resolves({ data: { session: { user } }, error: null })
    cy.stub(client.auth, 'onAuthStateChange').returns({ data: { subscription: { unsubscribe: cy.stub() } } })
    cy.intercept('https://offline-test.invalid/**', (req) => {
      if (!online) { req.destroy(); return }
      if (req.url.includes('/rest/v1/notes')) {
        if (req.method === 'POST') {
          const row = req.body[0]
          remoteNotes.set(row.id, { ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
          req.reply({ statusCode: 201, body: remoteNotes.get(row.id) })
        } else if (req.method === 'PATCH') {
          const id = new URL(req.url).searchParams.get('id')?.replace('eq.', '') ?? ''
          remoteNotes.set(id, { ...remoteNotes.get(id), ...req.body, id })
          req.reply({ body: remoteNotes.get(id) })
        } else if (req.method === 'DELETE') {
          const id = new URL(req.url).searchParams.get('id')?.replace('eq.', '') ?? ''
          remoteNotes.delete(id)
          req.reply({ statusCode: 204, body: '', delay: 500 })
        } else req.reply({ body: [...remoteNotes.values()], headers: { 'content-range': `0-0/${remoteNotes.size}` } })
      } else req.reply({ body: [] })
    })
    const mountApp = () => cy.mount(<SupabaseTestProvider supabase={client} user={user}><AppUnderTest /></SupabaseTestProvider>)
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.clearLocalStorage()
    mountApp()
    cy.contains('button', 'New Note').click()
    cy.get('[placeholder="Note title"]').type('Saved without internet')
    cy.get('.tiptap').type('My offline text')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should((notes) => {
      expect(notes).to.have.length(1)
      expect(notes[0].title).to.equal('Saved without internet')
      expect(notes[0].description).to.contain('My offline text')
      localId = notes[0].id
    })
    cy.get('[data-sonner-toast][data-type="error"]').should('not.exist')
    cy.then(() => dispatchAppBack())
    cy.contains('Saved without internet').should('be.visible')
    // Remount the complete app with a fresh query cache; only browser storage survives.
    mountApp()
    cy.contains('Saved without internet').should('be.visible').click()
    cy.contains('My offline text').should('be.visible')
    cy.then(() => {
      online = true
      window.dispatchEvent(new Event('online'))
    })
    // A reconnect can overlap the failed request; the foreground retry runs every 15 seconds.
    cy.wrap(remoteNotes, { timeout: 20000 }).should((notes) => {
      expect(notes.size).to.equal(1)
      expect(notes.get(localId)?.title).to.equal('Saved without internet')
      expect(notes.get(localId)?.description).to.contain('My offline text')
    })
    cy.get('[data-cy="queue-state"]').should('have.text', '0')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should('have.length', 0)
    cy.get('[data-sonner-toast][data-type="error"]').should('not.exist')
    cy.get('[data-cy="note-read-button"]').click()
    cy.get('[data-cy="queue-state"]').should('have.text', '0')
    cy.get('[data-cy="note-delete-button"]').click()
    cy.get('[role="alertdialog"]').contains('button', 'Delete').click()
    cy.get('[role="alertdialog"]').should('not.exist')
    // The dialog closes on click; the reading pane clears only after durable deletion.
    cy.contains('No Note Selected').should('be.visible')
    cy.get('[data-testid="note-card"]').should('not.exist')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should('have.length', 0)
    mountApp()
    cy.contains('Saved without internet').should('not.exist')
  })
})


describe('Refresh reconciles persisted cache before reopening notes', { retries: 0 }, () => {
  const cached = (id: string, extra: Partial<CachedNote> = {}): CachedNote => ({
    id, user_id: user.id, title: id, description: '<p>Available offline</p>', tags: [],
    created_at: '2026-09-22T10:00:00Z', updated_at: '2026-09-22T10:00:00Z',
    updatedAt: '2026-09-22T10:00:00Z', status: 'synced', ...extra,
  })

  it('renders IndexedDB notes during a stalled initial fetch, then removes remote deletions on a list swipe', () => {
    cy.viewport(390, 844)
    cy.stub(Capacitor, 'isNativePlatform').returns(true)
    cy.stub(Capacitor, 'getPlatform').returns('android')
    let listRequests = 0
    let existenceRequests = 0
    const client = createClient('https://cache-refresh.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://cache-refresh.invalid/rest/v1/**', req => {
      const url = new URL(req.url)
      if (url.searchParams.get('select') === 'id') {
        existenceRequests++
        expect(url.searchParams.get('user_id')).to.equal(`eq.${user.id}`)
        req.reply({ body: [{ id: 'Older cached note' }], headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' } })
      } else if (url.searchParams.has('offset')) {
        listRequests++
        if (listRequests === 1) req.alias = 'initialCacheList'
        req.reply({ delay: listRequests === 1 ? 5000 : 0, body: [], headers: { 'content-range': '0-0/0', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    cy.clearLocalStorage()
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.then(() => webOfflineStorageAdapter.saveNotes([
      cached('Deleted one'), cached('Deleted two'), cached('Older cached note'), cached('My offline draft', { status: 'pending' }),
    ]))
    const mountApp = () => cy.mount(<SupabaseTestProvider supabase={client} user={user}><AppUnderTest /></SupabaseTestProvider>)
    mountApp()
    // The first HTTP response is deliberately still pending when local cards must appear.
    cy.contains('[data-testid="note-card"]', 'Deleted one', { timeout: 2000 }).should('be.visible')
    cy.contains('[data-testid="note-card"]', 'Deleted two').should('be.visible')
    cy.wrap(null).should(() => expect(listRequests).to.equal(1))
    cy.wait('@initialCacheList')
    cy.get('[data-cy="pull-to-refresh"]').filter(':visible')
      .trigger('touchstart', { touches: [{ clientX: 80, clientY: 200 }] })
      .trigger('touchmove', { touches: [{ clientX: 80, clientY: 350 }] })
      .trigger('touchend', { touches: [] })
    cy.wrap(null).should(() => expect(listRequests).to.equal(2))
    cy.wrap(null).should(() => expect(existenceRequests).to.equal(1))
    cy.contains('[data-testid="note-card"]', 'Deleted one').should('not.exist')
    cy.contains('[data-testid="note-card"]', 'Deleted two').should('not.exist')
    cy.contains('[data-testid="note-card"]', 'Older cached note').should('be.visible')
    cy.contains('[data-testid="note-card"]', 'My offline draft').should('be.visible')
    cy.then(() => expect(existenceRequests).to.equal(1))
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => {
      expect(notes.map(note => note.id).sort()).to.deep.equal(['My offline draft', 'Older cached note'])
    })
    mountApp()
    cy.contains('[data-testid="note-card"]', 'Older cached note').should('be.visible')
    cy.contains('[data-testid="note-card"]', 'Deleted one').should('not.exist')
    cy.contains('[data-testid="note-card"]', 'Deleted two').should('not.exist')
  })

  it('checks the persisted revision and queued edits atomically before removing confirmed deletions', () => {
    const snapshots = [cached('gone'), cached('edited'), cached('queued'), cached('newer'), cached('other-owner')]
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.then(() => webOfflineStorageAdapter.saveNotes(snapshots))
    cy.then(() => webOfflineStorageAdapter.saveNote(cached('edited', { status: 'pending', title: 'Do not lose this edit' })))
    cy.then(() => webOfflineStorageAdapter.saveNote(cached('newer', { updatedAt: '2026-09-22T11:00:00Z' })))
    cy.then(() => webOfflineStorageAdapter.saveNote(cached('other-owner', { user_id: 'another-user' })))
    cy.then(() => webOfflineStorageAdapter.upsertQueueItem({ id: 'queued-op', noteId: 'queued', operation: 'update', payload: { user_id: user.id }, clientUpdatedAt: snapshots[0].updatedAt, status: 'pending' }))
    cy.then(() => webOfflineStorageAdapter.removeSyncedNotes?.(snapshots)).should('deep.equal', ['gone'])
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => {
      expect(notes.map(note => note.id).sort()).to.deep.equal(['edited', 'newer', 'other-owner', 'queued'])
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should('have.length', 1)
    cy.then(() => webOfflineStorageAdapter.clearAll())
  })
})


describe('Remote deletion after a real local save', { retries: 0 }, () => {
  function verifyDeletionAfterCreate(initiallyOnline: boolean) {
    cy.viewport(390, 844)
    cy.stub(Capacitor, 'isNativePlatform').returns(true)
    cy.stub(Capacitor, 'getPlatform').returns('android')
    let online = initiallyOnline
    const remote = new Map<string, Record<string, unknown>>()
    let localId: string
    const client = createClient('https://created-refresh.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://created-refresh.invalid/rest/v1/**', req => {
      if (!online) { req.destroy(); return }
      const url = new URL(req.url)
      if (!url.pathname.endsWith('/notes')) { req.reply({ body: [] }); return }
      if (req.method === 'POST') {
        const row = req.body[0]
        remote.set(row.id, { ...row, created_at: new Date().toISOString(), updated_at: new Date().toISOString() })
        req.reply({ statusCode: 201, body: remote.get(row.id) })
      } else if (req.method === 'PATCH') {
        const id = url.searchParams.get('id')?.replace('eq.', '') ?? ''
        remote.set(id, { ...remote.get(id), ...req.body, id })
        req.reply({ body: remote.get(id) })
      } else {
        const rows = [...remote.values()]
        req.reply({ body: url.searchParams.get('select') === 'id' ? rows.map(row => ({ id: row.id })) : rows,
          headers: { 'content-range': `0-0/${rows.length}`, 'access-control-expose-headers': 'content-range' } })
      }
    })
    cy.clearLocalStorage()
    cy.window().then(win => win.sessionStorage.clear())
    cy.then(() => webOfflineStorageAdapter.clearAll())
    const mountApp = () => cy.mount(<SupabaseTestProvider supabase={client} user={user}><AppUnderTest /></SupabaseTestProvider>)
    mountApp()
    cy.contains('button', 'New Note').click()
    cy.get('[placeholder="Note title"]').type('Created here, deleted elsewhere')
    cy.get('.tiptap').type('Saved content')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => dispatchAppBack())
    cy.contains('[data-testid="note-card"]', 'Created here, deleted elsewhere').should('be.visible')
    cy.then(() => {
      online = true
      window.dispatchEvent(new Event('online'))
    })
    cy.wrap(remote, { timeout: 20000 }).should(rows => {
      expect(rows.size).to.equal(1)
      localId = [...rows.keys()][0]
    })
    cy.get('[data-cy="queue-state"]').should('have.text', '0')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(notes => {
      expect(notes).to.have.length(1)
      expect(notes[0].status).to.equal('synced')
    })
    cy.then(() => remote.delete(localId))
    cy.get('[data-cy="pull-to-refresh"]').filter(':visible')
      .trigger('touchstart', { touches: [{ clientX: 80, clientY: 200 }] })
      .trigger('touchmove', { touches: [{ clientX: 80, clientY: 350 }] })
      .trigger('touchend', { touches: [] })
    cy.contains('[data-testid="note-card"]', 'Created here, deleted elsewhere').should('not.exist')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should('have.length', 0)
    mountApp()
    cy.contains('[data-testid="note-card"]', 'Created here, deleted elsewhere').should('not.exist')
  }

  it('removes an online-created saved note when its editor tab remains open', () => {
    verifyDeletionAfterCreate(true)
  })

  it('removes an offline-created note after synchronization when its editor tab remains open', () => {
    verifyDeletionAfterCreate(false)
  })
})
