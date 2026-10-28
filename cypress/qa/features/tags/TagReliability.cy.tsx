import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const url = 'http://127.0.0.1:58421'
const password = `Local-fixture-${Date.now()}!`
let admin: SupabaseClient
let client: SupabaseClient
let user: User
let firstId: string
let lastId: string

function App() {
  const controller = useNoteAppController()
  return <><NotesShell controller={controller} /><Toaster /></>
}
function unwrap<T>({ data, error }: { data: T, error: { message: string } | null }): T {
  if (error) throw new Error(error.message)
  return data
}
async function selectedRows() {
  return unwrap(await client.from('notes').select('id, title, description, tags').in('id', [firstId, lastId]).order('title'))
}

describe('Tag coverage and recovery on isolated local Supabase', { retries: 0 }, () => {
  before(() => cy.then(async () => {
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    admin = createClient(url, Cypress.env('AUDIT_SERVICE_KEY'), options)
    client = createClient(url, Cypress.env('AUDIT_ANON_KEY'), options)
    const email = `tag-reliability-${Date.now()}@example.test`
    const result = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (result.error || !result.data.user) throw new Error(result.error?.message ?? 'Fixture user missing')
    user = result.data.user
    const login = await client.auth.signInWithPassword({ email, password })
    if (login.error) throw new Error(login.error.message)
  }))
  after(() => cy.then(async () => {
    if (user) {
      const result = await admin.auth.admin.deleteUser(user.id)
      if (result.error) throw new Error(result.error.message)
    }
  }))
  beforeEach(() => {
    cy.viewport(390, 844)
    cy.then(async () => {
      unwrap(await admin.from('notes').delete().eq('user_id', user.id))
      const rows = Array.from({ length: 51 }, (_, i) => ({
        user_id: user.id, title: `Fixture ${String(i).padStart(2, '0')}`,
        description: `Content preserved ${i}`,
        tags: i === 0 ? ['shared'] : i === 50 ? ['shared', 'oldest'] : [],
        updated_at: new Date(Date.now() - i * 60_000).toISOString(),
      }))
      const inserted = unwrap(await client.from('notes').insert(rows).select('id,title'))
      firstId = inserted!.find(note => note.title === 'Fixture 00')!.id
      lastId = inserted!.find(note => note.title === 'Fixture 50')!.id
    })
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.history.replaceState({}, '', '/?view=notes')
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true })
      win.dispatchEvent(new Event('online'))
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'Fixture 00').should('be.visible')
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.contains('Loaded 50 of 51 notes. Load more notes and check again.', { timeout: 10000 }).should('be.visible')
    cy.get('[data-testid="tag-menu-trigger-shared"]').should('be.disabled')
  })
  function checkAllNotes() {
    cy.contains('button', 'Load more notes').click()
    cy.get('[data-testid="tag-card-oldest"]', { timeout: 10000 }).should('be.visible')
    cy.contains('button', 'Check loaded notes').click()
    cy.get('[data-testid="tag-menu-trigger-shared"]', { timeout: 10000 }).should('not.be.disabled')
  }
  function openRename() {
    cy.get('[data-testid="tag-menu-trigger-shared"]').click()
    cy.get('[data-testid="rename-action-shared"]').click()
    cy.get('[data-testid="rename-tag-input"]').clear().type('renamed')
  }
  it('blocks a partial collection and renames both notes after explicitly loading all pages', () => {
    cy.screenshot('tag-coverage-incomplete')
    checkAllNotes()
    cy.screenshot('tag-coverage-complete')
    cy.then(() => webOfflineStorageAdapter.saveNote({
      id: firstId, user_id: user.id, title: 'Fixture 00', description: 'Content preserved 0',
      tags: ['shared'], updatedAt: '2025-01-01T00:00:00.000Z', status: 'synced',
    }))
    openRename()
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.contains('Tag "shared" renamed to "renamed"', { timeout: 10000 }).should('be.visible')
    cy.then(async () => {
      const rows = await selectedRows()
      expect(rows!.map(row => row.tags)).to.deep.equal([['renamed'], ['renamed', 'oldest']])
      expect(rows!.map(row => row.description)).to.deep.equal(['Content preserved 0', 'Content preserved 50'])
      const cached = (await webOfflineStorageAdapter.loadNotes()).find(note => note.id === firstId)
      expect(cached).to.include({ title: 'Fixture 00', description: 'Content preserved 0', status: 'synced' })
      expect(cached!.tags).to.deep.equal(['renamed'])
    })
    cy.window().then(win => win.history.replaceState({}, '', '/?view=notes'))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.get('[data-testid="tag-card-renamed"]').should('contain.text', '(2)')
    cy.get('[data-testid="tag-card-shared"]').should('not.exist')
  })
  it('deletes the tag from all checked notes', () => {
    checkAllNotes()
    cy.get('[data-testid="tag-menu-trigger-shared"]').click()
    cy.get('[data-testid="delete-action-shared"]').click()
    cy.get('[data-testid="confirm-delete-tag-button"]').click()
    cy.contains('Tag "shared" deleted', { timeout: 10000 }).should('be.visible')
    cy.then(async () => {
      expect((await selectedRows())!.map(row => row.tags)).to.deep.equal([[], ['oldest']])
    })
  })
  it('warns before a merge and keeps one copy of the destination tag per note', () => {
    cy.then(async () => {
      unwrap(await client.from('notes').update({ tags: ['shared', 'existing'] }).eq('id', firstId))
      unwrap(await client.from('notes').update({ tags: ['shared', 'existing', 'oldest'] }).eq('id', lastId))
    })
    cy.contains('button', 'Check loaded notes').click()
    checkAllNotes()
    openRename()
    cy.get('[data-testid="rename-tag-input"]').clear().type('existing')
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.contains('This name already exists. Saving will merge the two tags.').should('be.visible')
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.contains('Tag "shared" renamed to "existing"', { timeout: 10000 }).should('be.visible')
    cy.then(async () => {
      expect((await selectedRows())!.map(row => row.tags)).to.deep.equal([['existing'], ['existing', 'oldest']])
    })
  })
  it('reports a partial write failure without success and rereads persisted data', () => {
    checkAllNotes()
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, (req) => {
      if (req.url.includes(lastId)) req.reply({ statusCode: 400, body: { message: 'Injected failure' } })
      else req.continue()
    }).as('tagPatch')
    openRename()
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.wait(['@tagPatch', '@tagPatch']).then((patches) => {
      expect(patches.map(patch => patch.request.url)).to.satisfy((urls: string[]) => urls.some(url => url.includes(lastId)))
      expect(patches.map(patch => patch.response?.statusCode)).to.include(400)
    })
    cy.contains("The result couldn't be confirmed. Refresh notes before trying again.", { timeout: 10000 }).should('be.visible')
    cy.contains('Tag "shared" renamed to "renamed"').should('not.exist')
    cy.get('[data-testid="rename-tag-input"]').should('be.visible')
    cy.then(async () => {
      const rows = await selectedRows()
      expect(rows!.filter(row => row.tags!.includes('renamed'))).to.have.length(1)
      expect(rows!.filter(row => row.tags!.includes('shared'))).to.have.length(1)
    })
    cy.screenshot('tag-coverage-partial-failure')
  })
  it('reports an unknown outcome when the server commits but its response is lost', () => {
    checkAllNotes()
    let blockReread = false
    cy.intercept({ method: 'GET', pathname: '/rest/v1/notes' }, (req) => {
      if (blockReread) req.reply({ statusCode: 503, body: { message: 'Reread unavailable' } })
      else req.continue()
    }).as('notesReread')
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, (req) => {
      if (req.url.includes(lastId)) req.continue((res) => {
        blockReread = true
        res.send({ forceNetworkError: true })
      })
      else req.continue()
    }).as('lostPatchResponse')
    openRename()
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.wait('@lostPatchResponse')
    cy.contains("The result couldn't be confirmed. Refresh notes before trying again.", { timeout: 15000 }).should('be.visible')
    cy.contains('Tag "shared" renamed to "renamed"').should('not.exist')
    cy.then(() => { blockReread = false })
    cy.then(async () => {
      expect((await selectedRows())!.map(row => row.tags)).to.deep.equal([['renamed'], ['renamed', 'oldest']])
    })
    let readsBeforeRetry = 0
    let writesBeforeRetry = 0
    cy.get('@notesReread.all').then((requests) => { readsBeforeRetry = requests.length })
    cy.get('@lostPatchResponse.all').then((requests) => { writesBeforeRetry = requests.length })
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.get('@notesReread.all').should((requests) => expect(requests.length).to.be.greaterThan(readsBeforeRetry))
    cy.get('[data-testid="confirm-rename-tag-button"]', { timeout: 15000 }).should('not.be.disabled')
    cy.get('[role="alert"]').should('contain.text', "couldn't be confirmed")
    cy.get('@lostPatchResponse.all').should((requests) => expect(requests.length).to.equal(writesBeforeRetry))
    cy.contains('Tag "shared" renamed to "renamed"').should('not.exist')
    cy.screenshot('tag-coverage-lost-response')
  })
  it('can verify a collection of 1001 notes without a truncated existence response', () => {
    cy.then(async () => {
      const rows = Array.from({ length: 950 }, (_, i) => ({
        user_id: user.id, title: `Extra ${i}`, tags: [],
        updated_at: new Date(Date.now() - (i + 51) * 60_000).toISOString(),
      }))
      unwrap(await client.from('notes').insert(rows))
    })
    cy.contains('button', 'Check loaded notes').click()
    cy.contains('Loaded 50 of 1001 notes. Load more notes and check again.').should('be.visible')
    for (let i = 0; i < 20; i += 1) {
      cy.contains('button', 'Load more notes', { timeout: 10000 }).should('be.enabled').click()
    }
    cy.contains('button', 'Load more notes', { timeout: 10000 }).should('not.exist')
    cy.contains('button', 'Check loaded notes').click()
    cy.get('[data-testid="tag-menu-trigger-shared"]', { timeout: 20000 }).should('not.be.disabled')
    openRename()
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.contains('Tag "shared" renamed to "renamed"', { timeout: 20000 }).should('be.visible')
    cy.then(async () => {
      expect((await selectedRows())!.map(row => row.tags)).to.deep.equal([['renamed'], ['renamed', 'oldest']])
    })
    cy.screenshot('tag-coverage-1001-notes')
  })
  it('does not overwrite a newer IndexedDB draft or a note with queued changes', () => {
    cy.then(async () => {
      const expected = {
        id: firstId, user_id: user.id, title: 'Fixture 00', description: 'before', tags: ['shared'],
        updatedAt: '2025-01-01T00:00:00Z', status: 'synced' as const,
      }
      const draft = { ...expected, description: 'new local draft', status: 'pending' as const, updatedAt: '2026-01-01T00:00:00Z' }
      await webOfflineStorageAdapter.saveNote(draft)
      expect(await webOfflineStorageAdapter.patchSyncedTags!([{ expected, tags: ['renamed'] }])).to.deep.equal([])
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === firstId)).to.deep.equal(draft)
      await webOfflineStorageAdapter.saveNote(expected)
      await webOfflineStorageAdapter.upsertQueueItem({
        id: 'fixture-pending', noteId: firstId, operation: 'update', status: 'pending',
        payload: { description: 'queued draft' }, clientUpdatedAt: '2026-01-01T00:00:00Z',
      })
      expect(await webOfflineStorageAdapter.patchSyncedTags!([{ expected, tags: ['renamed'] }])).to.deep.equal([])
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === firstId)).to.deep.equal(expected)
    })
  })
  it('blocks offline global writes and preserves the local mutation queue', () => {
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.contains('Connect to the internet to manage tags across notes.').should('be.visible')
    cy.get('[data-testid="tag-menu-trigger-shared"]').should('be.disabled')
    cy.then(async () => {
      expect(await webOfflineStorageAdapter.getQueue()).to.have.length(0)
      expect((await selectedRows())!.map(row => row.tags)).to.deep.equal([['shared'], ['shared', 'oldest']])
    })
    cy.get('[data-testid="mobile-nav-notes"]').click()
    cy.contains('[data-testid="note-card"]', 'Fixture 00').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[data-cy="editor-content"]').click().type(' offline edit')
    cy.get('[data-cy="note-save-button"]').click()
    cy.wait(1000) // Allow the editor's debounced local save to reach IndexedDB.
    cy.then(async () => {
      const queue = await webOfflineStorageAdapter.getQueue()
      expect(queue.some(item => item.noteId === firstId && item.payload.description?.includes('offline edit'))).to.equal(true)
    })
  })

})
