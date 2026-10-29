import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { SPLIT_VIEW_ENABLED_KEY, SplitViewPreferenceProvider } from '@ui/web/providers/SplitViewPreferenceProvider'
import { getPendingOwnerNotes, waitForOwnerNoteWrites } from '@ui/web/lib/ownerNoteWrites'

const user = { id: 'split-user', email: 'split@example.invalid' } as User
const notes = [
  { id: 'first', title: 'First note', description: '<p>First note body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
  { id: 'second', title: 'Second note', description: '<p>Second note body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T09:00:00Z', updated_at: '2026-10-28T09:00:00Z' },
  { id: 'long', title: 'Long note', description: Array.from({ length: 40 }, (_, index) => `<p>Paragraph ${index + 1} of the long note.</p>`).join(''), tags: [], user_id: user.id, created_at: '2026-10-28T08:00:00Z', updated_at: '2026-10-28T08:00:00Z' },
  { id: 'other-long', title: 'Other long note', description: Array.from({ length: 40 }, (_, index) => `<p>Other paragraph ${index + 1}.</p>`).join(''), tags: [], user_id: user.id, created_at: '2026-10-28T07:00:00Z', updated_at: '2026-10-28T07:00:00Z' },
]

function TestApp() {
  return <SplitViewPreferenceProvider><NotesShell controller={useNoteAppController()} /></SplitViewPreferenceProvider>
}

const openTwoNotes = () => {
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
  cy.get('[data-cy="workspace-split-button"]').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Choose a note')
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Second note body')
}

describe('Desktop split view', { retries: 0 }, () => {
  let restoreNetwork: (() => void) | undefined
  let releasingWrites: boolean
  let heldWrites: Array<{ noteId: string; release: () => Promise<void> }>
  let expectedWriteErrors: Set<unknown>

  const holdQueueWrite = (noteId: string, write: () => Promise<void>, register: (release: () => Promise<void>) => void) => {
    if (releasingWrites) return write()
    return new Cypress.Promise<void>((resolve, reject) => {
      let started: Promise<void> | undefined
      const release = () => {
        if (!started) {
          try { started = write() } catch (error) { started = Promise.reject(error) }
          void started.then(resolve, reject)
        }
        return started
      }
      heldWrites.push({ noteId, release })
      register(release)
    })
  }

  const expectedWriteFailure = () => {
    const error = new Error('Storage unavailable')
    expectedWriteErrors.add(error)
    return error
  }

  beforeEach(() => {
    restoreNetwork = undefined
    releasingWrites = false
    heldWrites = []
    expectedWriteErrors = new Set()
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
    cy.window().then(win => {
      const originalDescriptor = Object.getOwnPropertyDescriptor(win.navigator, 'onLine')
      const originallyOnline = win.navigator.onLine
      restoreNetwork = () => {
        if (originalDescriptor) Object.defineProperty(win.navigator, 'onLine', originalDescriptor)
        else Reflect.deleteProperty(win.navigator, 'onLine')
        expect(win.navigator.onLine, 'restored navigator.onLine').to.equal(originallyOnline)
        win.dispatchEvent(new Event(originallyOnline ? 'online' : 'offline'))
      }
      win.sessionStorage.clear()
      win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'true')
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><TestApp /></SupabaseTestProvider>)
  })

  afterEach(function () {
    // Failed tests may leave a controlled write in flight. Finish it before
    // clearing the shared cache, otherwise it can leak into the next mount.
    const testFailed = this.currentTest?.state === 'failed'
    releasingWrites = true
    // Restore synchronously, even if subsequent asynchronous cleanup fails.
    const errors = new Set<unknown>()
    try { restoreNetwork?.() } catch (error) { errors.add(error) }
    const pendingBeforeUnmount = getPendingOwnerNotes(user.id).map(note => note.id)
    cy.mount(<></>)
    cy.then(async () => {
      try {
        const releases = await Promise.allSettled(heldWrites.map(({ release }) => release()))
        releases.forEach(result => { if (result.status === 'rejected') errors.add(result.reason) })
        const noteIds = new Set([...notes.map(note => note.id), ...heldWrites.map(write => write.noteId), ...pendingBeforeUnmount, ...getPendingOwnerNotes(user.id).map(note => note.id)])
        const waits = await Promise.allSettled([...noteIds].map(noteId => waitForOwnerNoteWrites(user.id, noteId)))
        waits.forEach(result => { if (result.status === 'rejected' && !expectedWriteErrors.has(result.reason)) errors.add(result.reason) })
        if (getPendingOwnerNotes(user.id).length) errors.add(new Error('Owned writes remain after cleanup'))
      } catch (error) {
        errors.add(error)
      }
      try {
        await webOfflineStorageAdapter.clearAll()
        const [cached, queue] = await Promise.all([webOfflineStorageAdapter.loadNotes(), webOfflineStorageAdapter.getQueue()])
        if (cached.length || queue.length) errors.add(new Error('Test storage is not empty after cleanup'))
      } catch (error) { errors.add(error) }
      return [...errors].map(error => error instanceof Error ? error.message : String(error))
    }).then(errors => {
      if (!errors.length) return
      const message = `Fixture cleanup failed: ${errors.join('; ')}`
      if (testFailed) cy.log(message)
      else throw new Error(message)
    })
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
    failedWrite.rejects(expectedWriteFailure())
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
    failedWrite.rejects(expectedWriteFailure())
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

  it('captures each live pane position before delayed scroll events on activation', () => {
    openTwoNotes()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="split-note-preview"]').then(($preview) => {
      const preview = $preview[0]
      preview.scrollTop = 200
      preview.dispatchEvent(new Event('scroll'))
      preview.scrollTop = 600
      expect(preview.scrollTop, 'live preview position before activation').to.be.greaterThan(500)
      const pane = preview.closest('[data-testid="split-pane-right"]')
      if (!pane) throw new Error('Missing right pane')
      const activate = pane.querySelector<HTMLButtonElement>('button[aria-label^="Activate"]')
      if (!activate) throw new Error('Missing activation button')
      activate.click()
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'active reader restores the live preview position').to.be.greaterThan(500)
    }).then(($reader) => {
      const reader = $reader[0]
      reader.scrollTop = 800
      reader.dispatchEvent(new Event('scroll'))
      reader.scrollTop = 1200
      expect(reader.scrollTop, 'live reader position before activation').to.be.greaterThan(1000)
      const activate = reader.ownerDocument.querySelector<HTMLButtonElement>('[data-testid="split-pane-left"] button[aria-label^="Activate"]')
      if (!activate) throw new Error('Missing activation button')
      activate.click()
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'inactive preview restores the live reader position').to.be.greaterThan(1000)
    })
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'closing and reopening split preserves the position').to.be.greaterThan(1000)
    })
  })

  it('captures the live left pane position before delayed scroll events on activation', () => {
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-testid="split-pane-left"] [data-cy="split-note-preview"]').then(($preview) => {
      const preview = $preview[0]
      preview.scrollTop = 200
      preview.dispatchEvent(new Event('scroll'))
      preview.scrollTop = 600
      expect(preview.scrollTop, 'live left preview position before activation').to.be.greaterThan(500)
      const pane = preview.closest('[data-testid="split-pane-left"]')
      if (!pane) throw new Error('Missing left pane')
      const activate = pane.querySelector<HTMLButtonElement>('button[aria-label^="Activate"]')
      if (!activate) throw new Error('Missing activation button')
      activate.click()
    })
    cy.get('[data-testid="split-pane-left"] [data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'left reader restores the live preview position').to.be.greaterThan(500)
    }).then(($reader) => {
      const reader = $reader[0]
      reader.scrollTop = 800
      reader.dispatchEvent(new Event('scroll'))
      reader.scrollTop = 1200
      expect(reader.scrollTop, 'live left reader position before activation').to.be.greaterThan(1000)
      const activate = reader.ownerDocument.querySelector<HTMLButtonElement>('[data-testid="split-pane-right"] button[aria-label^="Activate"]')
      if (!activate) throw new Error('Missing activation button')
      activate.click()
    })
    cy.get('[data-testid="split-pane-left"] [data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'left preview restores the live reader position').to.be.greaterThan(1000)
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

  it('does not apply delayed scroll from the previous note to its replacement', () => {
    openTwoNotes()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.get('[data-testid="split-pane-right"] [data-cy="pull-to-refresh"] > div').then(($reader) => {
      const reader = $reader[0]
      reader.scrollTop = 200
      reader.dispatchEvent(new Event('scroll'))
      reader.scrollTop = 800
      expect(reader.scrollTop, 'old note is scrolled').to.be.greaterThan(500)
      const buttons = reader.ownerDocument.querySelectorAll<HTMLButtonElement>('[data-testid="sidebar-container"] [data-testid="note-card"] button')
      const replacement = Array.from(buttons).find(button => button.textContent?.includes('Other long note'))
      if (!replacement) throw new Error('Missing replacement note')
      replacement.click()
    })
    cy.get('[data-testid="split-pane-right"]').should('contain.text', 'Other long note')
    cy.get('[data-testid="split-pane-right"] [data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'replacement starts at the top').to.equal(0)
    })
    cy.tick(500)
    cy.get('[data-testid="split-pane-right"] [data-cy="pull-to-refresh"] > div').should(($reader) => {
      expect($reader[0].scrollTop, 'delayed old-note event does not change the replacement').to.equal(0)
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

  it('persists edits made during a slow save before activating another pane', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])

    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    const releases: Array<() => Promise<unknown>> = []
    const observedQueueWrites: Array<{ noteId: string; operation: string; title: string | undefined }> = []
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      observedQueueWrites.push({ noteId: item.noteId, operation: item.operation, title: item.payload?.title })
      if (item.payload?.title !== 'First version' && item.payload?.title !== 'Latest version') return original(item)
      return holdQueueWrite(item.noteId, () => original(item), release => releases.push(release))
    })
    cy.spy(webOfflineStorageAdapter, 'saveNote').as('saved')

    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('First version')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(releases, `Observed synthetic queue writes: ${JSON.stringify(observedQueueWrites)}`).to.have.length(1))
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Second version')
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    // Typing remains possible while the transition is waiting for storage.
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Latest version')
    cy.then(() => releases[0]())

    cy.wrap(null).should(() => expect(releases).to.have.length(2))
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.then(() => releases[1]())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Latest version')
    cy.get('@saved').should(spy => {
      const writes = (spy as unknown as { getCalls: () => Array<{ args: Array<{ id: string, title: string }> }> }).getCalls().map(call => call.args[0])
      expect(writes.some(note => note.id === 'second' && note.title === 'Latest version')).to.equal(true)
      expect(writes.some(note => note.id === 'first' && note.title === 'Latest version')).to.equal(false)
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.title === 'Latest version')).to.equal(true)
    })
  })

  it('persists the latest edit before switching and closing ordinary tabs', () => {
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
    cy.get('[data-cy="add-tab-button"]').click()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.payload?.title !== 'Earlier tab edit') return original(item)
      return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
    })
    cy.get('[aria-label="Note title"]').clear().type('Earlier tab edit')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[aria-label="Note title"]').clear().type('Latest tab edit')
    cy.contains('[data-cy="workspace-tab"]', 'First note').click()
    cy.get('[aria-label="Note title"]').should('have.value', 'Latest tab edit')
    cy.then(() => release!())
    cy.get('[data-testid="editor-container"]').should('contain', 'First note body')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Latest tab edit')
    })
    cy.get('[data-cy="workspace-tab-close"]').last().click()
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 1)
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Latest tab edit')
    })
  })

  it('blocks pane activation when the latest queued write fails and allows retry', () => {
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    const write = cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.payload?.title === 'Earlier successful edit') {
        return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
      }
      if (item.payload?.title === 'Latest failed edit') return Promise.reject(expectedWriteFailure())
      return original(item)
    }).as('write')
    cy.get('[aria-label="Note title"]').clear().type('Earlier successful edit')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[aria-label="Note title"]').clear().type('Latest failed edit')
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.then(() => release!())
    cy.get('@write').should(spy => {
      const calls = (spy as unknown as { getCalls: () => Array<{ args: Array<{ payload?: { title?: string } }> }> }).getCalls()
      expect(calls.some(call => call.args[0].payload?.title === 'Latest failed edit')).to.equal(true)
    })
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.get('[aria-label="Note title"]').should('have.value', 'Latest failed edit')
    cy.then(() => write.restore())
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Latest failed edit')
    })
  })

  it('waits for a manual save that overlaps autosave before changing panes', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const releases: Array<() => Promise<unknown>> = []
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.payload?.title !== 'Earlier automatic save' && item.payload?.title !== 'Latest manual save') return original(item)
      if (item.payload?.title === 'Latest manual save' && releases.length > 1) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), release => releases.push(release))
    })
    cy.get('[aria-label="Note title"]').clear().type('Earlier automatic save')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(releases).to.have.length(1))
    cy.get('[aria-label="Note title"]').clear().type('Latest manual save')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.then(() => releases[0]())
    cy.wrap(null).should(() => expect(releases).to.have.length(2))
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.then(() => releases[1]())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Latest manual save')
    })
  })

  it('updates the same newly created note when a newer edit waits for its first save', () => {
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="sidebar-container"] button').contains('New Note').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.operation !== 'create') return original(item)
      return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
    })
    cy.spy(webOfflineStorageAdapter, 'saveNote').as('saved')
    cy.get('[aria-label="Note title"]').type('New first version')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[aria-label="Note title"]').clear().type('New latest version')
    cy.get('[data-cy="add-tab-button"]').click()
    cy.get('[aria-label="Note title"]').should('have.value', 'New latest version')
    cy.then(() => release!())
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
    cy.get('@saved').should(spy => {
      const writes = (spy as unknown as { getCalls: () => Array<{ args: Array<{ id: string, title: string }> }> }).getCalls().map(call => call.args[0])
      const first = writes.find(note => note.title === 'New first version')
      const latest = writes.find(note => note.title === 'New latest version')
      expect(first?.id).to.be.a('string')
      expect(latest?.id).to.equal(first?.id)
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const created = queue.filter(item => item.operation === 'create' && item.payload?.title === 'New first version')
      const updated = queue.filter(item => item.operation === 'update' && item.payload?.title === 'New latest version')
      expect(created).to.have.length(1)
      expect(updated).to.have.length(1)
      expect(updated[0].noteId).to.equal(created[0].noteId)
    })
  })
})
