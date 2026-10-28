import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'

const user = { id: 'split-user', email: 'split@example.invalid' } as User
const notes = [
  { id: 'first', title: 'First note', description: '<p>First note body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
  { id: 'second', title: 'Second note', description: '<p>Second note body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T09:00:00Z', updated_at: '2026-10-28T09:00:00Z' },
  { id: 'long', title: 'Long note', description: Array.from({ length: 40 }, (_, index) => `<p>Paragraph ${index + 1} of the long note.</p>`).join(''), tags: [], user_id: user.id, created_at: '2026-10-28T08:00:00Z', updated_at: '2026-10-28T08:00:00Z' },
  { id: 'other-long', title: 'Other long note', description: Array.from({ length: 40 }, (_, index) => `<p>Other paragraph ${index + 1}.</p>`).join(''), tags: [], user_id: user.id, created_at: '2026-10-28T07:00:00Z', updated_at: '2026-10-28T07:00:00Z' },
]

function TestApp() {
  return <NotesShell controller={useNoteAppController()} />
}

const openTwoNotes = () => {
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
  cy.get('[data-cy="workspace-split-button"]').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Choose a note')
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Second note body')
}

describe('Desktop split view', { retries: 0 }, () => {
  beforeEach(() => {
    cy.viewport(1440, 900)
    const client = createClient('https://split-notes.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://split-notes.invalid/**', (req) => {
      if (req.url.includes('/rest/v1/notes')) {
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        const noteId = new URL(req.url).searchParams.get('id')
        const note = notes.find(item => noteId === `eq.${item.id}`) ?? notes[0]
        req.reply({ body: single ? note : notes, headers: { 'content-range': '0-3/4', 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    cy.clearLocalStorage()
    cy.window().then(win => win.sessionStorage.clear())
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><TestApp /></SupabaseTestProvider>)
  })

  it('opens a second note alongside the first and keeps both tabs on exit', () => {
    openTwoNotes()
    cy.get('[data-testid="split-pane-left"]').should('contain', 'First note body')
    cy.get('[data-testid="split-pane-left"]').then($left => {
      const left = $left[0].getBoundingClientRect()
      cy.get('[data-testid="split-pane-right"]').then($right => {
        const right = $right[0].getBoundingClientRect()
        expect(right.left).to.be.at.least(left.right - 1)
        expect(Math.abs(right.top - left.top)).to.be.lessThan(2)
      })
    })
    cy.viewport(1200, 800)
    cy.get('[data-testid="split-pane-right"] [data-cy="note-delete-button"]').then($button => {
      const button = $button[0].getBoundingClientRect()
      cy.get('[data-testid="split-pane-right"]').then($pane => {
        expect(button.right).to.be.at.most($pane[0].getBoundingClientRect().right)
      })
    })
    cy.screenshot('split-desktop', { capture: 'viewport' })
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-testid="split-pane-left"]').should('not.exist')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
    cy.contains('[data-testid="editor-container"]', 'Second note body').should('be.visible')
  })

  it('keeps both panes when narrowing to mobile and restoring desktop', () => {
    openTwoNotes()
    cy.viewport(1000, 900)
    cy.contains('Enlarge the workspace to show both notes.').should('be.visible')
    cy.get('[data-testid="split-pane-left"]').should('not.be.visible')
    cy.get('[data-testid="split-pane-right"]').should('be.visible').and('contain', 'Second note body')
    cy.viewport(390, 844)
    cy.get('[data-testid="split-pane-right"]').should('be.visible').and('contain', 'Second note body')
    cy.viewport(1440, 900)
    cy.get('[data-testid="split-pane-left"]').should('be.visible').and('contain', 'First note body')
    cy.get('[data-testid="split-pane-right"]').should('be.visible').and('contain', 'Second note body')
  })

  it('keeps reading and editing controls inside narrow desktop panes', () => {
    openTwoNotes()
    cy.viewport(1080, 800)
    cy.get('[data-testid="split-pane-right"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-delete-button"]').then($button => {
      cy.get('[data-testid="split-pane-right"]').then($pane => {
        expect($button[0].getBoundingClientRect().right).to.be.at.most($pane[0].getBoundingClientRect().right)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-save-button"]').then($button => {
      cy.get('[data-testid="split-pane-right"]').then($pane => {
        expect($button[0].getBoundingClientRect().right).to.be.at.most($pane[0].getBoundingClientRect().right)
      })
    })
  })

  it('activates the already-open note instead of opening a duplicate', () => {
    openTwoNotes()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').contains('Activate').should('be.visible')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Second note body')
  })

  it('keeps the current draft and panel active if saving before activation fails', () => {
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    const failedWrite = cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').as('failedWrite')
    failedWrite.rejects(new Error('Storage unavailable'))
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Second changed')
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('@failedWrite').should('have.been.called')
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Second changed')
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-left"]').contains('Activate').should('be.visible')
    cy.focused().should('have.attr', 'aria-label', 'Activate First note')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
    cy.get('[data-testid="nav-item-tags"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Second changed')
    cy.get('[data-testid="nav-action-settings"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Second changed')
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[aria-label="Note title"]').should('have.value', 'Second changed')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[aria-label="Note title"]').should('have.value', 'Second changed')
    cy.then(() => failedWrite.restore())
    cy.contains('button', 'Activate').click()
    cy.contains('[data-testid^="split-pane-"]', 'Second changed').should('be.visible')
  })

  it('does not create a second tab when opening split cannot save the draft', () => {
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    const failedWrite = cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').as('failedWrite')
    failedWrite.rejects(new Error('Storage unavailable'))
    cy.get('[aria-label="Note title"]').clear().type('First unsaved')
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('@failedWrite').should('have.been.called')
    cy.get('[aria-label="Note title"]').should('have.value', 'First unsaved')
    cy.get('[data-testid="split-pane-left"]').should('not.exist')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 1)
  })

  it('keeps the same live editor mounted when opening and closing a split', () => {
    openTwoNotes()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Unfinished draft')
    cy.get('[aria-label="Note title"]').then(($input) => {
      const original = $input[0]
      cy.get('[data-cy="workspace-split-button"]').click()
      cy.get('[aria-label="Note title"]').should(($current) => {
        expect($current[0]).to.equal(original)
        expect($current.val()).to.equal('Unfinished draft')
      })
      cy.get('[data-cy="workspace-split-button"]').click()
      cy.get('[aria-label="Note title"]').should(($current) => {
        expect($current[0]).to.equal(original)
        expect($current.val()).to.equal('Unfinished draft')
      })
    })
  })

  it('retains each note scroll position while its pane is activated', () => {
    openTwoNotes()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="split-note-preview"]').scrollTo(0, 600)
    cy.viewport(390, 844)
    cy.viewport(1440, 900)
    cy.get('[data-testid="split-pane-right"] [data-cy="split-note-preview"]').should(($surface) => {
      expect($surface[0].scrollTop).to.be.greaterThan(500)
    })
    cy.get('[data-testid="split-pane-right"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="pull-to-refresh"] > div').should(($surface) => {
      expect($surface[0].scrollTop).to.be.greaterThan(500)
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="pull-to-refresh"] > div').scrollTo(0, 1200)
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="split-note-preview"]').should(($surface) => {
      expect($surface[0].scrollTop).to.be.greaterThan(1000)
    })
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="split-note-preview"]').should(($surface) => {
      expect($surface[0].scrollTop).to.be.greaterThan(1000)
    })
  })

  it('does not apply the previous note scroll position to another note in the same tab', () => {
    openTwoNotes()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="pull-to-refresh"] > div').scrollTo(0, 800)
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Other long note').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="pull-to-refresh"] > div').should(($surface) => {
      expect($surface[0].scrollTop).to.equal(0)
    })
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="split-note-preview"]').should(($surface) => {
      expect($surface[0].scrollTop).to.equal(0)
    })
  })

  it('keeps a new note scroll position when its first save assigns an ID', () => {
    cy.get('[data-testid="sidebar-container"] button').contains('New Note').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.get('[aria-label="Note title"]').type('New scrolling draft')
    const paragraphs = Array.from({ length: 35 }, (_, index) => `Draft paragraph ${index + 1}{enter}`).join('')
    cy.get('[data-cy="editor-content"] .ProseMirror').type(paragraphs, { delay: 0 })
    cy.get('[data-cy="editor-content"]').parents('.overflow-y-auto').first().scrollTo(0, 600)
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-testid="split-pane-left"] [data-cy="split-note-preview"]').should(($surface) => {
      expect($surface[0].scrollTop).to.be.greaterThan(400)
    })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'New scrolling draft')
  })

  it('preserves an unfinished editor through mobile and back to desktop', () => {
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Draft through resize')
    cy.get('[aria-label="Note title"]').then(($input) => {
      const original = $input[0]
      cy.viewport(390, 844)
      cy.get('[aria-label="Note title"]').should(($current) => {
        expect($current[0]).to.equal(original)
        expect($current.val()).to.equal('Draft through resize')
      })
      cy.viewport(1440, 900)
      cy.get('[aria-label="Note title"]').should(($current) => {
        expect($current[0]).to.equal(original)
        expect($current.val()).to.equal('Draft through resize')
      })
      cy.get('[data-testid="split-pane-left"]').should('be.visible').and('contain', 'First note body')
    })
  })

  it('retains other tabs when the active pane is replaced or closed', () => {
    openTwoNotes()
    cy.get('[data-cy="add-tab-button"]').click()
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Choose a note')
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.get('[data-testid="split-pane-left"]').should('contain', 'First note body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Paragraph 1')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 3)
    cy.contains('[data-tab-id] [data-cy="workspace-tab"]', 'Second note').click()
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Second note body')
    cy.get('[aria-label="Close Second note"]').click()
    cy.get('[data-testid="split-pane-left"]').should('not.exist')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
    cy.contains('[data-tab-id] [data-cy="workspace-tab"]', 'First note').should('exist')
    cy.contains('[data-tab-id] [data-cy="workspace-tab"]', 'Long note').should('exist')
  })

  it('flushes edits to their own notes when activating each pane', () => {
    openTwoNotes()
    cy.spy(webOfflineStorageAdapter, 'saveNote').as('noteWrites')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Second changed')
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.focused().should('have.attr', 'data-testid', 'split-pane-left')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Second changed')
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').clear().type('First changed')
    cy.get('[data-testid="split-pane-right"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Second changed')
    cy.get('[data-testid="split-pane-left"]').should('contain', 'First changed')
    cy.get('@noteWrites').should((spy) => {
      const calls = (spy as unknown as { getCalls: () => Array<{ args: Array<{ id: string, title: string }> }> }).getCalls()
      const writes = calls.map((call) => call.args[0])
      expect(writes.some(note => note.id === 'first' && note.title === 'First changed')).to.equal(true)
      expect(writes.some(note => note.id === 'second' && note.title === 'Second changed')).to.equal(true)
      expect(writes.some(note => note.id === 'first' && note.title === 'Second changed')).to.equal(false)
      expect(writes.some(note => note.id === 'second' && note.title === 'First changed')).to.equal(false)
    })
  })
})
