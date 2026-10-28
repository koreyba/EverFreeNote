import React from 'react'
import { createClient, type SupabaseClient, type User } from '@supabase/supabase-js'
import { Toaster } from 'sonner'
import '../../../../app/globals.css'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const url = Cypress.env('AUDIT_SUPABASE_URL') ?? 'http://127.0.0.1:58421'
if (!['127.0.0.1', 'localhost', '[::1]'].includes(new URL(url).hostname)) {
  throw new Error('Tag QA requires a disposable local Supabase stack.')
}
const password = `Local-tag-recovery-${Date.now()}!`
let admin: SupabaseClient
let client: SupabaseClient
let user: User
let remoteId: string

function App() {
  const controller = useNoteAppController()
  return <><NotesShell controller={controller} /><Toaster /></>
}

describe('Tag recovery with remote deletion and browser navigation', { retries: 0 }, () => {
  before(() => cy.then(async () => {
    const options = { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false } }
    admin = createClient(url, Cypress.env('AUDIT_SERVICE_KEY'), options)
    client = createClient(url, Cypress.env('AUDIT_ANON_KEY'), options)
    const email = `tag-recovery-${Date.now()}@example.test`
    const created = await admin.auth.admin.createUser({ email, password, email_confirm: true })
    if (created.error || !created.data.user) throw new Error(created.error?.message ?? 'Fixture user missing')
    user = created.data.user
    const login = await client.auth.signInWithPassword({ email, password })
    if (login.error) throw login.error
  }))
  after(() => cy.then(async () => {
    if (user) {
      const deleted = await admin.auth.admin.deleteUser(user.id)
      if (deleted.error) throw deleted.error
    }
  }))
  beforeEach(() => {
    cy.viewport(390, 844)
    cy.then(async () => {
      const deleted = await admin.from('notes').delete().eq('user_id', user.id)
      if (deleted.error) throw deleted.error
      const inserted = await client.from('notes').insert({
        user_id: user.id, title: 'Current note', description: 'Keep this content', tags: ['shared'],
      }).select('id').single()
      if (inserted.error) throw inserted.error
      remoteId = inserted.data.id
    })
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.history.replaceState({}, '', '/?view=notes')
      win.history.pushState({}, '', '/?view=tags')
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, value: true })
      win.dispatchEvent(new Event('online'))
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
  })
  function mountTagPage() {
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="tag-menu-trigger-shared"]', { timeout: 15000 }).should('not.be.disabled')
  }
  function renameShared() {
    cy.get('[data-testid="tag-menu-trigger-shared"]').click()
    cy.get('[data-testid="rename-action-shared"]').click()
    cy.get('[data-testid="rename-tag-input"]').clear().type('renamed')
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
  }
  function seedDeletedSnapshot(tag = 'old') {
    return cy.then(async () => {
      const inserted = await client.from('notes').insert({
        user_id: user.id, title: 'Deleted on another device', description: 'Previously cached', tags: [tag],
      }).select('id').single()
      if (inserted.error) throw inserted.error
      const id = inserted.data.id
      await webOfflineStorageAdapter.saveNote({
        id, user_id: user.id, title: 'Deleted on another device', description: 'Previously cached',
        tags: [tag], updatedAt: '2026-10-01T00:00:00.000Z', status: 'synced',
      })
      const deleted = await client.from('notes').delete().eq('id', id)
      if (deleted.error) throw deleted.error
      return id
    })
  }
  it('confirms the rename and removes only a synced snapshot of a remotely deleted note', () => {
    let deletedId = ''
    seedDeletedSnapshot().then(id => { deletedId = id })
    mountTagPage()
    renameShared()
    cy.contains('Tag "shared" renamed to "renamed"', { timeout: 15000 }).should('be.visible')
    cy.then(async () => {
      const actual = await client.from('notes').select('tags,description').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data).to.deep.equal({ tags: ['renamed'], description: 'Keep this content' })
      expect((await webOfflineStorageAdapter.loadNotes()).some(note => note.id === deletedId)).to.equal(false)
    })
    cy.get('[data-testid="tag-card-renamed"]').should('be.visible')
    cy.get('[data-testid="tag-card-old"]').should('not.exist')
    cy.screenshot('removed-stale-synced-snapshot')
    cy.window().then(win => win.history.replaceState({}, '', '/?view=notes'))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.get('[data-testid="tag-card-renamed"]').should('be.visible')
    cy.get('[data-testid="tag-card-old"]').should('not.exist')
  })
  it('retains the cached snapshot on a failed reread and reconciles it after reconnecting', () => {
    let deletedId = ''
    let blockReread = true
    seedDeletedSnapshot().then(id => { deletedId = id })
    mountTagPage()
    cy.intercept({ method: 'GET', pathname: '/rest/v1/notes' }, req => {
      if (blockReread && req.url.includes(deletedId)) req.reply({ statusCode: 503, body: { message: 'Unavailable' } })
      else req.continue()
    })
    renameShared()
    cy.contains("The result couldn't be confirmed. Refresh notes before trying again.", { timeout: 15000 }).should('be.visible')
    cy.contains('Tag "shared" renamed to "renamed"').should('not.exist')
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).some(note => note.id === deletedId)).to.equal(true)
      const actual = await client.from('notes').select('tags,description').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data).to.deep.equal({ tags: ['renamed'], description: 'Keep this content' })
    })
    cy.then(() => { blockReread = false })
    cy.contains('button', 'Cancel').click()
    cy.contains('button', 'Check loaded notes').click()
    cy.get('[data-testid="tag-menu-trigger-renamed"]', { timeout: 15000 }).should('not.be.disabled')
    cy.then(async () => expect((await webOfflineStorageAdapter.loadNotes()).some(note => note.id === deletedId)).to.equal(false))
  })
  it('keeps a queued draft created while the remotely absent snapshot is being checked', () => {
    let deletedId = ''
    let removedId = ''
    let injectedDraft = false
    seedDeletedSnapshot().then(id => { deletedId = id })
    seedDeletedSnapshot('orphan-only').then(id => { removedId = id })
    mountTagPage()
    cy.intercept({ method: 'GET', pathname: '/rest/v1/notes' }, req => {
      if (!injectedDraft && req.url.includes(deletedId)) {
        injectedDraft = true
        req.continue(async () => {
          await webOfflineStorageAdapter.saveNote({
            id: deletedId, user_id: user.id, title: 'Local draft', description: 'Do not lose me',
            tags: ['old'], updatedAt: '2026-10-01T00:00:00.000Z', status: 'pending',
          })
          await webOfflineStorageAdapter.upsertQueueItem({
            id: 'queued-draft', noteId: deletedId, operation: 'update', status: 'pending',
            payload: { description: 'Do not lose me' }, clientUpdatedAt: '2026-10-01T00:00:00.000Z',
          })
        })
      } else req.continue()
    })
    renameShared()
    cy.contains("The result couldn't be confirmed. Refresh notes before trying again.", { timeout: 15000 }).should('be.visible')
    cy.contains('Tag "shared" renamed to "renamed"').should('not.exist')
    cy.then(async () => {
      const note = (await webOfflineStorageAdapter.loadNotes()).find(item => item.id === deletedId)
      expect(note).to.include({ description: 'Do not lose me', status: 'pending' })
      expect((await webOfflineStorageAdapter.getQueue()).some(item => item.id === 'queued-draft')).to.equal(true)
      expect((await webOfflineStorageAdapter.loadNotes()).some(item => item.id === removedId)).to.equal(false)
    })
    cy.contains('button', 'Cancel').click()
    cy.get('[data-testid="tag-card-orphan-only"]').should('not.exist')
  })
  it('does not delete a changed synced IndexedDB snapshot or an entry with a queued write', () => {
    cy.then(async () => {
      const expected = {
        id: remoteId, user_id: user.id, title: 'Current note', description: 'Before', tags: ['shared'],
        updatedAt: '2026-10-01T00:00:00.000Z', status: 'synced' as const,
      }
      const changed = { ...expected, description: 'Same revision, changed content' }
      await webOfflineStorageAdapter.saveNote(changed)
      expect(await webOfflineStorageAdapter.removeSyncedNotes!([expected])).to.deep.equal([])
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === remoteId)).to.deep.equal(changed)
      await webOfflineStorageAdapter.saveNote(expected)
      await webOfflineStorageAdapter.upsertQueueItem({
        id: 'queued-change', noteId: remoteId, operation: 'update', status: 'pending',
        payload: { description: 'Queued content' }, clientUpdatedAt: '2026-10-01T00:00:00.000Z',
      })
      expect(await webOfflineStorageAdapter.removeSyncedNotes!([expected])).to.deep.equal([])
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === remoteId)).to.deep.equal(expected)
    })
  })
  it('applies browser Back after a delayed successful tag update', () => {
    mountTagPage()
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, req => {
      req.continue(response => { response.setDelay(2000) })
    }).as('delayedPatch')
    renameShared()
    cy.get('[data-testid="confirm-rename-tag-button"]').should('contain.text', 'Saving')
    cy.window().then(win => win.history.back())
    cy.location('search', { timeout: 10000 }).should('eq', '?view=notes')
    cy.get('[data-testid="tags-page"]').should('exist')
    cy.get('[data-testid="confirm-rename-tag-button"]').should('contain.text', 'Saving')
    cy.wait('@delayedPatch', { timeout: 15000 })
    cy.get('[data-testid="mobile-nav-notes"]', { timeout: 15000 }).should('have.attr', 'aria-current', 'page')
    cy.get('[data-testid="tags-page"]').should('not.exist')
    cy.contains('[data-testid="note-card"]', 'Current note').should('be.visible')
    cy.screenshot('deferred-browser-back')
  })
  it('also applies browser Back after a failed tag update without claiming success', () => {
    mountTagPage()
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, req => {
      req.reply({ statusCode: 503, body: { message: 'Injected failure' }, delay: 2000 })
    }).as('failedPatch')
    renameShared()
    cy.get('[data-testid="confirm-rename-tag-button"]').should('contain.text', 'Saving')
    cy.window().then(win => win.history.back())
    cy.wait('@failedPatch', { timeout: 15000 })
    cy.get('[data-testid="mobile-nav-notes"]', { timeout: 15000 }).should('have.attr', 'aria-current', 'page')
    cy.contains('Tag "shared" renamed to "renamed"').should('not.exist')
    cy.then(async () => {
      const actual = await client.from('notes').select('tags,description').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data).to.deep.equal({ tags: ['shared'], description: 'Keep this content' })
    })
  })
  it('refreshes once after a 51-note tag batch while preserving unrelated text', () => {
    cy.then(async () => {
      const rows = Array.from({ length: 50 }, (_, index) => ({
        user_id: user.id, title: `Batch note ${index}`, description: `Preserved content ${index}`, tags: ['shared'],
        updated_at: new Date(Date.now() - (index + 1) * 60_000).toISOString(),
      }))
      const inserted = await client.from('notes').insert(rows)
      if (inserted.error) throw inserted.error
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.contains('Loaded 50 of 51 notes.', { timeout: 15000 }).should('be.visible')
    cy.contains('button', 'Load more notes').click()
    cy.contains('button', 'Load more notes', { timeout: 15000 }).should('not.exist')
    cy.contains('button', 'Check loaded notes').click()
    cy.get('[data-testid="tag-menu-trigger-shared"]', { timeout: 15000 }).should('not.be.disabled')
    cy.intercept({ method: 'GET', pathname: '/rest/v1/notes' }).as('batchReads')
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('batchWrites')
    renameShared()
    cy.contains('Tag "shared" renamed to "renamed"', { timeout: 30000 }).should('be.visible')
    cy.get('@batchWrites.all').should('have.length', 51)
    cy.get('@batchReads.all').its('length').should('be.lessThan', 20)
      .then(count => cy.log(`Batch: ${count} GET requests, 51 PATCH requests`))
    cy.then(async () => {
      const actual = await client.from('notes').select('title,description,tags').eq('user_id', user.id)
      if (actual.error) throw actual.error
      expect(actual.data).to.have.length(51)
      expect(actual.data.every(note => note.tags?.length === 1 && note.tags[0] === 'renamed')).to.equal(true)
      expect(actual.data.find(note => note.title === 'Current note')?.description).to.equal('Keep this content')
      expect(actual.data.find(note => note.title === 'Batch note 0')?.description).to.equal('Preserved content 0')
    })
  })

  it('blocks a deleted open tab before PATCH, retains it, and allows retry after closing it', () => {
    let deletedId = ''
    cy.then(async () => {
      const inserted = await client.from('notes').insert({
        user_id: user.id, title: 'Open then removed remotely', description: 'A saved open tab', tags: ['other'],
      }).select('id').single()
      if (inserted.error) throw inserted.error
      deletedId = inserted.data.id
    })
    cy.window().then(win => win.history.replaceState({}, '', '/?view=notes'))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'Open then removed remotely', { timeout: 15000 }).click()
    cy.get('[data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.get('[data-testid="tag-menu-trigger-shared"]', { timeout: 15000 }).should('not.be.disabled')
    cy.get('[data-testid="tag-menu-trigger-shared"]').click()
    cy.get('[data-testid="rename-action-shared"]').click()
    cy.get('[data-testid="rename-tag-input"]').clear().type('renamed')
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('preflightWrites')
    cy.then(async () => {
      const deleted = await client.from('notes').delete().eq('id', deletedId)
      if (deleted.error) throw deleted.error
    })
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.get('[role="alert"]', { timeout: 15000 }).should('contain.text',
      'No tag changes were sent by this attempt. An open note is no longer available. Close its tab and check again.')
    cy.contains("The result couldn't be confirmed").should('not.exist')
    cy.get('@preflightWrites.all').should('have.length', 0)
    cy.then(async () => {
      const actual = await client.from('notes').select('tags,description').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data).to.deep.equal({ tags: ['shared'], description: 'Keep this content' })
    })
    cy.screenshot('open-note-blocks-before-write')
    cy.contains('button', 'Cancel').click()
    cy.get('[data-testid="mobile-nav-notes"]').click()
    cy.get('[data-cy="mobile-tabs-toggle"]').click()
    cy.contains('[data-cy="mobile-workspace-tab"]', 'Open then removed remotely').should('be.visible')
    cy.get('[data-cy="mobile-workspace-tab-close"]').click()
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.contains('button', 'Check loaded notes').click()
    cy.get('[data-testid="tag-menu-trigger-shared"]', { timeout: 15000 }).should('not.be.disabled')
    renameShared()
    cy.contains('Tag "shared" renamed to "renamed"', { timeout: 15000 }).should('be.visible')
    cy.get('@preflightWrites.all').should('have.length', 1)
  })
  it('blocks a matching ownerless tag without PATCH, retains the cache, and allows retry after restoration', () => {
    const ownerlessId = crypto.randomUUID()
    cy.then(() => webOfflineStorageAdapter.saveNote({
      id: ownerlessId, title: 'Unknown owner', description: 'Keep this local copy', tags: [' SHARED '],
      updatedAt: '2026-10-01T00:00:00.000Z', status: 'synced',
    }))
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('ownerlessWrites')
    mountTagPage()
    cy.contains('Some cached notes have an unknown account and could not be reconciled.').should('be.visible')
    renameShared()
    cy.get('[role="alert"]', { timeout: 15000 }).should('contain.text',
      'No tag changes were sent by this attempt. Some cached notes with an unknown account would be changed. They were kept for safety.')
    cy.get('@ownerlessWrites.all').should('have.length', 0)
    cy.then(async () => {
      const cached = (await webOfflineStorageAdapter.loadNotes()).find(note => note.id === ownerlessId)
      expect(cached).to.include({ title: 'Unknown owner', description: 'Keep this local copy', status: 'synced' })
      expect(cached!.tags).to.deep.equal([' SHARED '])
      const actual = await client.from('notes').select('tags').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data.tags).to.deep.equal(['shared'])
      const restored = await client.from('notes').insert({
        id: ownerlessId, user_id: user.id, title: 'Restored note', description: 'Restored on another device', tags: ['shared'],
      })
      if (restored.error) throw restored.error
    })
    cy.contains('button', 'Cancel').click()
    cy.contains('button', 'Check loaded notes').click()
    cy.get('[data-testid="tag-menu-trigger-shared"]', { timeout: 15000 }).should('not.be.disabled')
    renameShared()
    cy.contains('Tag "shared" renamed to "renamed"', { timeout: 15000 }).should('be.visible')
    cy.get('@ownerlessWrites.all').should('have.length', 2)
  })
  it('allows an unrelated change while keeping the ownerless cached note unchanged', () => {
    const ownerlessId = crypto.randomUUID()
    cy.then(() => webOfflineStorageAdapter.saveNote({
      id: ownerlessId, title: 'Unknown owner', description: 'Keep this local copy', tags: ['unrelated'],
      updatedAt: '2026-10-01T00:00:00.000Z', status: 'synced',
    }))
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('unrelatedWrites')
    mountTagPage()
    cy.contains('Some cached notes have an unknown account and could not be reconciled.').should('be.visible')
    renameShared()
    cy.contains('Tag "shared" renamed to "renamed"', { timeout: 15000 }).should('be.visible')
    cy.get('@unrelatedWrites.all').should('have.length', 1)
    cy.then(async () => {
      const cached = (await webOfflineStorageAdapter.loadNotes()).find(note => note.id === ownerlessId)
      expect(cached).to.include({ title: 'Unknown owner', description: 'Keep this local copy', status: 'synced' })
      expect(cached!.tags).to.deep.equal(['unrelated'])
      const actual = await client.from('notes').select('tags,description').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data).to.deep.equal({ tags: ['renamed'], description: 'Keep this content' })
    })
    cy.window().then(win => win.history.replaceState({}, '', '/?view=notes'))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.get('[data-testid="tag-card-unrelated"]').should('be.visible')
    cy.get('[data-testid="tag-card-renamed"]').should('be.visible')
  })
  it('does not report success when an ownerless note gains the target tag during PATCH', () => {
    const ownerlessId = crypto.randomUUID()
    const cached = {
      id: ownerlessId, title: 'Unknown owner', description: 'Keep this local copy', tags: ['unrelated'],
      updatedAt: '2026-10-01T00:00:00.000Z', status: 'synced' as const,
    }
    cy.then(() => webOfflineStorageAdapter.saveNote(cached))
    mountTagPage()
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, req => {
      req.continue(async () => {
        await webOfflineStorageAdapter.saveNote({ ...cached, tags: ['unrelated', 'shared'] })
      })
    }).as('ownerlessRacePatch')
    renameShared()
    cy.wait('@ownerlessRacePatch', { timeout: 15000 })
    cy.contains("The result couldn't be confirmed. Refresh notes before trying again.", { timeout: 15000 }).should('be.visible')
    cy.contains('Tag "shared" renamed to "renamed"').should('not.exist')
    cy.then(async () => {
      const latest = (await webOfflineStorageAdapter.loadNotes()).find(note => note.id === ownerlessId)
      expect(latest!.tags).to.deep.equal(['unrelated', 'shared'])
      expect(latest!.description).to.equal('Keep this local copy')
      const actual = await client.from('notes').select('tags').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data.tags).to.deep.equal(['renamed'])
      await webOfflineStorageAdapter.saveNote(cached)
    })
    cy.contains('button', 'Cancel').click()
    cy.contains('button', 'Check loaded notes').click()
    cy.get('[data-testid="tag-menu-trigger-renamed"]', { timeout: 15000 }).should('not.be.disabled')
  })
  it('detects ownerless tags changed during the post-write server reread', () => {
    const ownerlessId = crypto.randomUUID()
    const cached = {
      id: ownerlessId, title: 'Unknown owner', description: 'Keep this local copy', tags: ['unrelated'],
      updatedAt: '2026-10-01T00:00:00.000Z', status: 'synced' as const,
    }
    let injected = false
    cy.then(() => webOfflineStorageAdapter.saveNote(cached))
    mountTagPage()
    cy.intercept({ method: 'GET', pathname: '/rest/v1/notes' }, req => {
      if (!injected && req.url.includes(ownerlessId)) {
        injected = true
        req.continue(async () => {
          await webOfflineStorageAdapter.saveNote({ ...cached, tags: ['unrelated', 'shared'] })
        })
      } else req.continue()
    })
    renameShared()
    cy.contains("The result couldn't be confirmed. Refresh notes before trying again.", { timeout: 15000 }).should('be.visible')
    cy.contains('Tag "shared" renamed to "renamed"').should('not.exist')
    cy.then(async () => {
      const latest = (await webOfflineStorageAdapter.loadNotes()).find(note => note.id === ownerlessId)
      expect(latest!.tags).to.deep.equal(['unrelated', 'shared'])
      expect(latest!.description).to.equal('Keep this local copy')
      const actual = await client.from('notes').select('tags').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data.tags).to.deep.equal(['renamed'])
    })
  })
  it('blocks an ownerless cache entry arriving during preflight without issuing PATCH', () => {
    const ownerlessId = crypto.randomUUID()
    let injected = false
    mountTagPage()
    cy.get('[data-testid="tag-menu-trigger-shared"]').click()
    cy.get('[data-testid="rename-action-shared"]').click()
    cy.get('[data-testid="rename-tag-input"]').clear().type('renamed')
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('lateOwnerlessWrites')
    cy.intercept({ method: 'HEAD', pathname: '/rest/v1/notes' }, req => {
      if (!injected) {
        injected = true
        req.continue(async () => {
          await webOfflineStorageAdapter.saveNote({
            id: ownerlessId, title: 'Arrived during verification', description: 'Keep this local copy',
            tags: ['shared'], updatedAt: '2026-10-01T00:00:00.000Z', status: 'synced',
          })
        })
      } else req.continue()
    })
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.get('[role="alert"]', { timeout: 15000 }).should('contain.text',
      'No tag changes were sent by this attempt. Some cached notes with an unknown account would be changed. They were kept for safety.')
    cy.get('@lateOwnerlessWrites.all').should('have.length', 0)
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === ownerlessId))
        .to.include({ description: 'Keep this local copy', status: 'synced' })
    })
  })
  it('reports a failed preflight request as no write, retaining the cache', () => {
    const cachedId = crypto.randomUUID()
    cy.then(() => webOfflineStorageAdapter.saveNote({
      id: cachedId, user_id: user.id, title: 'Cached elsewhere', description: 'Keep this cached content',
      tags: ['cache'], updatedAt: '2026-10-01T00:00:00.000Z', status: 'synced',
    }))
    mountTagPage()
    cy.get('[data-testid="tag-menu-trigger-shared"]').click()
    cy.get('[data-testid="rename-action-shared"]').click()
    cy.get('[data-testid="rename-tag-input"]').clear().type('renamed')
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }).as('failedPreflightWrites')
    cy.intercept({ method: 'HEAD', pathname: '/rest/v1/notes' }, { statusCode: 503, body: { message: 'Offline' } })
    cy.get('[data-testid="confirm-rename-tag-button"]').click()
    cy.get('[role="alert"]', { timeout: 15000 }).should('contain.text',
      'No tag changes were sent by this attempt. Could not verify the total number of notes. Try again.')
    cy.get('@failedPreflightWrites.all').should('have.length', 0)
    cy.then(async () => {
      expect((await webOfflineStorageAdapter.loadNotes()).find(note => note.id === cachedId))
        .to.include({ description: 'Keep this cached content', status: 'synced' })
    })
  })
  it('keeps the post-write uncertainty when an open note disappears after preflight', () => {
    let deletedId = ''
    cy.then(async () => {
      const inserted = await client.from('notes').insert({
        user_id: user.id, title: 'Open then removed remotely', description: 'A saved open tab', tags: ['other'],
      }).select('id').single()
      if (inserted.error) throw inserted.error
      deletedId = inserted.data.id
    })
    cy.window().then(win => win.history.replaceState({}, '', '/?view=notes'))
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><App /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"]', 'Open then removed remotely', { timeout: 15000 }).click()
    cy.get('[data-testid="mobile-nav-tags"]').click()
    cy.get('[data-testid="tag-menu-trigger-shared"]', { timeout: 15000 }).should('not.be.disabled')
    cy.intercept({ method: 'PATCH', pathname: '/rest/v1/notes' }, req => {
      req.continue(async () => {
        const deleted = await client.from('notes').delete().eq('id', deletedId)
        if (deleted.error) throw deleted.error
      })
    }).as('racePatch')
    renameShared()
    cy.wait('@racePatch', { timeout: 15000 })
    cy.contains("The result couldn't be confirmed. Refresh notes before trying again.", { timeout: 15000 }).should('be.visible')
    cy.contains('No tag changes were sent by this attempt.').should('not.exist')
    cy.then(async () => {
      const actual = await client.from('notes').select('tags,description').eq('id', remoteId).single()
      if (actual.error) throw actual.error
      expect(actual.data).to.deep.equal({ tags: ['renamed'], description: 'Keep this content' })
    })
    cy.contains('button', 'Cancel').click()
    cy.get('[data-testid="tag-card-renamed"]', { timeout: 10000 }).should('be.visible')
    cy.contains('button', 'Check loaded notes').click()
    cy.contains('An open note is no longer available. Close its tab and check again.', { timeout: 15000 }).should('be.visible')
    cy.get('[data-testid="mobile-nav-notes"]').click()
    cy.get('[data-cy="mobile-tabs-toggle"]').click()
    cy.contains('[data-cy="mobile-workspace-tab"]', 'Open then removed remotely').should('be.visible')
  })
})
