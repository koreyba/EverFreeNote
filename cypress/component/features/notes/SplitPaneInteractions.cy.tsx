import React from 'react'
import { createClient, type User } from '@supabase/supabase-js'
import '../../../../app/globals.css'
import { NotesShell } from '@ui/web/components/features/notes/NotesShell'
import { useNoteAppController } from '@ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '@ui/web/providers/SupabaseProvider'
import { SPLIT_VIEW_ENABLED_KEY, SplitViewPreferenceProvider } from '@ui/web/providers/SplitViewPreferenceProvider'
import { webOfflineStorageAdapter } from '@ui/web/adapters/offlineStorage'
import { getPendingOwnerNotes, waitForOwnerNoteWrites } from '@ui/web/lib/ownerNoteWrites'
import { NoteCard } from '@ui/web/components/features/notes/NoteCard'
import { NoteSearchItem } from '@ui/web/components/features/search/NoteSearchItem'
import { ChunkSearchItem } from '@ui/web/components/features/search/ChunkSearchItem'
import { NoteDragProvider } from '@ui/web/providers/NoteDragProvider'
import type { RagChunk } from '@core/types/ragSearch'
import { NOTE_WORKSPACE_STORAGE_KEY } from '@ui/web/lib/noteWorkspaceStorage'

const user = { id: 'pane-interactions-user', email: 'panes@example.invalid' } as User
const notes = [
  { id: 'left-note', title: 'Left document', description: '<p>Left document body</p>', tags: ['left'], user_id: user.id, created_at: '2026-11-03T10:00:00Z', updated_at: '2026-11-03T10:00:00Z' },
  { id: 'right-note', title: 'Right document', description: '<p>Right document body</p>', tags: ['right'], user_id: user.id, created_at: '2026-11-03T09:00:00Z', updated_at: '2026-11-03T09:00:00Z' },
  { id: 'dropped-note', title: 'Dropped document', description: '<p>Dropped document body</p>', tags: [], user_id: user.id, created_at: '2026-11-03T08:00:00Z', updated_at: '2026-11-03T08:00:00Z' },
]

function TestApp() {
  const controller = useNoteAppController()
  const [searchSources, setSearchSources] = React.useState(false)
  const chunk: RagChunk = { noteId: notes[2].id, noteTitle: notes[2].title, noteTags: [], chunkIndex: 0, charOffset: 0, bodyContent: 'Dropped document body', overlapPrefix: '', content: 'Dropped document body', similarity: 0.9 }
  return <>
    <SplitViewPreferenceProvider><NotesShell controller={controller} /></SplitViewPreferenceProvider>
    <button style={{ position: 'fixed', bottom: 0, right: 0, zIndex: 100 }} onClick={() => setSearchSources(true)}>Show search drag sources</button>
    {searchSources && <NoteDragProvider ownerId={user.id} enabled>
      <aside style={{ position: 'fixed', bottom: 30, left: 80, width: 300, zIndex: 100, background: 'var(--color-card)' }}>
        <div data-testid="regular-search-drag"><NoteCard note={notes[2]} variant="search" onClick={() => {}} /></div>
        <div data-testid="ai-note-drag"><NoteSearchItem group={{ noteId: chunk.noteId, noteTitle: chunk.noteTitle, noteTags: [], topScore: 0.9, chunks: [chunk], hiddenCount: 0 }} onOpenInContext={() => {}} /></div>
        <div data-testid="ai-chunk-drag"><ChunkSearchItem chunk={chunk} onOpenInContext={() => {}} /></div>
      </aside>
    </NoteDragProvider>}
  </>
}

const openSplit = () => {
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Left document').click()
  cy.get('[data-testid="editor-container"]').should('contain', 'Left document body')
  cy.get('[data-cy="workspace-split-button"]').click()
  cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"] button', 'Right document').click()
  cy.get('[data-testid="split-pane-right"]').should('contain', 'Right document body')
}

const dragSearchResult = (source: string, side: 'left' | 'right') => {
  cy.contains('button', 'Show search drag sources').click()
  cy.window().then(win => {
    const dataTransfer = new win.DataTransfer()
    cy.get(source).should('have.attr', 'draggable', 'true').trigger('dragstart', { dataTransfer })
    cy.get(`[data-testid="split-pane-${side}"]`).trigger('drop', { dataTransfer })
  })
}

const reorderTab = (title: string, target: string, side: 'before' | 'after') => {
  cy.window().then(win => {
    const dataTransfer = new win.DataTransfer()
    cy.contains('[data-cy="workspace-tab"]', title).closest('[data-tab-id]')
      .should('have.attr', 'draggable', 'true').trigger('dragstart', { dataTransfer })
    cy.contains('[data-cy="workspace-tab"]', target).closest('[data-tab-id]').then($target => {
      const bounds = $target[0].getBoundingClientRect()
      const clientX = side === 'before' ? bounds.left + 8 : bounds.right - 8
      cy.get('[aria-label="Open notes"]').trigger('dragover', { dataTransfer, clientX })
        .trigger('drop', { dataTransfer, clientX }).trigger('dragend', { dataTransfer })
    })
  })
}

const expectTabOrder = (titles: string[]) => {
  cy.get('[data-tab-id] [data-cy="workspace-tab"]').should($tabs => {
    expect(Array.from($tabs, tab => tab.getAttribute('title'))).to.deep.equal(titles)
  })
}

describe('Split pane interactions', { retries: 0 }, () => {
  let expectedWriteErrors: Set<unknown>
  beforeEach(() => {
    expectedWriteErrors = new Set()
    cy.viewport(1440, 900)
    cy.clearLocalStorage()
    cy.window().then(win => {
      win.sessionStorage.clear()
      win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'true')
    })
    cy.then(() => webOfflineStorageAdapter.clearAll())
    const client = createClient('https://pane-interactions.invalid', 'test-public-key', {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    })
    cy.intercept('https://pane-interactions.invalid/**', req => {
      if (req.url.includes('/rest/v1/notes')) {
        const single = String(req.headers.accept).includes('application/vnd.pgrst.object')
        const id = new URL(req.url).searchParams.get('id')
        const selected = notes.find(note => id === `eq.${note.id}`) ?? notes[0]
        req.reply({ body: single ? selected : id ? [selected] : notes, headers: { 'content-range': `0-${notes.length - 1}/${notes.length}`, 'access-control-expose-headers': 'content-range' } })
      } else req.reply({ body: [] })
    })
    cy.mount(<SupabaseTestProvider supabase={client} user={user}><TestApp /></SupabaseTestProvider>)
  })

  afterEach(() => {
    cy.mount(<></>)
    cy.then(async () => {
      const writes = await Promise.allSettled(getPendingOwnerNotes(user.id).map(note => waitForOwnerNoteWrites(user.id, note.id)))
      await webOfflineStorageAdapter.clearAll()
      const unexpected = writes.find(result => result.status === 'rejected' && !expectedWriteErrors.has(result.reason))
      if (unexpected?.status === 'rejected') throw unexpected.reason
    })
  })

  it('reorders single-view tabs without replacing the active editor and persists their order', () => {
    cy.contains('[data-testid="note-card"] button', 'Left document').click()
    cy.get('[data-testid="editor-container"]').should('contain', 'Left document body')
    cy.get('[data-cy="add-tab-button"]').click()
    cy.contains('[data-testid="note-card"] button', 'Right document').click()
    cy.get('[data-testid="editor-container"]').should('contain', 'Right document body')
    cy.get('[data-cy="add-tab-button"]').click()
    cy.contains('[data-testid="note-card"] button', 'Dropped document').click()
    cy.get('[data-testid="editor-container"]').should('contain', 'Dropped document body')
    cy.get('[data-cy="note-edit-button"]').click()
    cy.get('[aria-label="Note title"]').clear().type('Active draft')
    let editor: HTMLElement
    cy.get('[aria-label="Note title"]').then($title => { editor = $title[0] })
    reorderTab('Active draft', 'Left document', 'before')
    expectTabOrder(['Active draft', 'Left document', 'Right document'])
    cy.get('[aria-label="Note title"]').should('have.value', 'Active draft').and($title => { expect($title[0]).to.equal(editor) })
    cy.get('[data-cy="workspace-tab"][aria-pressed="true"]').should('have.attr', 'title', 'Active draft')
    let orderedIds: (string | null)[]
    cy.get('[data-tab-id]').then($tabs => { orderedIds = Array.from($tabs, tab => tab.getAttribute('data-tab-id')) })
    cy.window().should(win => {
      const snapshot = JSON.parse(win.sessionStorage.getItem(NOTE_WORKSPACE_STORAGE_KEY) ?? '{}')
      expect(snapshot.tabs.map((tab: { id: string }) => tab.id)).to.deep.equal(orderedIds)
    })
  })

  it('reorders split tabs without moving either note out of its pane', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').type(' draft')
    let editor: HTMLElement
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').then($title => { editor = $title[0] })
    reorderTab('Right document', 'Left document draft', 'before')
    expectTabOrder(['Right document', 'Left document draft'])
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should('have.value', 'Left document draft').and($title => { expect($title[0]).to.equal(editor) })
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Right document body')
    cy.get('[data-testid="split-pane-left"]').should('have.attr', 'data-active-pane', 'true')
  })

  it('allows ordering with split disabled and reflects the order in the mobile tab menu', () => {
    openSplit()
    cy.window().then(win => {
      win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'false')
      win.dispatchEvent(new win.StorageEvent('storage', { key: SPLIT_VIEW_ENABLED_KEY, newValue: 'false', storageArea: win.localStorage }))
    })
    cy.get('[data-cy="workspace-split-button"]').should('not.exist')
    reorderTab('Right document', 'Left document', 'before')
    expectTabOrder(['Right document', 'Left document'])
    cy.get('[data-testid="note-card"]').first().should('have.attr', 'draggable', 'false')
    cy.viewport(390, 844)
    cy.get('[data-cy="mobile-tabs-toggle"]').click()
    cy.get('[data-cy="mobile-workspace-tab"]').should($tabs => {
      expect(Array.from($tabs, tab => tab.getAttribute('title'))).to.deep.equal(['Right document', 'Left document'])
    })
  })

  it('shows the complete reading tools in both panes without an activation step', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-left"] [data-cy="note-copy-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-left"] [data-cy="note-delete-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.contains('button', 'Activate').should('not.exist')
    cy.screenshot('split-pane-tools', { capture: 'viewport' })
  })

  it('shows the timestamps belonging to each split note', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] button[aria-label="Note details"]').click()
    cy.get('[role="dialog"][aria-label="Note details"] time').first().should('have.attr', 'datetime', notes[0].created_at)
    cy.get('[aria-label="Close note details"]').click()
    cy.get('[data-testid="split-pane-right"] button[aria-label="Note details"]').click()
    cy.get('[role="dialog"][aria-label="Note details"] time').first().should('have.attr', 'datetime', notes[1].created_at)
    cy.get('[role="dialog"][aria-label="Note details"] time').last().should('have.attr', 'datetime', notes[1].updated_at)
  })

  it('edits the other note directly and retains the neighboring document', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should('have.value', 'Left document')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Right document body')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-copy-button"]').should('be.visible')
  })

  it('uses the last clicked pane for the shared New Note action and names its destination', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"]').contains('Left document body').click()
    cy.get('[data-testid="split-pane-left"]').should('have.attr', 'data-active-pane', 'true')
    cy.contains('[data-testid="sidebar-container"]', 'Opens in left pane').should('be.visible')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should('have.value', '')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Right document body')
  })

  it('keeps split free of extra creation rows and creates notes through the shared action', () => {
    openSplit()
    cy.get('[data-pane-heading]').should('not.exist')
    cy.get('[data-pane-create]').should('not.exist')
    cy.get('[data-testid="split-pane-right"]').contains('Right document body').click()
    cy.contains('[data-testid="sidebar-container"]', 'Opens in right pane').should('be.visible')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', '')
    cy.get('[data-testid="split-pane-left"]').should('contain', 'Left document body')
  })

  it('keeps both editors open and saves each draft to its own note', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').clear().type('Left draft')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Right draft')
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should('be.visible').and('have.value', 'Left draft')
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').type(' updated')
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Right draft')
    cy.get('[data-testid="split-pane-left"] [data-cy="note-save-button"]').click().should('not.be.disabled')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-save-button"]').click().should('not.be.disabled')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'left-note')?.title).to.equal('Left draft updated')
      expect(cached.find(note => note.id === 'right-note')?.title).to.equal('Right draft')
    })
  })

  it('keeps each pane in its chosen reading or editing mode when focus changes', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"]').contains('Right document body').click()
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-read-button"]').click()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('be.visible')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-read-button"]').click()
    cy.get('[data-cy="note-edit-button"]').should('have.length', 2)
  })

  it('retains both editor instances when split preference is temporarily disabled', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    let leftEditor: HTMLElement
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').then($title => { leftEditor = $title[0] })
    cy.window().then(win => {
      win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'false')
      win.dispatchEvent(new win.StorageEvent('storage', { key: SPLIT_VIEW_ENABLED_KEY, newValue: 'false', storageArea: win.localStorage }))
    })
    cy.get('[data-testid="split-pane-left"]').should('not.exist')
    cy.then(() => { expect(leftEditor.isConnected, 'the hidden editor remains mounted').to.equal(true) })
    cy.window().then(win => {
      win.localStorage.setItem(SPLIT_VIEW_ENABLED_KEY, 'true')
      win.dispatchEvent(new win.StorageEvent('storage', { key: SPLIT_VIEW_ENABLED_KEY, newValue: 'true', storageArea: win.localStorage }))
    })
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should($title => { expect($title[0]).to.equal(leftEditor) })
  })

  for (const width of [320, 390]) {
    it(`keeps one usable mobile editor at ${width}px and restores both desktop drafts`, () => {
      openSplit()
      cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
      cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').clear().type('Left mobile draft')
      cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
      cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Right mobile draft')
      let leftEditor: HTMLElement
      let rightEditor: HTMLElement
      cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').then($title => { leftEditor = $title[0] })
      cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').then($title => { rightEditor = $title[0] })

      cy.viewport(width, 844)
      cy.get('[data-testid="split-pane-left"]').should('not.be.visible')
      cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('be.visible').and('have.value', 'Right mobile draft')
      cy.get('[data-cy="workspace-split-button"]').should('not.be.visible')
      cy.get('[contenteditable="true"]:visible').should('have.length', 1)
      cy.document().should(doc => {
        expect(doc.documentElement.scrollWidth, 'mobile page has no horizontal overflow').to.be.at.most(width + 1)
      })
      cy.get('[data-cy="mobile-tabs-toggle"]').click()
      cy.contains('[data-cy="mobile-workspace-tab"]', 'Left mobile draft').click()
      cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should('be.visible').and('have.value', 'Left mobile draft')
      cy.get('[data-testid="split-pane-right"]').should('not.be.visible')
      cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').type(' updated')
      cy.viewport(width, 450)
      cy.get('[data-testid="split-pane-left"] [contenteditable="true"]').should('be.visible')
      cy.get('[data-testid="split-pane-left"] [data-cy="note-save-button"]').should('be.visible').click().should('not.be.disabled')

      cy.viewport(1440, 900)
      cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should('be.visible').and('have.value', 'Left mobile draft updated').and($title => { expect($title[0]).to.equal(leftEditor) })
      cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('be.visible').and('have.value', 'Right mobile draft').and($title => { expect($title[0]).to.equal(rightEditor) })
      cy.get('[contenteditable="true"]:visible').should('have.length', 2)
      cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
        expect(cached.find(note => note.id === 'left-note')?.title).to.equal('Left mobile draft updated')
        expect(cached.find(note => note.id === 'right-note')?.title).to.equal('Right mobile draft')
      })
    })
  }

  it('flushes both live editors before closing split and restores their modes on reopening', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').clear().type('Left before closing')
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Right before closing')
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[data-testid="split-pane-left"]').should('not.exist')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'left-note')?.title).to.equal('Left before closing')
      expect(cached.find(note => note.id === 'right-note')?.title).to.equal('Right before closing')
    })
    cy.get('[data-cy="workspace-split-button"]').click()
    cy.get('[aria-label="Note title"]').should('have.length', 2)
  })

  it('drops a note from the list into the exact pane and retains the displaced tab', () => {
    openSplit()
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"]', 'Dropped document')
        .should('have.attr', 'draggable', 'true').trigger('dragstart', { dataTransfer })
      cy.get('[data-testid="split-pane-left"]').trigger('dragover', { dataTransfer })
        .should('have.attr', 'data-drop-target', 'true').trigger('drop', { dataTransfer })
    })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'Dropped document body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Right document body')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 3)
  })

  it('moves a visible tab to the opposite pane by swapping panes without duplicating notes', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    let originalLeftEditor: HTMLElement
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').then($title => { originalLeftEditor = $title[0] })
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      cy.contains('[data-cy="workspace-tab"]', 'Left document').closest('[data-tab-id]')
        .should('have.attr', 'draggable', 'true').trigger('dragstart', { dataTransfer })
      cy.get('[data-testid="split-pane-right"]').trigger('drop', { dataTransfer })
    })
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Left document').and($title => {
      expect($title[0], 'dragging moves the existing editor without remounting').to.equal(originalLeftEditor)
    })
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').should('have.value', 'Right document')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
  })

  it('drops a regular search result into the chosen right pane', () => {
    openSplit()
    dragSearchResult('[data-testid="regular-search-drag"] [data-testid="note-card"]', 'right')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Dropped document body')
    cy.get('[data-testid="split-pane-left"]').should('contain', 'Left document body')
  })

  it('drops an AI note result into the chosen left pane', () => {
    openSplit()
    dragSearchResult('[data-testid="ai-note-drag"] > article', 'left')
    cy.get('[data-testid="split-pane-left"]').should('contain', 'Dropped document body')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Right document body')
  })

  it('drops an AI fragment result by opening its owning note', () => {
    openSplit()
    dragSearchResult('[data-testid="ai-chunk-drag"] > [role="listitem"]', 'right')
    cy.get('[data-testid="split-pane-right"]').should('contain', 'Dropped document body')
    cy.get('[data-testid="split-pane-left"]').should('contain', 'Left document body')
  })

  it('rejects a drag payload from a different account', () => {
    openSplit()
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      dataTransfer.setData('application/x-everfreenote-note', JSON.stringify({ version: 1, ownerId: 'other-owner', noteId: 'dropped-note' }))
      cy.get('[data-testid="split-pane-left"]').trigger('drop', { dataTransfer })
    })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'Left document body')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
  })

  it('keeps both panes and the live draft when a drop cannot save the outgoing editor', () => {
    openSplit()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    const error = new Error('Drop save blocked')
    expectedWriteErrors.add(error)
    cy.stub(webOfflineStorageAdapter, 'upsertQueueItem').rejects(error)
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').clear().type('Keep this draft')
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      cy.contains('[data-testid="sidebar-container"] [data-testid="note-card"]', 'Dropped document').trigger('dragstart', { dataTransfer })
      cy.get('[data-testid="split-pane-left"]').trigger('drop', { dataTransfer })
    })
    cy.get('[aria-label="Drop save blocked"]').should('exist')
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').should('have.value', 'Keep this draft')
    cy.get('[data-testid="split-pane-left"]').should('contain', 'Left document body')
    cy.get('[data-tab-id] [data-cy="workspace-tab"]').should('have.length', 2)
  })

  it('leaves ordinary text drops available to the note surface', () => {
    openSplit()
    cy.window().then(win => {
      const dataTransfer = new win.DataTransfer()
      dataTransfer.setData('text/plain', 'External text')
      const drop = new win.DragEvent('drop', { dataTransfer, bubbles: true, cancelable: true })
      cy.get('[data-testid="split-pane-left"]').then($pane => {
        $pane[0].dispatchEvent(drop)
        expect(drop.defaultPrevented, 'workspace navigation does not intercept text drops').to.equal(false)
      })
    })
    cy.get('[data-testid="split-pane-left"]').should('contain', 'Left document body')
  })

  it('edits and saves both rich text bodies independently', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-right"] [data-cy="note-edit-button"]').click()
    cy.get('[data-testid="split-pane-left"] .ProseMirror').clear().type('Only the left body')
    cy.get('[data-testid="split-pane-right"] .ProseMirror').clear().type('Only the right body')
    cy.get('[data-testid="split-pane-left"] [data-cy="note-save-button"]').click().should('not.be.disabled')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-save-button"]').click().should('not.be.disabled')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      expect(cached.find(note => note.id === 'left-note')?.description).to.contain('Only the left body')
      expect(cached.find(note => note.id === 'right-note')?.description).to.contain('Only the right body')
    })
  })

  it('keeps the identities of new notes created in separate panes distinct', () => {
    openSplit()
    cy.get('[data-testid="split-pane-left"]').click('topLeft')
    cy.get('[data-testid="split-pane-left"]').should('have.attr', 'data-active-pane', 'true')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.get('[data-testid="split-pane-left"] [aria-label="Note title"]').type('New left note')
    cy.get('[data-testid="split-pane-right"]').click('topLeft')
    cy.get('[data-testid="split-pane-right"]').should('have.attr', 'data-active-pane', 'true')
    cy.contains('[data-testid="sidebar-container"] button', 'New Note').click()
    cy.get('[data-testid="split-pane-right"] [aria-label="Note title"]').type('New right note')
    cy.get('[data-testid="split-pane-right"] [data-cy="note-save-button"]').click().should('not.be.disabled')
    cy.get('[data-testid="split-pane-left"] [data-cy="note-save-button"]').click().should('not.be.disabled')
    cy.then(() => webOfflineStorageAdapter.loadNotes()).should(cached => {
      const left = cached.find(note => note.title === 'New left note')
      const right = cached.find(note => note.title === 'New right note')
      expect(left?.id, 'left note has its own ID').to.be.a('string')
      expect(right?.id, 'right note has its own ID').to.be.a('string')
      expect(left?.id).not.to.equal(right?.id)
    })
  })
})
