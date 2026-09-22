import React from 'react'
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
          req.reply({ statusCode: 204, body: '' })
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
    cy.wrap(remoteNotes).should((notes) => {
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
    cy.get('[data-testid="note-card"]').should('not.exist')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should('have.length', 0)
    mountApp()
    cy.contains('Saved without internet').should('not.exist')
  })
})
