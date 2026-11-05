import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const api = 'https://note-editor-history.invalid'
const owner = { id: 'editor-history-owner' } as User
const note = {
  id: 'editor-history-note',
  user_id: owner.id,
  title: 'Note with history',
  description: '<p>Current saved body</p>',
  tags: [],
  created_at: '2026-11-05T15:00:00Z',
  updated_at: '2026-11-05T16:00:00Z',
}
const versions = [
  { version: 2, created_at: note.updated_at, title: note.title, description: note.description, tags: [] },
  { version: 1, created_at: note.created_at, title: 'Earlier title', description: '<p><strong>Earlier saved body</strong></p>', tags: [] },
]

function AppUnderTest() {
  return <NotesShell controller={useNoteAppController()} />
}

function openEarlierVersion() {
  cy.get('[data-cy="note-more-button"]').click()
  cy.contains('[role="menuitem"]', 'Version history').click()
  cy.get('[data-cy="note-history-version-1"]').click()
}

describe('Version history in the note editor', { retries: 0 }, () => {
  it('opens a saved version with restore disabled and preserves the editing draft', () => {
    const client = createClient(api, 'test-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    let savedNote = note
    cy.intercept(`${api}/**`, req => {
      const url = new URL(req.url)
      if (url.pathname.endsWith('/rest/v1/note_versions')) {
        expect(url.searchParams.get('note_id')).to.equal(`eq.${note.id}`)
        const version = url.searchParams.get('version')
        req.reply({ body: version ? versions.find(entry => version === `eq.${entry.version}`) : versions })
      } else if (url.pathname.endsWith('/rest/v1/notes')) {
        if (req.method === 'PATCH') savedNote = { ...savedNote, ...req.body }
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        req.reply({
          body: single ? savedNote : [savedNote],
          headers: { 'content-range': '0-0/1', 'access-control-expose-headers': 'content-range' },
        })
      } else {
        req.reply({ body: [] })
      }
    })
    cy.viewport(1280, 900)
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.history.replaceState({}, '', '/?view=notes')
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<SupabaseTestProvider supabase={client} user={owner}><AppUnderTest /></SupabaseTestProvider>)
    cy.contains('[data-testid="note-card"] button', note.title).click()
    cy.get('[data-cy="note-edit-button"]').click()

    openEarlierVersion()
    cy.get('[data-cy="note-history-dialog"]').contains('strong', 'Earlier saved body').should('be.visible')
    cy.get('[data-cy="note-history-restore"]').should('be.disabled')
    cy.contains('Switch to reading mode to restore a version.').should('be.visible')
    cy.get('[data-cy="note-history-dialog"]').contains('button', 'Close').click()
    cy.get('[data-cy="note-history-dialog"]').should('not.exist')

    cy.get('textarea[aria-label="Note title"]').clear().type('Draft title')
    cy.get('.ProseMirror').type('{end} with a draft edit')
    openEarlierVersion()
    cy.get('[data-cy="note-history-restore"]').should('be.disabled')
    cy.get('[data-cy="note-history-dialog"]').contains('button', 'Close').click()
    cy.get('[data-cy="note-history-dialog"]').should('not.exist')
    cy.get('textarea[aria-label="Note title"]').should('have.value', 'Draft title')
    cy.get('.ProseMirror').should('contain.text', 'Current saved body with a draft edit')
  })
})
