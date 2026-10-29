import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { SPLIT_VIEW_ENABLED_KEY, SplitViewPreferenceProvider } from '@ui/web/providers/SplitViewPreferenceProvider'
import { enqueueOwnerNoteWrite, getPendingOwnerNotes, waitForOwnerNoteWrites } from '@ui/web/lib/ownerNoteWrites'
import { toast } from 'sonner'

const user = { id: 'split-user', email: 'split@example.invalid' } as User
const notes = [
  { id: 'first', title: 'First note', description: '<p>First note body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T10:00:00Z', updated_at: '2026-10-28T10:00:00Z' },
  { id: 'second', title: 'Second note', description: '<p>Second note body</p>', tags: [], user_id: user.id, created_at: '2026-10-28T09:00:00Z', updated_at: '2026-10-28T09:00:00Z' },
  { id: 'long', title: 'Long note', description: Array.from({ length: 40 }, (_, index) => `<p>Paragraph ${index + 1} of the long note.</p>`).join(''), tags: [], user_id: user.id, created_at: '2026-10-28T08:00:00Z', updated_at: '2026-10-28T08:00:00Z' },
  { id: 'other-long', title: 'Other long note', description: Array.from({ length: 40 }, (_, index) => `<p>Other paragraph ${index + 1}.</p>`).join(''), tags: [], user_id: user.id, created_at: '2026-10-28T07:00:00Z', updated_at: '2026-10-28T07:00:00Z' },
]

let observeWorkspaceCommit: ((controller: ReturnType<typeof useNoteAppController>) => void) | undefined

function TestApp() {
  const controller = useNoteAppController()
  React.useLayoutEffect(() => { observeWorkspaceCommit?.(controller) })
  return <SplitViewPreferenceProvider><NotesShell controller={controller} /></SplitViewPreferenceProvider>
}

const openTwoNotes = () => {
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First note').click()
  cy.get('[data-cy="workspace-split-button"]').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Choose a note')
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Second note body')
}

type SplitScrollTrace = {
  commits: Array<{ at: number; active: boolean; scrollTop: number | null; readerPresent: boolean }>
  firstReaderCommit: { at: number; scrollTop: number | null } | null
  scrolls: Array<{ at: number; surface: 'preview' | 'reader'; scrollTop: number; connected: boolean }>
  marker: { requested: boolean; fired: boolean; at: number | null; scrollTop: number | null; connected: boolean | null }
}

const scrollDiagnostic = (reader: HTMLElement, trace?: SplitScrollTrace) => {
  const doc = reader.ownerDocument
  const view = doc.defaultView
  const active = doc.activeElement
  const pane = reader.closest('[data-testid^="split-pane-"]')
  const style = view?.getComputedStyle(reader)
  return JSON.stringify({
    at: view?.performance.now(),
    visibility: doc.visibilityState,
    documentFocused: doc.hasFocus(),
    activeTag: active?.tagName,
    activeRole: active?.getAttribute('role'),
    paneActive: pane?.getAttribute('data-active-pane'),
    scrollTop: reader.scrollTop,
    scrollHeight: reader.scrollHeight,
    clientHeight: reader.clientHeight,
    display: style?.display,
    rendered: reader.getClientRects().length > 0,
    trace,
  })
}

describe('Desktop split view', { retries: 0 }, () => {
  let restoreNetwork: (() => void) | undefined
  let releasingWrites: boolean
  let heldWrites: Array<{ noteId: string; release: () => Promise<void> }>
  let expectedWriteErrors: Set<unknown>
  let stopScrollTrace: (() => void) | undefined
  let restoreAnimationFrame: (() => void) | undefined

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
    observeWorkspaceCommit = undefined
    stopScrollTrace = undefined
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
    restoreAnimationFrame?.()
    restoreAnimationFrame = undefined
    // Failed tests may leave a controlled write in flight. Finish it before
    // clearing the shared cache, otherwise it can leak into the next mount.
    const testFailed = this.currentTest?.state === 'failed'
    releasingWrites = true
    // Restore synchronously, even if subsequent asynchronous cleanup fails.
    const errors = new Set<unknown>()
    try { stopScrollTrace?.() } catch (error) { errors.add(error) }
    stopScrollTrace = undefined
    observeWorkspaceCommit = undefined
    try { restoreNetwork?.() } catch (error) { errors.add(error) }
    const pendingBeforeUnmount = getPendingOwnerNotes(user.id).map(note => note.id)
    cy.mount(<></>)
    cy.then(async () => {
      try {
        const releases = await Promise.allSettled(heldWrites.map(({ release }) => release()))
        releases.forEach(result => { if (result.status === 'rejected' && !expectedWriteErrors.has(result.reason)) errors.add(result.reason) })
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

  it('preserves a pane position when switching again before its first animation frame', () => {
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-testid="split-pane-left"] [data-cy="split-note-preview"]').then(($preview) => {
      const preview = $preview[0]
      const win = preview.ownerDocument.defaultView
      if (!win) throw new Error('Missing preview window')
      preview.scrollTop = 600
      expect(preview.scrollTop, 'live position before first activation').to.be.greaterThan(500)

      // A busy browser can delay the newly activated reader's first paint.
      // Hold its callbacks while we immediately activate the other pane.
      const originalFrame = win.requestAnimationFrame
      win.requestAnimationFrame = () => 2147483647
      restoreAnimationFrame = () => { win.requestAnimationFrame = originalFrame }
      const activate = preview.closest('[data-testid="split-pane-left"]')?.querySelector<HTMLButtonElement>('button[aria-label^="Activate"]')
      if (!activate) throw new Error('Missing activation button')
      activate.click()
    })
    cy.get('[data-testid="split-pane-left"] [data-cy="pull-to-refresh"] > div').should('exist')
    cy.then(() => { restoreAnimationFrame?.(); restoreAnimationFrame = undefined })
    cy.get('[data-testid="split-pane-right"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-left"] [data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'the original pane restores its live position').to.be.greaterThan(500)
    })
  })

  it('retains a scrolled pane mounted while the workspace is narrow', () => {
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-left"] [data-cy="pull-to-refresh"] > div').scrollTo(0, 600)
    cy.viewport(1000, 900)
    cy.contains('Enlarge the workspace to show both notes.').should('be.visible')
    cy.contains('[data-cy="workspace-tab"]', 'Second note').click()
    cy.get('[data-testid="split-pane-left"]').should('not.be.visible')
    cy.viewport(1440, 900)
    cy.get('[data-testid="split-pane-left"] [data-cy="split-note-preview"]').should(($preview) => {
      expect($preview[0].scrollTop, 'inactive pane restores its position after widening').to.be.greaterThan(500)
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
      expect($reader[0].scrollTop, `active reader restores the live preview position; ${scrollDiagnostic($reader[0])}`).to.be.greaterThan(500)
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
    const trace: SplitScrollTrace = {
      commits: [],
      firstReaderCommit: null,
      scrolls: [],
      marker: { requested: false, fired: false, at: null, scrollTop: null, connected: null },
    }
    const record = <T,>(items: T[], item: T) => {
      items.push(item)
      if (items.length > 20) items.shift()
    }
    let requestMarker: ((reader: HTMLElement) => void) | undefined
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Long note').click()
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Second note').click()
    cy.get('[data-testid="split-pane-left"] [data-cy="split-note-preview"]').then(($preview) => {
      const preview = $preview[0]
      const doc = preview.ownerDocument
      const win = doc.defaultView
      if (!win) throw new Error('Missing preview window')
      let markerId: number | undefined
      const commit = (controller: ReturnType<typeof useNoteAppController>) => {
        const tab = controller.tabs.find(item => item.noteId === 'long')
        const at = win.performance.now()
        const active = Boolean(tab && controller.activeTabId === tab.id)
        const scrollTop = tab?.view.scrollTop ?? null
        const readerPresent = Boolean(doc.querySelector('[data-testid="split-pane-left"] [data-cy="pull-to-refresh"] > div'))
        record(trace.commits, { at, active, scrollTop, readerPresent })
        if (active && readerPresent && !trace.firstReaderCommit) trace.firstReaderCommit = { at, scrollTop }
      }
      const onScroll = (event: Event) => {
        const node = event.target as HTMLElement | null
        if (!node || typeof node.closest !== 'function') return
        const surface = node === preview ? 'preview'
          : node.matches('[data-cy="pull-to-refresh"] > div') && node.closest('[data-testid="split-pane-left"]') ? 'reader' : null
        if (surface) record(trace.scrolls, { at: win.performance.now(), surface, scrollTop: node.scrollTop, connected: node.isConnected })
      }
      observeWorkspaceCommit = commit
      doc.addEventListener('scroll', onScroll, { capture: true, passive: true })
      requestMarker = reader => {
        if (trace.marker.requested) return
        trace.marker.requested = true
        markerId = win.requestAnimationFrame(() => {
          trace.marker.fired = true
          trace.marker.at = win.performance.now()
          trace.marker.scrollTop = reader.scrollTop
          trace.marker.connected = reader.isConnected
        })
      }
      stopScrollTrace = () => {
        doc.removeEventListener('scroll', onScroll, true)
        if (markerId !== undefined && !trace.marker.fired) win.cancelAnimationFrame(markerId)
        if (observeWorkspaceCommit === commit) observeWorkspaceCommit = undefined
      }
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
      if ($reader[0]) requestMarker?.($reader[0])
      expect($reader[0].scrollTop, `left reader restores the live preview position; ${scrollDiagnostic($reader[0], trace)}`).to.be.greaterThan(500)
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
    const saved = cy.spy(webOfflineStorageAdapter, 'saveNote').as('saved')
    const saveDiagnostic = () => JSON.stringify({
      releases: releases.length,
      queueWrites: observedQueueWrites,
      saved: saved.getCalls().map(call => ({ noteId: call.args[0]?.id, title: call.args[0]?.title })),
    })

    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('First version')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(releases, `Synthetic save state: ${saveDiagnostic()}`).to.have.length(1))
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Second version')
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    // Typing remains possible while the transition is waiting for storage.
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Latest version')
    cy.then(() => releases[0]())

    cy.wrap(null).should(() => expect(releases, `Synthetic save state: ${saveDiagnostic()}`).to.have.length(2))
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

  it('does not duplicate a manual save during an offline pane transition already waiting for autosave', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const releases: Array<() => Promise<unknown>> = []
    const titles: string[] = []
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second') return original(item)
      const title = item.payload?.title ?? ''
      titles.push(title)
      if (title !== 'Older offline' && title !== 'Manual offline') return original(item)
      if (title === 'Manual offline' && releases.length > 1) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), release => releases.push(release))
    })
    cy.get('[aria-label="Note title"]').clear().type('Older offline')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(releases).to.have.length(1))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[aria-label="Note title"]').clear().type('Manual offline')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => releases[0]())
    cy.wrap(null).should(() => expect(releases).to.have.length(2))
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.then(() => releases[1]())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => waitForOwnerNoteWrites(user.id, 'second'))
    cy.then(() => expect(titles.filter(title => title === 'Manual offline')).to.have.length(1))
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const writes = queue.filter(item => item.noteId === 'second' && item.payload?.title === 'Manual offline')
      expect(writes).to.have.length(1)
    })
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Manual offline')
    })
  })

  it('sends one manual snapshot online during a transition already waiting for autosave', () => {
    const remoteTitles: string[] = []
    cy.intercept('PATCH', 'https://split-notes.invalid/rest/v1/notes*', req => {
      remoteTitles.push(req.body.title)
      req.reply({ statusCode: 200, body: { ...notes[1], ...req.body } })
    })
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const releases: Array<() => Promise<unknown>> = []
    const titles: string[] = []
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second') return original(item)
      const title = item.payload?.title ?? ''
      titles.push(title)
      if (title !== 'Older online' && title !== 'Manual online') return original(item)
      if (title === 'Manual online' && releases.length > 1) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), release => releases.push(release))
    })
    cy.get('[aria-label="Note title"]').clear().type('Older online')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(releases).to.have.length(1))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[aria-label="Note title"]').clear().type('Manual online')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => releases[0]())
    cy.wrap(null).should(() => expect(releases).to.have.length(2))
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.then(() => releases[1]())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => waitForOwnerNoteWrites(user.id, 'second'))
    cy.then(() => expect(titles.filter(title => title === 'Manual online')).to.have.length(1))
    cy.wrap(null).should(() => expect(remoteTitles).to.include('Manual online'))
    cy.then(() => expect(remoteTitles.filter(title => title === 'Manual online')).to.have.length(1))
  })

  it('keeps a reverted draft on the pane after a partial manual queue failure and rewrites it on retry', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    const error = expectedWriteFailure()
    let release: (() => Promise<unknown>) | undefined
    const write = cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.payload?.title === 'Failed manual') return Cypress.Promise.reject(error)
      if (item.noteId === 'second' && !release) return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
      return original(item)
    })
    cy.get('[aria-label="Note title"]').clear().type('Stable offline')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[aria-label="Note title"]').clear().type('Failed manual')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Stable offline')
    cy.then(() => release!())
    cy.wrap(write).should(stub => {
      const calls = (stub as unknown as { getCalls: () => Array<{ args: Array<{ payload?: { title?: string } }> }> }).getCalls()
      expect(calls.some(call => call.args[0].payload?.title === 'Failed manual')).to.equal(true)
    })
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Failed manual')
    })
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.get('[aria-label="Note title"]').should('have.value', 'Stable offline')
    cy.then(() => write.restore())
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Stable offline')
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const writes = queue.filter(item => item.noteId === 'second').sort((a, b) => a.clientUpdatedAt.localeCompare(b.clientUpdatedAt))
      expect(writes[writes.length - 1]?.payload?.title).to.equal('Stable offline')
    })
  })

  it('does not replay a failed older offline write after a newer manual save succeeds', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const titles: string[] = []
    const error = expectedWriteFailure()
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    let release: (() => Promise<unknown>) | undefined
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second') return original(item)
      const title = item.payload?.title ?? ''
      titles.push(title)
      if (title !== 'Older failure' || release) return original(item)
      return holdQueueWrite(item.noteId, () => Cypress.Promise.reject(error), held => { release = held })
    })
    cy.get('[aria-label="Note title"]').clear().type('Older failure')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[aria-label="Note title"]').clear().type('Manual success')
    cy.get('[data-cy="note-save-button"]').click()
    cy.then(() => release!().catch(() => undefined))
    cy.then(() => waitForOwnerNoteWrites(user.id, 'second'))
    cy.get('[data-cy="note-save-button"]').should('be.enabled')
    cy.tick(4000)
    cy.then(() => waitForOwnerNoteWrites(user.id, 'second'))
    cy.then(() => expect(titles.filter(title => title === 'Older failure')).to.have.length(1))
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.title).to.equal('Manual success')
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const writes = queue.filter(item => item.noteId === 'second').sort((a, b) => a.clientUpdatedAt.localeCompare(b.clientUpdatedAt))
      expect(writes[writes.length - 1]?.payload?.title).to.equal('Manual success')
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

  it('persists rapid tag additions and removals made while switching away from a slow offline save', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    const releases: Array<() => Promise<unknown>> = []
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || item.payload?.title !== 'First version') return original(item)
      return holdQueueWrite(item.noteId, () => original(item), release => releases.push(release))
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('First version')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(releases).to.have.length(1))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('first,second{enter}')
    cy.contains('[data-testid="split-pane-right"] [data-cy="interactive-tag"]', 'first').find('button').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('third{enter}')
    cy.tick(300)
    cy.then(() => releases[0]())
    cy.wrap(null).should(() => expect(releases, 'a second durable write for the latest tags').to.have.length(2))
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.then(() => releases[1]())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const writes = queue.filter(item => item.noteId === 'second').sort((a, b) => a.clientUpdatedAt.localeCompare(b.clientUpdatedAt))
      expect(writes[writes.length - 1]?.payload?.tags).to.deep.equal(['third', 'second'])
    })
    cy.get('[data-cy="workspace-tab-close"][aria-label="Close First version"]').click()
    cy.get('[role="alertdialog"]').should('not.exist')
    // A fresh workspace without sessionStorage must recover from the offline cache.
    cy.mount(<></>)
    cy.window().then(win => win.sessionStorage.clear())
    const freshClient = createClient('https://split-notes.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.mount(<SupabaseTestProvider supabase={freshClient} user={user}><TestApp /></SupabaseTestProvider>)
    cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'First version').click()
    cy.get('[data-testid="editor-container"]').should('contain', 'second').and('contain', 'third').and('not.contain', 'first')
    cy.screenshot('tag-after-offline-restart', { capture: 'viewport' })
  })

  it('persists a tag removal that returns the note to its original state while its first save is in flight', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    const releases: Array<() => Promise<unknown>> = []
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || !item.payload?.tags?.includes('temporary')) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), release => releases.push(release))
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('temporary{enter}')
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.wrap(null).should(() => expect(releases).to.have.length(1))
    cy.contains('[data-testid="split-pane-right"] [data-cy="interactive-tag"]', 'temporary').find('button').click()
    cy.then(() => releases[0]())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'second')?.tags).to.deep.equal([])
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const writes = queue.filter(item => item.noteId === 'second').sort((a, b) => a.clientUpdatedAt.localeCompare(b.clientUpdatedAt))
      expect(writes[writes.length - 1]?.payload?.tags).to.deep.equal([])
    })
  })

  it('keeps the late tag and stays on the pane when the follow-up queue write fails', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    let release: (() => Promise<unknown>) | undefined
    const error = expectedWriteFailure()
    const stub = cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.payload?.tags?.includes('late-tag')) return Cypress.Promise.reject(error)
      if (item.noteId === 'second') return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
      return original(item)
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('First version')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('late-tag{enter}')
    cy.then(() => release!())
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [data-cy="interactive-tag"]').should('contain', 'late-tag')
    cy.get('[aria-label="Storage unavailable"]').should('exist')
    cy.then(() => stub.restore())
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.tags?.includes('late-tag'))).to.equal(true)
    })
  })

  it('sends a late tag to the server after an online slow save and pane switch', () => {
    const remoteWrites: string[][] = []
    cy.intercept('PATCH', 'https://split-notes.invalid/rest/v1/notes*', req => {
      remoteWrites.push(req.body.tags ?? [])
      req.reply({ statusCode: 200, body: { ...notes[1], ...req.body } })
    })
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    let release: (() => Promise<unknown>) | undefined
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || release) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('First version')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('online-tag{enter}')
    cy.then(() => release!())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.wrap(null).should(() => expect(remoteWrites.some(tags => tags.includes('online-tag')), JSON.stringify(remoteWrites)).to.equal(true))
  })

  it('retains a late tag in the durable queue when the server refuses synchronization', () => {
    const remoteWrites: string[][] = []
    cy.intercept('PATCH', 'https://split-notes.invalid/rest/v1/notes*', req => {
      remoteWrites.push(req.body.tags ?? [])
      req.reply({ statusCode: 503, body: { message: 'Synthetic server failure' } })
    })
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    let release: (() => Promise<unknown>) | undefined
    let latestWriteId: string | undefined
    const markStatus = cy.spy(webOfflineStorageAdapter, 'markQueueItemStatus')
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.payload?.tags?.includes('offline-safe')) latestWriteId = item.id
      if (item.noteId !== 'second' || release) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('First version')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('offline-safe{enter}')
    cy.then(() => release!())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.wrap(null).should(() => expect(remoteWrites.some(tags => tags.includes('offline-safe')), JSON.stringify(remoteWrites)).to.equal(true))
    cy.wrap(null).should(() => {
      expect(latestWriteId).to.be.a('string')
      expect(markStatus).to.have.been.calledWith(latestWriteId, 'failed')
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.id === latestWriteId && item.payload?.tags?.includes('offline-safe') && item.status === 'failed'), JSON.stringify(queue)).to.equal(true)
    })
  })

  it('locks editing during a slow Read and preserves the tags when returning to edit', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || release) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('before,after{enter}')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').should('be.disabled')
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').closest('[inert]').should('exist')
    cy.get('[data-testid="split-pane-right"] .mobile-editor-toolbar').should('have.attr', 'inert')
    cy.contains('[data-testid="split-pane-right"] [role="status"]', 'Saving...').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').then($button => {
      $button[0].focus()
      expect($button[0].ownerDocument.activeElement).not.to.equal($button[0])
    })
    cy.then(() => release!())
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'after').and('contain', 'before')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const writes = queue.filter(item => item.noteId === 'second').sort((a, b) => a.clientUpdatedAt.localeCompare(b.clientUpdatedAt))
      expect(writes[writes.length - 1]?.payload?.tags).to.deep.equal(['after', 'before'])
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="interactive-tag"]').should('contain', 'after').and('contain', 'before')
  })

  it('keeps the editor and lets Read retry when a durable save fails', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    const failedWrite = cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').rejects(expectedWriteFailure())
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('keep-me{enter}')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.get('[aria-label="Storage unavailable"]').should('exist')
    cy.get('[data-testid="split-pane-right"] [data-cy="interactive-tag"]').should('contain', 'keep-me')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').should('not.be.disabled')
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').closest('[inert]').should('not.exist')
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('retry-tag{enter}')
    cy.then(() => failedWrite.restore())
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'keep-me')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.tags?.includes('keep-me') && item.payload?.tags?.includes('retry-tag'))).to.equal(true)
    })
  })

  it('locks the body during a slow Read and preserves text after returning to edit', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    let release: (() => Promise<unknown>) | undefined
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || release) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Before read')
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"] .ProseMirror').type('{end} recent body')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"]').closest('[inert]').should('exist')
    cy.then(() => release!())
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'recent body')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      const writes = queue.filter(item => item.noteId === 'second').sort((a, b) => a.clientUpdatedAt.localeCompare(b.clientUpdatedAt))
      expect(writes[writes.length - 1]?.payload?.description).to.include('recent body')
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"]').should('contain', 'recent body')
  })

  it('keeps the editor locked while Read waits for another write and permits editing after returning', () => {
    let afterFirstWrite = false
    let readCallbackWaiting = false
    observeWorkspaceCommit = controller => {
      if (afterFirstWrite && controller.activeTab.saveState === 'saving' && !controller.autoSaving) readCallbackWaiting = true
    }
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    let firstRelease: (() => Promise<unknown>) | undefined
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || firstRelease) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), held => { firstRelease = held })
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('before{enter}')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.wrap(null).should(() => expect(firstRelease).to.be.a('function'))
    let externalStarted = false
    let externalRelease: (() => Promise<void>) | undefined
    cy.then(() => {
      const snapshot = { id: 'second', user_id: user.id, title: 'Second note', description: '<p>Second note body</p>', tags: ['before'], updatedAt: '2026-10-29T00:00:00Z', status: 'pending' as const }
      let resolve!: () => void
      const gate = new Promise<void>(done => { resolve = done })
      const pending = enqueueOwnerNoteWrite(user.id, 'second', snapshot, async () => { externalStarted = true; await gate; return snapshot })
      externalRelease = async () => { resolve(); await pending }
      heldWrites.push({ noteId: 'second', release: externalRelease })
    })
    cy.then(async () => { await firstRelease!(); afterFirstWrite = true })
    cy.wrap(null).should(() => expect(externalStarted).to.equal(true))
    cy.wrap(null).should(() => expect(readCallbackWaiting, 'Read is waiting for the concurrent write').to.equal(true))
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').closest('[inert]').should('exist')
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').then($button => {
      $button[0].focus()
      expect($button[0].ownerDocument.activeElement).not.to.equal($button[0])
    })
    cy.contains('[data-testid="split-pane-right"] [role="status"]', 'Saving...').should('be.visible')
    cy.then(() => externalRelease!())
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').closest('[inert]').should('not.exist')
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('after{enter}')
    cy.get('[data-testid="split-pane-right"] [data-cy="interactive-tag"]').should('contain', 'after').and('contain', 'before')
  })

  it('locks the mobile editor and formatting toolbar while Read is saving', () => {
    openTwoNotes()
    cy.viewport(390, 844)
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    const original = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    let release: (() => Promise<unknown>) | undefined
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || release) return original(item)
      return holdQueueWrite(item.noteId, () => original(item), held => { release = held })
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('mobile-before{enter}')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.wrap(null).should(() => expect(release).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] .mobile-editor-toolbar').should('have.attr', 'inert')
    cy.get('[data-testid="split-pane-right"] .mobile-editor-toolbar').should($toolbar => {
      const toolbar = $toolbar[0]
      expect(toolbar.getBoundingClientRect().height).to.be.greaterThan(0)
      expect(toolbar.ownerDocument.defaultView?.getComputedStyle(toolbar).display).not.to.equal('none')
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"]').closest('[inert]').should('exist')
    cy.contains('[data-testid="split-pane-right"] [role="status"]', 'Saving...').should('be.visible')
    cy.then(() => release!())
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'mobile-before')
  })

  it('waits for a selected image before switching to Read and saves it offline', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    let releaseRead: (() => void) | undefined
    cy.window().then(win => {
      const original = win.FileReader.prototype.readAsDataURL
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader, blob: Blob) {
        releaseRead = () => original.call(this, blob)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
      fileName: 'synthetic.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(releaseRead).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.contains('[data-testid="split-pane-right"] [role="status"]', 'Adding image...').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"]').closest('[inert]').should('exist')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('not.exist')
    cy.then(() => releaseRead!())
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"] img').should('have.attr', 'src').and('include', 'data:image/png;base64,')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.description?.includes('data:image/png;base64,'))).to.equal(true)
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"] img').should('exist')
  })

  it('waits for a selected image before activating the other pane', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    let releaseRead: (() => void) | undefined
    cy.window().then(win => {
      const original = win.FileReader.prototype.readAsDataURL
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader, blob: Blob) {
        releaseRead = () => original.call(this, blob)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
      fileName: 'synthetic.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(releaseRead).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.contains('[data-testid="split-pane-right"] [role="status"]', 'Adding image...').should('be.visible')
    cy.then(() => releaseRead!())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-right"] img').should('have.attr', 'src').and('include', 'data:image/png;base64,')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.description?.includes('data:image/png;base64,'))).to.equal(true)
    })
  })

  it('keeps editing available if a selected image fails while Read is pending', () => {
    cy.stub(toast, 'error').as('imageError')
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    let releaseRead: (() => void) | undefined
    cy.window().then(win => {
      const original = win.FileReader.prototype.readAsDataURL
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader, blob: Blob) {
        releaseRead = () => original.call(this, blob)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('not a PNG'), fileName: 'broken.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(releaseRead).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.contains('[data-testid="split-pane-right"] [role="status"]', 'Adding image...').should('be.visible')
    cy.then(() => releaseRead!())
    cy.get('@imageError').should('have.been.calledWith', 'Could not read the image')
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"]').closest('[inert]').should('not.exist')
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"] .ProseMirror').focus().type('{end} retry text').should('contain', 'retry text')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').should('be.enabled').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'retry text')
  })

  it('waits for an image started while a pane switch is already saving', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    const originalWrite = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    let releaseWrite: (() => Promise<unknown>) | undefined
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || releaseWrite) return originalWrite(item)
      return holdQueueWrite(item.noteId, () => originalWrite(item), release => { releaseWrite = release })
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Before image')
    cy.tick(4000)
    cy.wrap(null).should(() => expect(releaseWrite).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    let releaseRead: (() => void) | undefined
    cy.window().then(win => {
      const originalRead = win.FileReader.prototype.readAsDataURL
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader, blob: Blob) {
        releaseRead = () => originalRead.call(this, blob)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
      fileName: 'synthetic.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(releaseRead).to.be.a('function'))
    cy.then(() => releaseWrite!())
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.contains('[data-testid="split-pane-right"] [role="status"]', 'Adding image...').should('be.visible')
    cy.then(() => releaseRead!())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-right"] img').should('exist')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.description?.includes('data:image/png;base64,'))).to.equal(true)
    })
  })

  it('aborts a pane switch after an image error and allows retry', () => {
    cy.stub(toast, 'error').as('imageError')
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    let releaseRead: (() => void) | undefined
    cy.window().then(win => {
      const original = win.FileReader.prototype.readAsDataURL
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader, blob: Blob) {
        releaseRead = () => original.call(this, blob)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('not a PNG'), fileName: 'broken.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(releaseRead).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.then(() => releaseRead!())
    cy.get('@imageError').should('have.been.calledWith', 'Could not read the image')
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').should('be.enabled')
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
  })

  it('does not let a simultaneous Read bypass an image save during pane activation', () => {
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    const originalWrite = webOfflineStorageAdapter.upsertQueueItem.bind(webOfflineStorageAdapter)
    let releaseWrite: (() => Promise<unknown>) | undefined
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').callsFake(item => {
      if (item.noteId !== 'second' || releaseWrite) return originalWrite(item)
      return holdQueueWrite(item.noteId, () => originalWrite(item), release => { releaseWrite = release })
    })
    let releaseRead: (() => void) | undefined
    cy.window().then(win => {
      const originalRead = win.FileReader.prototype.readAsDataURL
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader, blob: Blob) {
        releaseRead = () => originalRead.call(this, blob)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
      fileName: 'synthetic.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(releaseRead).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.then(() => releaseRead!())
    cy.wrap(null).should(() => expect(releaseWrite, 'the image must enter the durable queue').to.be.a('function'))
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.then(() => releaseWrite!())
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.get('[data-testid="split-pane-right"] img').should('exist')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.description?.includes('data:image/png;base64,'))).to.equal(true)
    })
  })

  it('warns before unload for an in-flight image and cancels it on unmount', () => {
    openTwoNotes()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    const readers: FileReader[] = []
    cy.window().then(win => {
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader) {
        readers.push(this)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+jRZkAAAAASUVORK5CYII=', 'base64'),
      fileName: 'synthetic.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(readers).to.have.length(1))
    cy.window().then(win => {
      const event = new win.Event('beforeunload', { cancelable: true })
      win.dispatchEvent(event)
      expect(event.defaultPrevented).to.equal(true)
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.contains('[data-testid="split-pane-right"] [role="status"]', 'Adding image...').should('be.visible')
    cy.mount(<></>)
    cy.then(() => {
      expect(readers[0].onload).to.equal(null)
      expect(readers[0].onerror).to.equal(null)
      expect(readers[0].onabort).to.equal(null)
    })
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.description?.includes('data:image/png;base64,'))).to.equal(false)
    })
  })

  it('keeps pending body autosave and dirty state after an image error interrupts Read', () => {
    let saveState: string | undefined
    observeWorkspaceCommit = controller => { saveState = controller.activeTab.saveState }
    cy.stub(toast, 'error').as('imageError')
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.spy(webOfflineStorageAdapter, 'upsertQueueItem').as('queuedWrite')
    cy.get('[data-testid="split-pane-right"] [data-cy="editor-content"] .ProseMirror').type('{end} pending text')
    let releaseRead: (() => void) | undefined
    cy.window().then(win => {
      const original = win.FileReader.prototype.readAsDataURL
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader, blob: Blob) {
        releaseRead = () => original.call(this, blob)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('not a PNG'), fileName: 'broken.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(releaseRead).to.be.a('function'))
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.then(() => releaseRead!())
    cy.get('@imageError').should('have.been.calledWith', 'Could not read the image')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').should('be.enabled')
    cy.wrap(null).should(() => expect(saveState).to.equal('dirty'))
    cy.tick(4000)
    cy.get('@queuedWrite').should('have.been.called')
    cy.then(() => waitForOwnerNoteWrites(user.id, 'second'))
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.description?.includes('pending text'))).to.equal(true)
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'pending text')
  })

  it('keeps a tag-only draft dirty after an image error without starting autosave', () => {
    let saveState: string | undefined
    observeWorkspaceCommit = controller => { saveState = controller.activeTab.saveState }
    cy.stub(toast, 'error').as('imageError')
    openTwoNotes()
    cy.window().then(win => {
      Object.defineProperty(win.navigator, 'onLine', { configurable: true, get: () => false })
      win.dispatchEvent(new Event('offline'))
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tag"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Add tags"]').type('pending-tag{enter}')
    let releaseRead: (() => void) | undefined
    cy.window().then(win => {
      const original = win.FileReader.prototype.readAsDataURL
      cy.stub(win.FileReader.prototype, 'readAsDataURL').callsFake(function (this: FileReader, blob: Blob) {
        releaseRead = () => original.call(this, blob)
      })
    })
    cy.get('[data-testid="split-pane-right"] [data-cy="image-file-input"]').selectFile({
      contents: Cypress.Buffer.from('not a PNG'), fileName: 'broken.png', mimeType: 'image/png',
    }, { force: true })
    cy.wrap(null).should(() => expect(releaseRead).to.be.a('function'))
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.then(() => releaseRead!())
    cy.get('@imageError').should('have.been.calledWith', 'Could not read the image')
    cy.get('[data-testid="split-pane-right"]').contains('Active').should('be.visible')
    cy.wrap(null).should(() => expect(saveState).to.equal('dirty'))
    cy.tick(4000)
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.tags?.includes('pending-tag'))).to.equal(false)
    })
    cy.get('[data-testid="split-pane-left"] button').contains('Activate').click()
    cy.get('[data-testid="split-pane-left"]').contains('Active').should('be.visible')
    cy.then(() => webOfflineStorageAdapter.getQueue()).should(queue => {
      expect(queue.some(item => item.noteId === 'second' && item.payload?.tags?.includes('pending-tag'))).to.equal(true)
    })
  })
})
