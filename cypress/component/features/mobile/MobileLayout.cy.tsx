import React from 'react'
import { Capacitor } from '@capacitor/core'
import { dispatchAppBack } from '@ui/web/lib/appBack'
import '../../../../app/globals.css'
import { NotesShell } from '../../../../ui/web/components/features/notes/NotesShell'
import { MobileNotesTabMenu } from '@ui/web/components/features/notes/MobileNotesTabMenu'
import type { NoteAppController } from '../../../../ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import { ThemeProvider } from '../../../../ui/web/components/theme-provider'
import RichTextEditor from '@ui/web/components/RichTextEditor'


function requireElement(root: ParentNode, selector: string) {
  const element = root.querySelector(selector)
  if (!element) throw new Error(`Missing test element: ${selector}`)
  return element
}

function selectionFrom(doc: Document) {
  const selection = doc.getSelection()
  if (!selection) throw new Error('Document selection is unavailable')
  return selection
}

type EscapeTrace = {
  event: KeyboardEvent | null
  menu: Element | null
  capture: { at: number; trusted: boolean; cancelable: boolean; defaultPrevented: boolean; targetTag: string | null; targetRole: string | null } | null
  transitions: Array<{ at: number; target: 'trigger' | 'menu'; attribute: string; previous: string | null; current: string | null }>
}

function fontMenuDiagnostic(doc: Document, escapeTrace?: EscapeTrace) {
  const view = doc.defaultView
  const active = doc.activeElement
  const trigger = doc.querySelector('[data-cy="font-size-button"]')
  const menus = Array.from(doc.querySelectorAll('[role="listbox"]'), menu => {
    const style = view?.getComputedStyle(menu)
    const bounds = menu.getBoundingClientRect()
    return {
      state: menu.getAttribute('data-state'),
      ariaHidden: menu.getAttribute('aria-hidden'),
      display: style?.display,
      visibility: style?.visibility,
      opacity: style?.opacity,
      width: bounds.width,
      height: bounds.height,
    }
  })
  return JSON.stringify({
    at: view?.performance.now(),
    visibility: doc.visibilityState,
    documentFocused: doc.hasFocus(),
    activeTag: active?.tagName,
    activeRole: active?.getAttribute('role'),
    activeLabel: active?.getAttribute('aria-label'),
    triggerExpanded: trigger?.getAttribute('aria-expanded'),
    menus,
    escape: escapeTrace ? {
      capture: escapeTrace.capture,
      defaultPreventedAfter: escapeTrace.event?.defaultPrevented ?? null,
      originalMenuConnected: escapeTrace.menu?.isConnected ?? null,
      transitions: escapeTrace.transitions,
    } : undefined,
  })
}

function colorReader(doc: Document) {
  const canvas = doc.createElement('canvas')
  canvas.width = canvas.height = 1
  const context = canvas.getContext('2d')
  if (!context) throw new Error('Canvas color conversion is unavailable')
  return (color: string) => {
    context.clearRect(0, 0, 1, 1)
    context.fillStyle = 'transparent'
    context.fillStyle = color
    context.fillRect(0, 0, 1, 1)
    return Array.from(context.getImageData(0, 0, 1, 1).data)
  }
}

function compositeColor(front: number[], back: number[]) {
  const alpha = front[3] / 255
  return back.map((value, index) => alpha * front[index] + (1 - alpha) * value)
}

function composedBackground(element: HTMLElement, rgba: (color: string) => number[]) {
  const backgrounds: number[][] = []
  for (let node: HTMLElement | null = element; node; node = node.parentElement) {
    backgrounds.push(rgba(getComputedStyle(node).backgroundColor))
  }
  return backgrounds.reverse().reduce((back, front) => compositeColor(front, back), [255, 255, 255])
}

function contrastAgainstBackground(foreground: number[], background: number[]) {
  const luminance = (color: number[]) => color.reduce((sum, channel, index) => {
    const value = channel / 255
    const linear = value <= 0.04045 ? value / 12.92 : ((value + 0.055) / 1.055) ** 2.4
    return sum + linear * [0.2126, 0.7152, 0.0722][index]
  }, 0)
  const values = [luminance(compositeColor(foreground, background)), luminance(background)].sort((a, b) => a - b)
  return (values[1] + 0.05) / (values[0] + 0.05)
}

function assertVisibleCaret($editor: JQuery<HTMLElement>) {
  const editor = $editor[0]
  const doc = editor.ownerDocument
  const selection = selectionFrom(doc)
  const style = getComputedStyle(editor)
  expect(doc.activeElement, 'keyboard focus is in the note').to.equal(editor)
  expect(editor.matches(':focus-visible'), 'keyboard focus is visible').to.equal(true)
  expect(style.boxShadow, 'focused canvas has no side line').to.equal('none')
  expect(style.outlineStyle, 'focused canvas has no frame').to.equal('none')
  expect(selection.isCollapsed, 'the insertion point is a caret').to.equal(true)
  expect(selection.anchorNode && editor.contains(selection.anchorNode), 'caret is in the note').to.equal(true)
  expect(selection.rangeCount, 'caret has a range').to.be.greaterThan(0)
  const caretRect = selection.getRangeAt(0).getBoundingClientRect()
  const win = doc.defaultView
  if (!win) throw new Error('Editor window is unavailable')
  expect(caretRect.height, 'caret has a visible position').to.be.greaterThan(0)
  expect(caretRect.left, 'caret is within the viewport').to.be.within(0, win.innerWidth)
  expect(caretRect.top, 'caret top is within the viewport').to.be.at.least(0)
  expect(caretRect.bottom, 'caret bottom is within the viewport').to.be.at.most(win.innerHeight)

  // Canvas resolves modern CSS colors (including oklch) to sRGB before
  // measuring the caret against the composed editor background.
  const rgba = colorReader(doc)
  const background = composedBackground(editor, rgba)
  expect(contrastAgainstBackground(rgba(style.caretColor), background), 'caret contrast against the editor').to.be.at.least(3)
}

function assertVisibleControlFocus($button: JQuery<HTMLElement>) {
  const button = $button[0]
  const style = getComputedStyle(button)
  const rgba = colorReader(button.ownerDocument)
  const background = composedBackground(button.parentElement ?? button, rgba)
  const isVisibleColor = (color: string) => contrastAgainstBackground(rgba(color), background) >= 3
  const hasOutline = style.outlineStyle !== 'none' && Number.parseFloat(style.outlineWidth) > 0 && isVisibleColor(style.outlineColor)
  const hasShadow = style.boxShadow.split(/,(?![^()]*\))/).some(layer => {
    const sizes = layer.match(/-?\d+(?:\.\d+)?px/g) ?? []
    const color = layer.match(/(?:rgba?|hsla?|(?:ok)?l(?:ab|ch)|color)\([^)]*\)|#[\da-f]+/i)?.[0]
    return sizes.some(size => Number.parseFloat(size) > 0) && Boolean(color && isVisibleColor(color))
  })
  expect(button.tagName, 'next control is a button').to.equal('BUTTON')
  expect(button.matches(':focus-visible'), 'button has keyboard focus').to.equal(true)
  expect(hasOutline || hasShadow, 'button focus has a visible indicator').to.equal(true)
}

describe('Mobile Layout Adaptation', { retries: 0 }, () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockUser = { id: 'test-user', email: 'test@example.com' } as any

  let createMockController: (overrides?: Partial<NoteAppController>) => NoteAppController
  let mockSupabase: SupabaseClient
  let restoreViewport: (() => void) | undefined
  let restoreNavigator: (() => void) | undefined
  let stopEscapeTrace: (() => void) | undefined
  let cancelViewportResize: (() => void) | undefined

  function observeViewportResize(win: Window, width: number, height: number) {
    let cancel = () => {}
    const promise = new Cypress.Promise<void>(resolve => {
      const onResize = () => {
        if (win.innerWidth !== width || win.innerHeight !== height) return
        win.removeEventListener('resize', onResize)
        resolve()
      }
      win.addEventListener('resize', onResize, { passive: true })
      cancel = () => win.removeEventListener('resize', onResize)
    })
    return { promise, cancel }
  }

  function viewportAfterResize(width: number, height: number) {
    let resized: PromiseLike<void> = Promise.resolve()
    cy.window().then(win => {
      if (win.innerWidth === width && win.innerHeight === height) return
      // cy.viewport can finish before the browser delivers its resize event.
      // Subscribe first, so an early event is retained by the promise as well.
      const observation = observeViewportResize(win, width, height)
      cancelViewportResize = observation.cancel
      resized = observation.promise
    })
    cy.viewport(width, height)
    cy.then(() => resized)
  }

  afterEach(() => {
    try { cancelViewportResize?.() } finally {
      cancelViewportResize = undefined
      try { stopEscapeTrace?.() } finally {
        stopEscapeTrace = undefined
        restoreViewport?.()
        restoreViewport = undefined
        restoreNavigator?.()
        restoreNavigator = undefined
      }
    }
  })

  beforeEach(() => {
    createMockController = (overrides: Partial<NoteAppController> = {}): NoteAppController => {
      const handleSelectNote = cy.stub().as('handleSelectNote')
      handleSelectNote.resolves()
      const activeTab: NoteWorkspaceTab = {
        id: 'test-tab',
        noteId: null,
        note: null,
        mode: 'reading',
        draft: { title: '', description: '', tags: '' },
        view: { scrollTop: 0 },
        saveState: 'saved',
        saveError: null,
      }

      return ({
      activeMainView: 'notes',
      setActiveMainView: cy.stub(),
      handleRenameTag: cy.stub().resolves(),
      handleDeleteTag: cy.stub().resolves(),
      handleCleanTags: cy.stub().resolves(),
      prepareTagManagement: cy.stub().resolves(true),
      tagManagementBlockReason: null,
      tagCoverageNotice: null,
      checkTagCoverage: cy.stub().resolves(),
      loadMoreTagNotes: cy.stub().resolves(),
      checkingTagCoverage: false,
      tagMutationInProgress: false,
      user: mockUser,
      loading: false,
      refreshNotes: cy.stub().resolves(),
      refreshSelectedNote: cy.stub().resolves(),
      notes: [],

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notesQuery: { isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: cy.stub() } as any,
      selectedNote: null,
      isEditing: false,
      tabs: [activeTab],
      activeTabId: activeTab.id,
      activeTab,
      split: null,
      setSplit: cy.stub(),
      canAddTab: true,
      workspaceHydrated: true,
      preserveWorkspaceForNavigation: cy.stub(),
      addTab: cy.stub().resolves(),
      activateTab: cy.stub().resolves(),
      closeTab: cy.stub().resolves(),
      tabPendingClose: null,
      hasPendingWorkspaceWrites: false,
      hasPendingWritesForTab: cy.stub().returns(false),
      confirmCloseTab: cy.stub().resolves(),
      cancelCloseTab: cy.stub(),
      handleDraftChange: cy.stub(),
      handleViewSessionChange: cy.stub(),
      handleTabViewSessionChange: cy.stub(),
      registerWorkspaceViewCapture: cy.stub(),
      setIsEditing: cy.stub(),
      isSearchPanelOpen: false,
      setIsSearchPanelOpen: cy.stub(),
      searchQuery: '',
      filterByTag: null,
      deleteDialogOpen: false,
      noteToDelete: null,
      saving: false,
      selectionMode: false,
      selectedNoteIds: new Set(),
      selectedCount: 0,
      bulkDeleting: false,
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      ftsSearchResult: { isLoading: false, data: [] } as any,
      showFTSResults: false,
      showTagOnlyResults: false,
      ftsData: undefined,
      ftsResults: [],
      ftsHasMore: false,
      ftsLoadingMore: false,
      tagOnlyResults: [],
      tagOnlyTotal: 0,
      tagOnlyLoading: false,
      tagOnlyHasMore: false,
      tagOnlyLoadingMore: false,
      ftsObserverTarget: { current: null },
      observerTarget: { current: null },
      deleteAccountLoading: false,

      handleSelectNote,
      hideNotePane: cy.stub().resolves(true),
      handleCreateNote: cy.stub(),
      handleEditNote: cy.stub().resolves(),
      handleSaveNote: cy.stub().resolves(),
      handleReadNote: cy.stub().resolves(),
      handleDeleteNote: cy.stub(),
      confirmDeleteNote: cy.stub(),
      setDeleteDialogOpen: cy.stub(),
      handleSearch: cy.stub(),
      handleClearTagFilter: cy.stub(),
      handleTagClick: cy.stub(),
      handleRemoveTagFromNote: cy.stub(),
      handleSignOut: cy.stub(),
      signOutPhase: 'idle',
      cancelSignOut: cy.stub(),
      discardAndSignOut: cy.stub().resolves(),
      handleDeleteAccount: cy.stub(),
      handleTestLogin: cy.stub(),
      handleSkipAuth: cy.stub(),
      handleSignInWithGoogle: cy.stub(),
      invalidateNotes: cy.stub(),
      handleSearchResultClick: cy.stub(),
      enterSelectionMode: cy.stub(),
      exitSelectionMode: cy.stub(),
      selectAllVisible: cy.stub(),
      clearSelection: cy.stub(),
      loadMoreFts: cy.stub(),
      loadMoreTagOnly: cy.stub(),
      loadMoreAI: cy.stub(),
      toggleNoteSelection: cy.stub(),
      deleteSelectedNotes: cy.stub(),
      totalNotes: 0,
      notesDisplayed: 0,
      notesTotal: 0,
      isOffline: false,
      pendingCount: 0,
      failedCount: 0,
      syncStateReady: true,
      storageReadError: false,
      legacyUnverifiedCount: 0,
      unqueuedLocalCount: 0,
      unavailableRemoteEdits: false,
      legacyClaimBlocked: false,
      localCleanupCount: 0,
      retryLocalDeletion: cy.stub().resolves(),
      restoredNoteCheck: 'idle',
      retryRestoredNoteCheck: cy.stub(),
      retryLocalVerification: cy.stub().resolves(),
      handleAutoSave: cy.stub(),
      lastSavedAt: null,
      autoSaving: false,

      ...overrides,

      // Required by controller type (used by NotesShell to register editor ref)
      notePaneVisible: overrides.notePaneVisible ?? Boolean(overrides.selectedNote || overrides.isEditing),
      registerNoteEditorRef: overrides.registerNoteEditorRef ?? cy.stub(),
      resetFtsResults: overrides.resetFtsResults ?? cy.stub(),
      resetAIResults: overrides.resetAIResults ?? cy.stub(),
      registerAIPaginationControls: overrides.registerAIPaginationControls ?? cy.stub(),
      captureSettingsReturnState: overrides.captureSettingsReturnState ?? cy.stub().resolves({
        selectedNoteId: null,
        isEditing: false,
        isSearchPanelOpen: false,
        searchQuery: '',
        filterByTag: null,
      }),
      restoreUiState: overrides.restoreUiState ?? cy.stub(),
      deleteNotesByIds: overrides.deleteNotesByIds ?? cy.stub().resolves({ total: 0, failed: 0, queuedOffline: false }),
    })
    }

    mockSupabase = {
      auth: {
        getSession: cy.stub().resolves({ data: { session: { user: mockUser } }, error: null }),
        onAuthStateChange: cy.stub().returns({ data: { subscription: { unsubscribe: cy.stub() } } }),
      },
      from: cy.stub().returns({
        select: cy.stub().returnsThis(),
        order: cy.stub().returnsThis(),
        range: cy.stub().returnsThis(),
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        then: (resolve: any) => resolve({ data: [], error: null })
      }),
      storage: {
        from: cy.stub().returns({
          upload: cy.stub().resolves({ data: { path: '' }, error: null }),
          getPublicUrl: cy.stub().returns({ data: { publicUrl: 'https://example.com' }, error: null }),
        }),
      },
    } as unknown as SupabaseClient
  })

  it('refreshes an empty Android list by pulling its content', () => {
    cy.viewport('iphone-se2')
    cy.stub(Capacitor, 'isNativePlatform').returns(true)
    cy.stub(Capacitor, 'getPlatform').returns('android')
    const refreshNotes = cy.stub().as('refreshNotes'); refreshNotes.resolves()
    const controller = createMockController({ refreshNotes })
    cy.mount(<SupabaseTestProvider supabase={mockSupabase}><NotesShell controller={controller} /></SupabaseTestProvider>)
    cy.get('[data-cy="pull-to-refresh"]').filter(':visible')
      .trigger('touchstart', { touches: [{ clientX: 80, clientY: 200 }] })
      .trigger('touchmove', { touches: [{ clientX: 80, clientY: 350 }] })
    cy.contains('[role="status"]', 'Release to refresh').should(($status) => {
      const indicator = $status[0]
      const rect = indicator.getBoundingClientRect()
      const viewport = indicator.ownerDocument.defaultView
      if (!viewport) throw new Error('Missing indicator viewport')
      expect(rect.width, 'visible indicator width').to.be.greaterThan(0)
      expect(rect.top, 'indicator starts inside viewport').to.be.at.least(0)
      expect(rect.bottom, 'indicator ends inside viewport').to.be.at.most(viewport.innerHeight)
      expect(viewport.getComputedStyle(indicator).visibility).to.equal('visible')
    })
    cy.get('[data-cy="pull-to-refresh"]').filter(':visible').trigger('touchend', { touches: [] })
    cy.get('@refreshNotes').should('have.been.calledOnce')
    cy.get('[data-cy="pull-to-refresh"] [role="status"]').should('not.exist')
  })

  it('refreshes an Android reading pane while excluding the editor', () => {
    cy.viewport('iphone-se2')
    cy.stub(Capacitor, 'isNativePlatform').returns(true)
    cy.stub(Capacitor, 'getPlatform').returns('android')
    const note = { id: 'refresh-note', title: 'Reading refresh', description: '<p>Pull this text</p>', tags: [], user_id: 'test-user', created_at: '2026-09-22', updated_at: '2026-09-22' }
    const refreshSelectedNote = cy.stub().as('refreshSelectedNote'); refreshSelectedNote.resolves()
    const controller = createMockController({ selectedNote: note, refreshSelectedNote })
    cy.mount(<SupabaseTestProvider supabase={mockSupabase}><NotesShell controller={controller} /></SupabaseTestProvider>)
    cy.contains('p', 'Pull this text')
      .trigger('touchstart', { touches: [{ clientX: 80, clientY: 200 }] })
      .trigger('touchmove', { touches: [{ clientX: 80, clientY: 350 }] })
      .trigger('touchend', { touches: [] })
    cy.get('@refreshSelectedNote').should('have.been.calledOnce')
    cy.mount(<SupabaseTestProvider supabase={mockSupabase}><NotesShell controller={{ ...controller, isEditing: true }} /></SupabaseTestProvider>)
    cy.get('[data-testid="editor-container"] [data-cy="pull-to-refresh"]').should('not.exist')
    cy.get('@refreshSelectedNote').should('have.been.calledOnce')
  })

  it('shows sidebar and hides editor on mobile by default', () => {
    cy.viewport('iphone-se2')
    const controller = createMockController()

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    cy.get('[data-testid=\'notes-shell\']')
      .invoke('attr', 'class')
      .should('include', 'h-[100dvh]')
      .and('include', 'min-h-[100svh]')

    // Sidebar content should be visible (not hidden)
    cy.get('[data-testid=\'sidebar-container\']').should('not.have.class', 'hidden')

    // Editor should be hidden
    cy.get('[data-testid=\'editor-container\']').should('have.class', 'hidden')
  })

  it('keeps the active tab switcher above the mobile note list for a new tab', () => {
    cy.viewport('iphone-se2')
    const note = {
      id: 'choose-me',
      title: 'Choose me',
      description: 'A note for the new tab',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'test-user',
    }
    const controller = createMockController({ notes: [note], notesDisplayed: 1, notesTotal: 1 })

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    cy.get('[aria-label="Open note tabs (1)"]').click()
    cy.contains('button', 'Add tab').click()
    cy.get('[aria-label="Open note tabs (1)"]').should('have.attr', 'aria-expanded', 'false')
    cy.get('[data-testid="sidebar-container"]').should('not.have.class', 'hidden')
    cy.get('[data-testid="note-card"]').contains('Choose me').click()
    cy.get('@handleSelectNote').should('have.been.calledWith', note)
  })

  it('scrolls a large mobile tab list and exposes the shared disabled Add state', () => {
    cy.viewport('iphone-se2')
    const baseTab: NoteWorkspaceTab = {
      id: 'mobile-tab-0',
      noteId: null,
      note: null,
      mode: 'reading',
      draft: { title: 'Note 1', description: '', tags: '' },
      view: { scrollTop: 0 },
      saveState: 'saved',
      saveError: null,
    }
    const manyTabs = Array.from({ length: 40 }, (_, index) => ({
      ...baseTab,
      id: `mobile-tab-${index}`,
      draft: { ...baseTab.draft, title: `Note ${index + 1}` },
    }))
    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <MobileNotesTabMenu
          tabs={manyTabs}
          activeTabId={manyTabs[0].id}
          onAddTab={cy.stub()}
          onActivateTab={cy.stub()}
          onCloseTab={cy.stub()}
          addTabDisabled
          maximumTabCount={32}
        />
      </ThemeProvider>
    )

    cy.get('[aria-label="Open note tabs (40)"]').click()
    cy.get('[id="mobile-notes-tab-list"]')
      .find('button[aria-label="Add tab (limit reached: 32 tabs)"]')
      .should('be.visible')
      .and('be.disabled')
    cy.get('[id="mobile-notes-tab-list"] > div')
      .first()
      .should('have.class', 'overflow-y-auto')
  })

  it('shows editor and hides sidebar when note is selected on mobile', () => {
    cy.viewport('iphone-se2')
    const selectedNote = {
      id: '1',
      title: 'Test Note',
      description: 'Content',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    // Sidebar should be hidden
    cy.get('[data-testid=\'sidebar-container\']').should('have.class', 'hidden')

    // Editor (NoteView) should be visible
    cy.get('[data-testid=\'editor-container\']').should('not.have.class', 'hidden')

    cy.contains('Test Note').should('exist') // Content title
    cy.contains('Reading').should('exist') // Header status
    cy.get('[aria-label="Expand editor"]').should('not.exist')
  })

  it('shows Editing status in editor', () => {
    cy.viewport('iphone-se2')
    const controller = createMockController({
      isEditing: true,
    })

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    cy.contains('Editing').should('exist')
  })

  function mountLongEditor() {
    const controller = createMockController({ isEditing: true })
    controller.activeTab.mode = 'editing'
    controller.activeTab.draft = {
      title: 'Long mobile note',
      description: Array.from({ length: 60 }, (_, index) => {
        const paragraph = document.createElement('p')
        paragraph.textContent = `Paragraph ${index}`
        return paragraph.outerHTML
      }).join(''),
      tags: 'work, personal, ideas',
    }
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )
    cy.get('.tiptap').should('contain.text', 'Paragraph 59')
    cy.get('.tiptap').closest('.overflow-y-auto').as('noteScroll')
  }

  function mountShortEditor(description = '<p>Short text</p>') {
    const handleSaveNote = cy.stub().as('saveNote').resolves()
    const controller = createMockController({ isEditing: true, handleSaveNote })
    controller.activeTab.mode = 'editing'
    controller.activeTab.draft = { title: 'Short note', description, tags: '' }
    cy.mount(
      <ThemeProvider attribute="class" defaultTheme="light">
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )
    cy.get('.tiptap').should('contain.text', 'Short text')
    cy.get('.tiptap').closest('.overflow-y-auto').as('noteScroll')
  }

  it('fills the available mobile editing space without scrolling a short note', () => {
    cy.viewport(390, 844)
    mountShortEditor()
    cy.get('.tiptap').should(($editor) => {
      const scroll = $editor[0].closest('.overflow-y-auto') as HTMLElement
      const remaining = scroll.getBoundingClientRect().bottom - $editor[0].getBoundingClientRect().bottom
      expect(remaining, 'editable canvas reaches the bottom of the viewport').to.be.within(0, 32)
      expect(scroll.scrollHeight, 'short note has no unnecessary scroll').to.equal(scroll.clientHeight)
    })
    cy.screenshot('editor-canvas-mobile-light')
    cy.get('.tiptap').click('bottomLeft').type(' added')
    cy.get('.tiptap').should('contain.text', 'Short text added')
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@saveNote').should('have.been.calledOnce').and('have.been.calledWithMatch', { title: 'Short note', description: '<p>Short text added</p>' })
  })

  it('keeps the canvas usable on a narrow phone', () => {
    cy.viewport(320, 667)
    mountShortEditor()
    cy.get('.tiptap').should(($editor) => {
      const scroll = $editor[0].closest('.overflow-y-auto') as HTMLElement
      const remaining = scroll.getBoundingClientRect().bottom - $editor[0].getBoundingClientRect().bottom
      expect(remaining).to.be.within(0, 32)
      expect(scroll.scrollHeight).to.equal(scroll.clientHeight)
    })
    cy.get('.tiptap').click('bottomLeft').type(' added')
    cy.get('.tiptap').should('contain.text', 'Short text added')
  })

  it('keeps an image and following text within the mobile editing canvas', () => {
    // The compact document fits this image at 844px; use a shorter phone to
    // retain the original regression's real scrolling scenario.
    cy.viewport(390, 667)
    mountShortEditor('<p><img src="/icons/icon-512.png" alt="Example image"></p><p>Short text</p>')
    cy.get('.tiptap img').should(($image) => {
      const image = $image[0] as HTMLImageElement
      expect(image.naturalWidth, 'image loaded').to.be.greaterThan(0)
      expect(image.getBoundingClientRect().width, 'image fits the canvas')
        .to.be.at.most(requireElement(image.ownerDocument, '.tiptap').getBoundingClientRect().width)
    })
    cy.get('@noteScroll').scrollTo('bottom')
    cy.get('.tiptap p').last().should('be.visible').and('contain.text', 'Short text')
    cy.screenshot('editor-canvas-mobile-image')
  })

  it('fills the available desktop editing space without scrolling a short note', () => {
    cy.viewport(1280, 900)
    mountShortEditor()
    cy.get('.tiptap').should(($editor) => {
      const scroll = $editor[0].closest('.overflow-y-auto') as HTMLElement
      const remaining = scroll.getBoundingClientRect().bottom - $editor[0].getBoundingClientRect().bottom
      expect(remaining, 'editable canvas reaches the bottom of the viewport').to.be.within(0, 32)
      expect(scroll.scrollHeight, 'short note has no unnecessary scroll').to.equal(scroll.clientHeight)
    })
    cy.screenshot('editor-canvas-desktop-light')
    cy.get('[data-cy="clear-formatting-button"]').focus().should('be.focused')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Toggle Spellcheck')
    cy.focused().should(assertVisibleControlFocus)
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Note content')
    cy.focused().should(assertVisibleCaret)
    cy.focused().type(' light')
    cy.get('.tiptap').should('contain.text', 'light')
    cy.get('html').invoke('addClass', 'dark')
    cy.get('[data-cy="clear-formatting-button"]').focus().should('be.focused')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Toggle Spellcheck')
    cy.focused().should(assertVisibleControlFocus)
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Note content')
    cy.focused().should(assertVisibleCaret)
    cy.screenshot('editor-canvas-desktop-dark', { capture: 'viewport' })
    cy.focused().type(' edited')
    cy.get('.tiptap').should('contain.text', 'edited')
    cy.get('html').invoke('removeClass', 'dark')
  })

  it('keeps formatting above the mobile safe area when navigation is visible or hidden', () => {
    cy.viewport(390, 844)
    mountShortEditor()
    cy.get('.mobile-workspace').then(($workspace) => {
      $workspace[0].style.setProperty('--mobile-safe-bottom', '24px')
    })
    cy.get('[aria-label="Mobile Navigation"]').should(($navigation) => {
      const nav = $navigation[0].getBoundingClientRect()
      const toolbar = requireElement($navigation[0].ownerDocument, '[data-editor-toolbar]').getBoundingClientRect()
      expect(getComputedStyle($navigation[0]).paddingBottom).to.equal('24px')
      expect(toolbar.bottom, 'formatting stays above navigation').to.be.at.most(nav.top)
    })
    cy.get('[aria-label="Expand editor"]').click()
    cy.get('[data-editor-toolbar]').should(($toolbar) => {
      expect($toolbar[0].getBoundingClientRect().bottom, 'formatting stays above the safe area').to.be.at.most(820)
    })
  })

  it('keeps the editable canvas and formatting accessible when the keyboard resizes the viewport', () => {
    cy.viewport(390, 844)
    const viewport = new EventTarget()
    Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 })
    cy.window().then((win) => {
      const original = Object.getOwnPropertyDescriptor(win, 'visualViewport')
      restoreViewport = () => {
        if (original) Object.defineProperty(win, 'visualViewport', original)
        else Reflect.deleteProperty(win, 'visualViewport')
      }
      Object.defineProperty(win, 'visualViewport', { configurable: true, value: viewport })
    })
    mountShortEditor()
    cy.then(() => {
      Object.assign(viewport, { height: 480, offsetTop: 24 })
      viewport.dispatchEvent(new Event('resize'))
    })
    cy.get('[aria-label="Mobile Navigation"]').should('not.be.visible')
    cy.get('[data-editor-toolbar]').should(($toolbar) => {
      expect($toolbar[0].getBoundingClientRect().bottom, 'formatting stays above keyboard').to.be.at.most(504)
    })
    cy.get('.tiptap').click().type(' changed')
    cy.get('.tiptap').should('contain.text', 'changed')
  })

  it('shows a usable keyboard caret in the canvas in light and dark themes', () => {
    cy.viewport(390, 844)
    mountShortEditor()
    cy.get('[aria-label="Add tag"]').click()
    cy.get('input[aria-label="Add tags"]').should('be.visible').and('be.focused')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Add tag')
    cy.focused().should(assertVisibleControlFocus)
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Note content')
    cy.focused().should(assertVisibleCaret)
    cy.screenshot('editor-canvas-mobile-light-focus')
    cy.focused().type(' light')
    cy.get('.tiptap').should('contain.text', 'light')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should(assertVisibleControlFocus)
    cy.get('html').invoke('addClass', 'dark')
    cy.get('[aria-label="Add tag"]').click()
    cy.get('input[aria-label="Add tags"]').should('be.visible').and('be.focused')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Add tag')
    cy.focused().should(assertVisibleControlFocus)
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should('have.attr', 'aria-label', 'Note content')
    cy.focused().should(assertVisibleCaret)
    cy.screenshot('editor-canvas-mobile-dark-focus')
    cy.focused().type(' dark')
    cy.get('.tiptap').should('contain.text', 'dark')
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.focused().should(assertVisibleControlFocus)
    cy.get('html').invoke('removeClass', 'dark')
  })

  it('allows searching while the mobile editor is expanded', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('[aria-label="Expand editor"]').click()
    cy.get('[data-cy="expanded-note-find-button"]').click()
    cy.get('[data-cy="note-find-input"]').type('Paragraph 59')
    cy.get('[data-cy="note-find-count"]').should('contain.text', '1 / 1')
    cy.then(() => dispatchAppBack())
    cy.get('[data-cy="note-find-input"]').should('not.exist')
    cy.get('[aria-label="Collapse editor"]').should('be.visible')
  })

  it('handles Back one layer at a time: formatting menu, fullscreen, then note', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('[aria-label="Expand editor"]').click()
    cy.get('[aria-label="Text style"]').click()
    cy.get('[role="menu"]').should('be.visible')
    cy.then(() => dispatchAppBack())
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Collapse editor"]').should('be.visible')
    cy.get('@handleSelectNote').should('not.have.been.called')
    cy.then(() => dispatchAppBack())
    cy.get('[aria-label="Expand editor"]').should('be.visible')
    cy.get('@handleSelectNote').should('not.have.been.called')
    cy.then(() => dispatchAppBack())
    cy.get('@handleSelectNote').should('have.been.calledOnceWith', null)
  })

  it('closes the tabs menu without leaving the note', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('[data-cy="mobile-tabs-toggle"]').click()
    cy.get('#mobile-notes-tab-list').should('be.visible')
    cy.then(() => dispatchAppBack())
    cy.get('#mobile-notes-tab-list').should('not.exist')
    cy.get('@handleSelectNote').should('not.have.been.called')
  })

  it('expands only the editing surface and restores chrome without remounting the draft', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('.tiptap').as('editorBefore')
    cy.get('.tiptap p').first().click().type(' added')
    cy.get('[aria-label="Expand editor"]').click({ scrollBehavior: false })
    cy.get('[data-cy="note-save-button"]').should('not.be.visible')
    cy.get('[placeholder="Note title"]').should('not.be.visible')
    cy.get('[data-testid="tag-input-container"]').should('not.be.visible')
    cy.get('[aria-label="Open note tabs (1)"]').should('not.be.visible')
    cy.get('[aria-label="Mobile Navigation"]').should('have.attr', 'inert')
    cy.get('@noteScroll').should(($scroll) => {
      expect($scroll[0].getBoundingClientRect().top, 'text uses top of viewport').to.equal(0)
    }).scrollTo('bottom')
    cy.get('.tiptap p').last().should(($paragraph) => {
      const toolbar = requireElement($paragraph[0].ownerDocument, '[data-editor-toolbar]')
      expect($paragraph[0].getBoundingClientRect().bottom).to.be.at.most(toolbar.getBoundingClientRect().top)
    })
    cy.get('[data-editor-toolbar]').scrollTo('right')
    cy.get('[aria-label="Collapse editor"]').should('be.visible').click({ scrollBehavior: false })
    cy.get('[data-cy="note-save-button"]').should('be.visible')
    cy.get('[aria-label="Open note tabs (1)"]').should('be.visible')
    cy.get('@noteScroll').scrollTo('top')
    cy.get('[placeholder="Note title"]').should('have.value', 'Long mobile note').and('be.visible')
    cy.get('@editorBefore').then(($before) => {
      cy.get('.tiptap').should(($after) => expect($after[0]).to.equal($before[0]))
    })
    cy.get('.tiptap').should('contain.text', ' added')
    cy.get('[aria-label="Expand editor"]').click({ scrollBehavior: false })
    cy.get('.tiptap p').first().trigger('keydown', { key: 'Escape' })
    cy.get('[aria-label="Expand editor"]').should('be.visible')
  })

  it('stays expanded when the first autosave assigns a new note id', () => {
    cy.viewport(390, 844)
    const controller = createMockController({ isEditing: true })
    controller.activeTab.mode = 'editing'
    controller.activeTab.draft = { title: 'New draft', description: '<p>Draft text</p>', tags: '' }
    function PersistingEditor() {
      const [note, setNote] = React.useState<NoteAppController['selectedNote']>(null)
      return <NotesShell controller={{
        ...controller,
        selectedNote: note,
        activeTab: {
          ...controller.activeTab,
          note,
          noteId: note?.id ?? null,
          draft: note ? { title: note.title, description: note.description, tags: '' } : controller.activeTab.draft,
        },
        handleAutoSave: async (data) => {
          setNote({ id: 'saved-note', title: data.title, description: data.description, tags: [],
            user_id: 'test-user', created_at: '2026-09-22', updated_at: '2026-09-22' })
          return { noteId: 'saved-note' }
        },
      }} />
    }
    cy.mount(<ThemeProvider attribute="class" defaultTheme="light">
      <SupabaseTestProvider supabase={mockSupabase}><PersistingEditor /></SupabaseTestProvider>
    </ThemeProvider>)
    cy.get('[aria-label="Expand editor"]').click()
    cy.get('.tiptap p').first().click().type(' appended')
    cy.get('[aria-label="More actions"]').should('exist')
    cy.get('[aria-label="Collapse editor"]').should('be.visible')
    cy.get('.tiptap').should('contain.text', ' appended')
    cy.get('[data-cy="note-save-button"]').should('not.be.visible')
  })

  it('keeps the final edited paragraph above bottom navigation', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('@noteScroll').scrollTo('bottom')
    cy.get('.tiptap p').last().should(($paragraph) => {
      const paragraph = $paragraph[0].getBoundingClientRect()
      const nav = requireElement($paragraph[0].ownerDocument, '[aria-label="Mobile Navigation"]')
      const toolbar = requireElement($paragraph[0].ownerDocument, '[data-editor-toolbar]')
      expect(paragraph.bottom, 'last paragraph above navigation').to.be.at.most(nav.getBoundingClientRect().top)
      expect(paragraph.bottom, 'last paragraph above formatting').to.be.at.most(toolbar.getBoundingClientRect().top)
    })
    cy.screenshot('mobile-note-final-paragraph')
  })

  it('keeps header buttons above tags that scroll underneath them', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('[data-testid="tag-input-container"]').then(($tags) => {
      const doc = $tags[0].ownerDocument
      const header = requireElement(doc, '[data-cy="note-save-button"]').getBoundingClientRect()
      const tagRect = $tags[0].getBoundingClientRect()
      cy.get('@noteScroll').scrollTo(0, tagRect.top - header.top)
    })
    cy.get('[data-cy="note-save-button"]').should(($button) => {
      const button = $button[0]
      const rect = button.getBoundingClientRect()
      const hit = button.ownerDocument.elementFromPoint(rect.x + rect.width / 2, rect.y + rect.height / 2)
      expect(button.contains(hit), 'Save receives the tap over scrolling tags').to.equal(true)
    })
  })

  it('hides navigation scrolling down and restores it on upward scroll', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('@noteScroll').scrollTo(0, 240)
    cy.get('[aria-label="Mobile Navigation"]').should('not.be.visible')
    cy.get('@noteScroll').scrollTo(0, 180)
    cy.get('[aria-label="Mobile Navigation"]').should('be.visible')
    cy.get('[data-testid="notes-shell"]').then(($shell) => {
      const nav = requireElement($shell[0], '[aria-label="Mobile Navigation"]')
      const editor = requireElement($shell[0], '[data-testid="editor-container"]')
      expect(editor.getBoundingClientRect().bottom, 'editor reserves navigation space').to.be.at.most(nav.getBoundingClientRect().top)
    })
  })

  it('docks one horizontally scrollable formatting row above navigation', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    cy.get('[aria-label="Text formatting"]').should(($formatting) => {
      const doc = $formatting[0].ownerDocument
      const undo = requireElement(doc, '[data-cy="undo-button"]').getBoundingClientRect()
      const last = requireElement(doc, '[data-cy="toggle-spellcheck-button"]').getBoundingClientRect()
      const nav = requireElement(doc, '[aria-label="Mobile Navigation"]').getBoundingClientRect()
      expect(last.y, 'commands share one row').to.equal(undo.y)
      expect(undo.bottom, 'toolbar directly above bottom navigation').to.be.within(nav.top - 10, nav.top)
      expect(undo.height, 'touch target').to.be.at.least(44)
    })
    cy.get('[data-cy="toggle-spellcheck-button"]').scrollIntoView().click()
    cy.get('[aria-label="Mobile Navigation"]').should('be.visible')
  })

  it('applies grouped heading and alignment commands to the selected paragraph', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('.tiptap p').first().click({ scrollBehavior: 'center' })
    cy.get('[aria-label="Text style"]').click()
    cy.contains('[role="menuitemradio"]', 'Heading 2').click()
    cy.get('.tiptap h2').should('have.text', 'Paragraph 0')
    cy.get('[aria-label="Text style"]').should('contain.text', 'H2')
    cy.get('[aria-label="Text alignment"]').scrollIntoView().click()
    cy.contains('[role="menuitemradio"]', 'Align center').click()
    cy.get('.tiptap h2').should('have.css', 'text-align', 'center')
    cy.get('[aria-label="Text alignment"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemradio"]', 'Align center').should('have.attr', 'aria-checked', 'true')
  })

  it('keeps formatting and the final line above a resized keyboard viewport', () => {
    cy.viewport(390, 844)
    const viewport = new EventTarget()
    Object.assign(viewport, { height: 844, offsetTop: 0, scale: 1 })
    cy.window().then(win => {
      const original = Object.getOwnPropertyDescriptor(win, 'visualViewport')
      restoreViewport = () => {
        if (original) Object.defineProperty(win, 'visualViewport', original)
        else Reflect.deleteProperty(win, 'visualViewport')
      }
      Object.defineProperty(win, 'visualViewport', { configurable: true, value: viewport })
    })
    mountLongEditor()
    cy.then(() => {
      Object.assign(viewport, { height: 480, offsetTop: 24 })
      viewport.dispatchEvent(new Event('resize'))
    })
    cy.get('[aria-label="Expand editor"]').click({ scrollBehavior: false })
    cy.get('[aria-label="Collapse editor"]').should(($button) => {
      expect($button[0].getBoundingClientRect().bottom).to.be.at.most(504)
    })
    cy.get('[data-editor-toolbar]').should(($toolbar) => {
      expect($toolbar[0].getBoundingClientRect().bottom, 'toolbar above keyboard').to.be.at.most(504)
    })
    cy.get('@noteScroll').scrollTo('bottom')
    cy.get('.tiptap p').last().should(($paragraph) => {
      const toolbar = requireElement($paragraph[0].ownerDocument, '[data-editor-toolbar]')
      expect($paragraph[0].getBoundingClientRect().bottom).to.be.at.most(toolbar.getBoundingClientRect().top)
    })
    cy.then(() => {
      Object.assign(viewport, { height: 844, offsetTop: 0 })
      viewport.dispatchEvent(new Event('resize'))
    })
    cy.get('[data-testid="notes-shell"]').should(($shell) => {
      expect($shell[0].getBoundingClientRect().height).to.equal(844)
    })
  })

  it('preserves a text selection through formatting and undo/redo', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('.tiptap p').first().click({ scrollBehavior: 'center' }).then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      const text = $paragraph[0].firstChild
      if (!text) throw new Error('Paragraph has no text node')
      range.setStart(text, 0)
      range.setEnd(text, 9)
      selectionFrom(doc).removeAllRanges()
      selectionFrom(doc).addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Bold').click()
    cy.get('.tiptap p').first().find('strong').should('have.text', 'Paragraph')
    cy.get('[data-cy="undo-button"]').click({ scrollBehavior: false })
    cy.get('.tiptap p').first().find('strong').should('not.exist')
    cy.get('[data-cy="redo-button"]').click({ scrollBehavior: false })
    cy.get('.tiptap p').first().find('strong').should('have.text', 'Paragraph')
  })

  it('combines inline formats independently in one compact menu', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    cy.get('.tiptap p').first().click().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      selectionFrom(doc).removeAllRanges()
      selectionFrom(doc).addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Bold').click()
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Bold').should('have.attr', 'aria-checked', 'true')
    cy.contains('[role="menuitemcheckbox"]', 'Italic').click()
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Underline').click()
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Strikethrough').click()
    cy.get('.tiptap p').first().find('strong').should('have.text', 'Paragraph 0')
    cy.get('.tiptap p').first().find('em').should('have.text', 'Paragraph 0')
    cy.get('.tiptap p').first().find('s').should('have.text', 'Paragraph 0')
    cy.get('.tiptap p').first().find('u').should('have.text', 'Paragraph 0')
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Italic').should('have.attr', 'aria-checked', 'true').click()
    cy.get('.tiptap p').first().find('em').should('not.exist')
    cy.get('.tiptap p').first().find('strong').should('have.text', 'Paragraph 0')
    cy.get('.tiptap p').first().find('s').should('have.text', 'Paragraph 0')
    cy.get('.tiptap p').first().find('u').should('have.text', 'Paragraph 0')
    cy.get('[data-cy="bold-button"]').should('not.exist')
    cy.get('[aria-label="Text alignment"]').should(($alignment) => {
      const toolbar = requireElement($alignment[0].ownerDocument, '[data-editor-toolbar]')
      expect($alignment[0].getBoundingClientRect().right, 'primary groups visible without scrolling')
        .to.be.at.most(toolbar.getBoundingClientRect().right)
    })
  })

  it('uses a compact font icon while retaining the selected font in its menu', () => {
    viewportAfterResize(390, 844)
    mountLongEditor()
    cy.get('.tiptap p').first().click().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      selectionFrom(doc).removeAllRanges()
      selectionFrom(doc).addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.get('[aria-label="Font family"]').scrollIntoView().should(($font) => {
      expect($font[0].getBoundingClientRect().width).to.be.within(44, 60)
    }).click()
    cy.get('[role="option"]').contains(/^Serif$/).click()
    cy.get('.tiptap p').first().find('span').invoke('css', 'font-family').should('match', /^serif$/i)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[aria-label="Font family"]').click({ scrollBehavior: false })
    cy.get('[role="option"]').contains(/^Serif$/).closest('[role="option"]').should('have.attr', 'data-state', 'checked')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[aria-label="Font family"]').should('be.focused')
  })

  it('waits for a click and suppresses dropdown opening after a touch drag', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('[aria-label="Text style"]').as('trigger')
      .trigger('pointerdown', { eventConstructor: 'PointerEvent', scrollBehavior: false, pointerType: 'touch', pointerId: 1, isPrimary: true, button: 0, clientX: 180, clientY: 700 })
    cy.get('[role="menu"]').should('not.exist')
    cy.get('@trigger').trigger('pointermove', { eventConstructor: 'PointerEvent', scrollBehavior: false, pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 700 })
      .trigger('pointerup', { eventConstructor: 'PointerEvent', scrollBehavior: false, pointerType: 'touch', pointerId: 1, clientX: 100, clientY: 700 })
      .trigger('click', { eventConstructor: 'MouseEvent', scrollBehavior: false, detail: 1 })
    cy.get('[role="menu"]').should('not.exist')
    cy.get('@trigger').click()
    cy.get('[role="menu"]').should('be.visible')
    cy.get('[role="menu"]').type('{esc}')
    cy.get('@trigger').should('have.focus').type('{enter}')
    cy.get('[role="menu"]').should('be.visible')
  })

  it('drags the toolbar from a font selector without opening it or changing the note', () => {
    cy.viewport(390, 844)
    mountLongEditor()
    cy.get('[aria-label="Font family"]').scrollIntoView().as('font')
    cy.get('[data-editor-toolbar]').invoke('prop', 'scrollLeft').then((before) => {
      cy.get('@font').trigger('pointerdown', { eventConstructor: 'PointerEvent', scrollBehavior: false, pointerType: 'mouse', pointerId: 1, isPrimary: true, button: 0, clientX: 200, clientY: 700 })
      cy.get('[role="listbox"]').should('not.exist')
      cy.get('[data-editor-toolbar]').trigger('pointermove', { eventConstructor: 'PointerEvent', scrollBehavior: false, pointerType: 'mouse', pointerId: 1, clientX: 110, clientY: 700 })
        .trigger('pointerup', { eventConstructor: 'PointerEvent', scrollBehavior: false, pointerType: 'mouse', pointerId: 1, clientX: 110, clientY: 700 })
        .trigger('click', { eventConstructor: 'MouseEvent', scrollBehavior: false, detail: 1 })
      cy.get('[data-editor-toolbar]').invoke('prop', 'scrollLeft').should('be.greaterThan', before)
    })
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[data-cy="undo-button"]').should('be.disabled')
    cy.get('@font').scrollIntoView().click({ scrollBehavior: false })
    cy.get('[role="listbox"]').should('be.visible')
  })

  it('preserves desktop heading buttons and a sticky top toolbar', () => {
    cy.viewport(1280, 900)
    mountLongEditor()
    cy.get('@noteScroll').scrollTo(0, 500)
    cy.get('[data-editor-toolbar]').should(($toolbar) => {
      expect(getComputedStyle($toolbar[0]).position).to.equal('sticky')
      expect($toolbar[0].getBoundingClientRect().bottom).to.be.lessThan(400)
    })
    cy.get('[aria-label="Expand editor"]').should('not.be.visible')
    cy.get('[data-cy="h2-button"]').should('be.visible')
    cy.get('[aria-label="Text style"]').should('not.exist')
  })

  it('leaves an existing heading intact when choosing No list outside a list', () => {
    cy.viewport(390, 720)
    mountLongEditor()
    cy.get('.tiptap p').first().click({ scrollBehavior: 'center' })
    cy.get('[aria-label="Text style"]').click()
    cy.contains('[role="menuitemradio"]', 'Heading 2').click()
    cy.get('[aria-label="Lists"]').scrollIntoView().click()
    cy.contains('[role="menuitemradio"]', 'No list').click()
    cy.get('.tiptap h2').should('have.text', 'Paragraph 0')
  })

  it('changes list types and removes the list without losing text', () => {
    cy.viewport(390, 720)
    mountLongEditor()
    cy.get('.tiptap p').first().click({ scrollBehavior: 'center' })
    cy.get('[aria-label="Lists"]').scrollIntoView().click()
    cy.contains('[role="menuitemradio"]', 'Bullet list').click()
    cy.get('.tiptap ul li').first().should('have.text', 'Paragraph 0')
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Lists"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemradio"]', 'Numbered list').click()
    cy.get('.tiptap ol li').first().should('have.text', 'Paragraph 0')
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Lists"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemradio"]', 'No list').click()
    cy.get('.tiptap ol, .tiptap ul').should('not.exist')
    cy.get('.tiptap > p').first().should('have.text', 'Paragraph 0')
  })

  it('returns focus when a formatting menu is dismissed and fits a dark mobile viewport', () => {
    cy.viewport(430, 720)
    mountLongEditor()
    cy.get('html').invoke('addClass', 'dark')
    cy.get('[aria-label="Text style"]').click()
    cy.get('[role="menu"]').should(($menu) => {
      const toolbar = requireElement($menu[0].ownerDocument, '[data-editor-toolbar]')
      expect($menu[0].getBoundingClientRect().bottom).to.be.at.most(toolbar.getBoundingClientRect().top)
    })
    cy.screenshot('mobile-formatting-dark')
    cy.get('[role="menu"]').type('{esc}')
    cy.get('[aria-label="Text style"]').should('have.focus')
    cy.get('html').invoke('removeClass', 'dark')
  })

  it('keeps reading and editing actions large enough to tap on a narrow phone', () => {
    cy.viewport(320, 700)
    const note = {
      id: 'touch-target-note', title: 'Touch target note', description: '<p>Content</p>', tags: [],
      created_at: '2026-10-28T00:00:00Z', updated_at: '2026-10-28T00:00:00Z', user_id: 'test-user',
    }
    const controller = createMockController({ selectedNote: note })
    cy.mount(<SupabaseTestProvider supabase={mockSupabase}><NotesShell controller={controller} /></SupabaseTestProvider>)
    cy.get('[data-cy="note-back-button"], [data-cy="note-find-button"], [data-cy="note-edit-button"], [data-cy="note-copy-button"], [data-cy="note-delete-button"], [data-cy="note-more-button"]')
      .should('have.length', 6).each(($button) => {
        const rect = $button[0].getBoundingClientRect()
        expect(rect.width, 'reading action width').to.be.at.least(44)
        expect(rect.height, 'reading action height').to.be.at.least(44)
        expect(rect.right, 'reading action is within viewport').to.be.at.most(320)
      })
    mountLongEditor()
    cy.get('[data-cy="note-back-button"], [data-cy="note-find-button"], [data-cy="note-read-button"], [data-cy="note-copy-button"], [data-cy="note-save-button"], [data-cy="note-more-button"]')
      .should('have.length', 5).each(($button) => {
        const rect = $button[0].getBoundingClientRect()
        expect(rect.width, 'editing action width').to.be.at.least(44)
        expect(rect.height, 'editing action height').to.be.at.least(44)
        expect(rect.right, 'editing action is within viewport').to.be.at.most(320)
      })
  })

  it('shows back button in NoteView on mobile', () => {
    cy.viewport('iphone-se2')
    const selectedNote = {
      id: '1',
      title: 'Test Note',
      description: 'Content',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    // Back button should exist
    cy.get('[data-cy="note-back-button"]').should('exist')

    // Click back button
    cy.get('[data-cy="note-back-button"]').click()
    cy.get('@handleSelectNote').should('have.been.calledWith', null)
  })

  it('hides back button on desktop', () => {
    cy.viewport(1024, 768)
    const selectedNote = {
      id: '1',
      title: 'Test Note',
      description: 'Content',
      tags: [],
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      user_id: 'test-user'
    }
    const controller = createMockController({ selectedNote })

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    // Back button should have md:hidden class
    cy.get('[data-cy="note-back-button"]').should('have.class', 'md:hidden')
  })

  it('confirms a discarded failed save in the app dialog instead of a native confirm', () => {
    const confirmCloseTab = cy.stub().as('confirmCloseTab')
    confirmCloseTab.resolves()
    const cancelCloseTab = cy.stub().as('cancelCloseTab')
    const controller = createMockController({
      tabPendingClose: { tabId: 'test-tab', label: 'Unsent note' },
      confirmCloseTab,
      cancelCloseTab,
    })

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    cy.contains('Discard unsaved changes?').should('be.visible')
    cy.contains('Unsent note').should('be.visible')

    cy.get('[data-cy="discard-failed-save-cancel"]').click()
    cy.get('@cancelCloseTab').should('have.been.called')
    cy.get('@confirmCloseTab').should('not.have.been.called')
  })

  it('closes the tab when the discard dialog is confirmed', () => {
    const confirmCloseTab = cy.stub().as('confirmCloseTab')
    confirmCloseTab.resolves()
    const controller = createMockController({
      tabPendingClose: { tabId: 'test-tab', label: 'Unsent note' },
      confirmCloseTab,
    })

    cy.mount(
      <ThemeProvider attribute='class' defaultTheme='system' enableSystem>
        <SupabaseTestProvider supabase={mockSupabase}>
          <NotesShell controller={controller} />
        </SupabaseTestProvider>
      </ThemeProvider>
    )

    cy.get('[data-cy="discard-failed-save-confirm"]').click()
    cy.get('@confirmCloseTab').should('have.been.calledOnce')
  })
  function selectFirstParagraph() {
    cy.get('.tiptap p').first().click().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      selectionFrom(doc).removeAllRanges()
      selectionFrom(doc).addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
  }

  function selectFormatWhileHoldingFrames(frames: FrameRequestCallback[], keyboard: boolean, label = 'Bold') {
    cy.contains('[role="menuitemcheckbox"]', label).should('be.visible').then(($item) => {
      const item = $item[0] as HTMLElement
      const win = item.ownerDocument.defaultView!
      const original = win.requestAnimationFrame
      win.requestAnimationFrame = (callback) => {
        frames.push(callback)
        // Return a real, harmless handle; flushing is controlled below.
        return original.call(win, () => {})
      }
      try {
        if (keyboard) {
          item.focus()
          item.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Enter', bubbles: true, cancelable: true }))
        } else item.click()
      } finally {
        win.requestAnimationFrame = original
      }
      expect(frames.length, 'the command queued at least one frame').to.be.greaterThan(0)
    })
    cy.get('[role="menu"]').should('not.exist')
  }

  function releaseFrames(frames: FrameRequestCallback[]) {
    cy.window().then((win) => frames.forEach(callback => callback(win.performance.now())))
  }

  function chooseToolbarOptionWhileHoldingFrames(selector: string, text: string | null, frames: FrameRequestCallback[]) {
    const target = text ? cy.contains(selector, text) : cy.get(selector).first()
    target.scrollIntoView().should('be.visible').then(($item) => {
      const item = $item[0] as HTMLElement
      const win = item.ownerDocument.defaultView!
      const original = win.requestAnimationFrame
      win.requestAnimationFrame = callback => {
        frames.push(callback)
        return original.call(win, () => {})
      }
      try { item.click() } finally { win.requestAnimationFrame = original }
      expect(frames.length, 'the command queued a focus frame').to.be.greaterThan(0)
    })
  }

  function tap(selector: string) {
    cy.get(selector).then(($button) => {
      const button = $button[0] as HTMLElement
      const win = button.ownerDocument.defaultView!
      const rect = button.getBoundingClientRect()
      const init = { bubbles: true, cancelable: true, pointerId: 42, pointerType: 'touch', isPrimary: true, button: 0, clientX: rect.left + rect.width / 2, clientY: rect.top + rect.height / 2 }
      button.dispatchEvent(new win.PointerEvent('pointerdown', init))
      button.dispatchEvent(new win.PointerEvent('pointerup', init))
      button.dispatchEvent(new win.MouseEvent('click', { bubbles: true, cancelable: true, detail: 1 }))
    })
  }

  it('keeps a different menu open when a previous command focus frame is late after touch', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    tap('[aria-label="Lists"]')
    cy.get('[role="menu"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
    releaseFrames(frames)
    cy.get('[role="menu"]').should('be.visible')
    cy.get('[aria-label="Lists"]').should('have.attr', 'aria-expanded', 'true')
    cy.contains('[role="menuitemradio"]', 'Bullet list').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
  })

  it('keeps a different menu open when a previous keyboard command focus frame is late', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').focus()
    cy.press(Cypress.Keyboard.Keys.ENTER)
    cy.get('[role="menu"]').should('be.visible')
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, true)
    cy.get('[aria-label="Lists"]').focus()
    cy.press(Cypress.Keyboard.Keys.ENTER)
    cy.get('[role="menu"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
    releaseFrames(frames)
    cy.get('[role="menu"]').should('be.visible')
    cy.get('[aria-label="Lists"]').should('have.attr', 'aria-expanded', 'true')
    cy.contains('[role="menuitemradio"]', 'Bullet list').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
  })

  it('restores the editor selection and allows typing after a single format command', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Bold').click()
    cy.get('.tiptap').should('be.focused')
    cy.window().should((win) => expect(win.getSelection()?.toString()).to.equal('Paragraph 0'))
    cy.press('x')
    cy.get('.tiptap p').first().find('strong').should('have.text', 'x')
  })

  it('does not move focus after the editor has unmounted', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    cy.mount(<button type="button" data-cy="after-editor">Next control</button>)
    cy.get('[data-cy="after-editor"]').focus().should('be.focused')
    releaseFrames(frames)
    cy.get('[data-cy="after-editor"]').should('be.focused')
    cy.get('.tiptap').should('not.exist')
  })

  it('ignores the pending focus when only the toolbar unmounts', () => {
    function ToolbarLifetimeEditor() {
      const [visible, setVisible] = React.useState(true)
      const [container, setContainer] = React.useState<HTMLDivElement | null>(null)
      return <>
        <button data-cy="hide-toolbar" onClick={() => setVisible(false)}>Hide toolbar</button>
        <div ref={setContainer} />
        <RichTextEditor initialContent="<p>Pane A text</p>" hideToolbar={!visible} mobileToolbarContainer={container} />
      </>
    }
    cy.viewport(320, 740)
    cy.mount(<ToolbarLifetimeEditor />)
    cy.get('.tiptap').should('contain.text', 'Pane A text')
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    // Programmatic click omits pointerdown so cleanup, rather than another
    // pointer interaction, must invalidate the editor's queued callback.
    cy.get('[data-cy="hide-toolbar"]').then(($button) => $button[0].click())
    cy.get('[aria-label="Text formatting"]').should('not.exist')
    cy.get('.tiptap').then(($editor) => cy.spy($editor[0], 'focus').as('unmountedToolbarFocus'))
    releaseFrames(frames)
    cy.get('@unmountedToolbarFocus').should('not.have.been.called')
    cy.get('.tiptap').focus().type('x').should('contain.text', 'x')
  })

  it('does not move focus back from a second mounted editor', () => {
    function EditorPair() {
      const [firstToolbar, setFirstToolbar] = React.useState<HTMLDivElement | null>(null)
      const [secondToolbar, setSecondToolbar] = React.useState<HTMLDivElement | null>(null)
      return <>
        <section data-cy="first-pane"><div ref={setFirstToolbar} /><RichTextEditor initialContent="<p>Pane A text</p>" mobileToolbarContainer={firstToolbar} /></section>
        <section data-cy="second-pane"><div ref={setSecondToolbar} /><RichTextEditor initialContent="<p>Pane B text</p>" mobileToolbarContainer={secondToolbar} /></section>
      </>
    }
    viewportAfterResize(320, 740)
    cy.mount(<EditorPair />)
    cy.get('[data-cy="first-pane"] .tiptap').should('contain.text', 'Pane A text')
    cy.get('[data-cy="second-pane"] .tiptap').should('contain.text', 'Pane B text')
    selectFirstParagraph()
    cy.get('[data-cy="first-pane"] [aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    cy.get('[data-cy="second-pane"] .tiptap').focus().should('be.focused')
    releaseFrames(frames)
    cy.get('[data-cy="second-pane"] .tiptap').should('be.focused').type('!').should('contain.text', '!')
    cy.get('[data-cy="first-pane"] .tiptap').should('not.contain.text', '!')
    cy.get('[data-cy="second-pane"] .tiptap p').first().click().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      selectionFrom(doc).removeAllRanges()
      selectionFrom(doc).addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.get('[data-cy="second-pane"] [data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.contains('[role="option"]', '14 pt').click()
    cy.get('[data-cy="second-pane"] .tiptap').should('be.focused')
    cy.press('?')
    cy.get('[data-cy="second-pane"] .tiptap p').first().find('span[style*="font-size: 14pt"]').should('have.text', '?')
    cy.get('[data-cy="first-pane"] .tiptap strong').should('have.text', 'Pane A text')
  })

  it('ignores an older command frame when a later command finishes first', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const firstFrames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(firstFrames, false)
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const secondFrames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(secondFrames, false, 'Italic')
    cy.get('.tiptap').then(($editor) => cy.spy($editor[0], 'focus').as('reverseDeliveryFocus'))
    releaseFrames(secondFrames)
    cy.get('.tiptap').should('be.focused')
    cy.get('@reverseDeliveryFocus').should('have.been.calledOnce')
    releaseFrames(firstFrames)
    cy.get('@reverseDeliveryFocus').should('have.been.calledOnce')
    cy.press('z')
    cy.get('.tiptap p').first().find('strong').should('have.text', 'z')
    cy.get('.tiptap p').first().find('em').should('have.text', 'z')
  })

  it('keeps the same menu open when an earlier focus frame is late', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.get('[role="menu"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
    releaseFrames(frames)
    cy.get('[aria-label="Text formatting"]').should('have.attr', 'aria-expanded', 'true')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
  })

  it('does not steal focus from another field after a formatting command', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    cy.get('[aria-label="Note title"]').focus().should('be.focused')
    releaseFrames(frames)
    cy.get('[aria-label="Note title"]').should('be.focused')
  })

  it('restores the editor when focus returns to the original menu trigger', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    cy.get('[aria-label="Text formatting"]').focus().should('be.focused')
    releaseFrames(frames)
    cy.get('.tiptap').should('be.focused')
  })

  it('still restores the editor after a printable key arrives before its focus frame', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    // A key on the closing menu's fallback focus must not cancel the pending
    // return to the editor. This does not claim that the first key was typed.
    cy.press('x')
    releaseFrames(frames)
    cy.get('.tiptap').should('be.focused')
    cy.press('y')
    cy.get('.tiptap p').first().find('strong').should('have.text', 'y')
  })

  it('still restores the editor after a dead key arrives before its focus frame', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    cy.window().then((win) => {
      win.document.activeElement?.dispatchEvent(new win.KeyboardEvent('keydown', { key: 'Dead', bubbles: true }))
    })
    releaseFrames(frames)
    cy.get('.tiptap').should('be.focused')
    cy.press('y')
    cy.get('.tiptap p').first().find('strong').should('have.text', 'y')
  })

  it('cancels a pending focus before an assistive click opens font size', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    cy.get('.tiptap').then(($editor) => cy.spy($editor[0], 'focus').as('editorRefocus'))
    cy.get('[data-cy="font-size-button"]').scrollIntoView().then(($button) => {
      const win = $button[0].ownerDocument.defaultView!
      $button[0].click()
      frames.forEach(callback => callback(win.performance.now()))
    })
    cy.get('@editorRefocus').should('not.have.been.called')
    cy.get('[data-cy="font-size-button"]').should('have.attr', 'aria-expanded', 'true')
    cy.get('[role="listbox"]').should('be.visible')
  })

  it('cancels a pending focus before an assistive click opens text color', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    cy.get('.tiptap').then(($editor) => cy.spy($editor[0], 'focus').as('editorRefocus'))
    cy.get('[data-cy="color-button"]').scrollIntoView().then(($button) => {
      const win = $button[0].ownerDocument.defaultView!
      $button[0].click()
      frames.forEach(callback => callback(win.performance.now()))
    })
    cy.get('@editorRefocus').should('not.have.been.called')
    cy.get('[data-cy="color-button"]').should('have.attr', 'aria-expanded', 'true')
    cy.get('[role="dialog"]').should('be.visible')
  })

  it('keeps focus in the new menu after a delayed font size selection', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    chooseToolbarOptionWhileHoldingFrames('[role="option"]', '14 pt', frames)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[aria-label="Lists"]').scrollIntoView()
    tap('[aria-label="Lists"]')
    cy.get('[role="menu"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
    releaseFrames(frames)
    cy.get('[aria-label="Lists"]').should('have.attr', 'aria-expanded', 'true')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
  })

  it('keeps focus in the new menu after a delayed font family selection', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[data-cy="font-family-button"]').scrollIntoView().click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    chooseToolbarOptionWhileHoldingFrames('[role="option"]', 'Monospace', frames)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[aria-label="Lists"]').scrollIntoView()
    tap('[aria-label="Lists"]')
    cy.get('[role="menu"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
    releaseFrames(frames)
    cy.get('[aria-label="Lists"]').should('have.attr', 'aria-expanded', 'true')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
  })

  it('keeps focus in the new menu after a delayed text color selection', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[data-cy="color-button"]').scrollIntoView().click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    chooseToolbarOptionWhileHoldingFrames('.twitter-picker [title]', null, frames)
    cy.get('[aria-label="Lists"]').scrollIntoView()
    tap('[aria-label="Lists"]')
    cy.get('[role="menu"]').should('be.visible')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
    releaseFrames(frames)
    cy.get('[aria-label="Lists"]').should('have.attr', 'aria-expanded', 'true')
    cy.focused().should(($focused) => expect($focused.closest('[role="menu"]').length).to.equal(1))
  })

  it('restores the selection and allows typing after choosing a font size', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.contains('[role="option"]', '14 pt').click()
    cy.get('.tiptap').should('be.focused')
    cy.window().should((win) => expect(win.getSelection()?.toString()).to.equal('Paragraph 0'))
    cy.press('x')
    cy.get('.tiptap p').first().find('span[style*="font-size: 14pt"]').should('have.text', 'x')
  })

  it('keeps the editor focused when font size close autofocus arrives after the focus frame', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    const focusedBeforeClose: boolean[] = []
    cy.get('[role="listbox"][data-state="open"]').should('be.visible').then(($listbox) => {
      const listbox = $listbox[0]
      const doc = listbox.ownerDocument
      const win = doc.defaultView!
      // Radix emits this event immediately before its close autofocus handler.
      listbox.addEventListener('focusScope.autoFocusOnUnmount', () => {
        frames.forEach(callback => callback(win.performance.now()))
        focusedBeforeClose.push(doc.activeElement === doc.querySelector('.tiptap'))
      }, { once: true })
    })
    chooseToolbarOptionWhileHoldingFrames('[role="option"]', '14 pt', frames)
    cy.get('[role="listbox"]').should('not.exist')
    cy.wrap(focusedBeforeClose).should('deep.equal', [true])
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p').first().find('span[style*="font-size: 14pt"]').should('have.text', 'x')
  })

  it('restores the editor when font size close autofocus arrives before the focus frame', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    const frames: FrameRequestCallback[] = []
    const closeEvents: string[] = []
    cy.get('[role="listbox"][data-state="open"]').should('be.visible').then(($listbox) => {
      $listbox[0].addEventListener('focusScope.autoFocusOnUnmount', () => closeEvents.push('closed'), { once: true })
    })
    chooseToolbarOptionWhileHoldingFrames('[role="option"]', '14 pt', frames)
    cy.get('[role="listbox"]').should('not.exist')
    cy.wrap(closeEvents).should('deep.equal', ['closed'])
    releaseFrames(frames)
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p').first().find('span[style*="font-size: 14pt"]').should('have.text', 'x')
  })

  it('observes a viewport resize that arrives before the promise is awaited', () => {
    cy.window().then(win => {
      const observation = observeViewportResize(win, win.innerWidth, win.innerHeight)
      win.dispatchEvent(new win.Event('resize'))
      return observation.promise.then(() => {
        expect(win.innerWidth).to.be.greaterThan(0)
      }).finally(observation.cancel)
    })
  })

  it('closes the font size menu when the viewport really changes', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    cy.get('[data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.get('[role="listbox"]').should('be.visible')
    viewportAfterResize(360, 740)
    cy.window().its('innerWidth').should('equal', 360)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[data-cy="font-size-button"]').should('have.attr', 'aria-expanded', 'false')
  })

  it('dismisses the font size menu when Escape follows a delayed tooltip', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.get('[data-cy="font-size-button"]').scrollIntoView()
      .trigger('pointermove', { eventConstructor: 'PointerEvent', pointerType: 'mouse' })
      .click({ scrollBehavior: false })
    cy.get('[role="listbox"]').should('be.visible')
    // Allow the toolbar tooltip delay to elapse before dismissing the menu.
    cy.tick(250)
    cy.get('[role="listbox"]').should('be.visible')
    cy.get('[data-cy="font-size-button"]').should('have.attr', 'aria-expanded', 'true')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.tick(1)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[data-cy="font-size-button"]').should('be.focused')
  })

  it('dismisses the font family menu when Escape follows a delayed tooltip', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.get('[data-cy="font-family-button"]').scrollIntoView()
      .trigger('pointermove', { eventConstructor: 'PointerEvent', pointerType: 'mouse' })
      .click({ scrollBehavior: false })
    cy.get('[role="listbox"]').should('be.visible')
    cy.tick(250)
    cy.get('[role="listbox"]').should('be.visible')
    cy.get('[data-cy="font-family-button"]').should('have.attr', 'aria-expanded', 'true')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.tick(1)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[data-cy="font-family-button"]').should('be.focused')
  })

  it('dismisses the desktop font size menu after a hover with one Escape', () => {
    viewportAfterResize(1440, 900)
    mountLongEditor()
    cy.clock(Date.now(), ['setTimeout', 'clearTimeout'])
    cy.get('[data-cy="font-size-button"]')
      .trigger('pointermove', { eventConstructor: 'PointerEvent', pointerType: 'mouse' })
      .click()
    cy.get('[role="listbox"]').should('be.visible')
    cy.tick(250)
    cy.get('[role="listbox"]').should('be.visible')
    cy.get('[data-cy="font-size-button"]').should('have.attr', 'aria-expanded', 'true')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.tick(1)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[data-cy="font-size-button"]').should('be.focused')
  })

  it('exposes the font size tooltip to keyboard users and dismisses its menu', () => {
    viewportAfterResize(320, 740)
    mountLongEditor()
    cy.get('[data-cy="font-family-button"]').scrollIntoView().focus()
    cy.press(Cypress.Keyboard.Keys.TAB)
    cy.get('[data-cy="font-size-button"]').should('be.focused').should(($trigger) => {
      const tooltipId = $trigger.attr('aria-describedby')
      expect(tooltipId, 'keyboard focus describes the control').to.be.a('string').and.not.empty
      expect($trigger[0].ownerDocument.getElementById(tooltipId ?? '')?.textContent).to.equal('Font size')
    })
    cy.press(Cypress.Keyboard.Keys.ENTER)
    cy.get('[role="listbox"]').should('be.visible')
    cy.get('[data-cy="font-size-button"]').should('have.attr', 'aria-expanded', 'true')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="listbox"]').should('not.exist')
    cy.get('[data-cy="font-size-button"]').should('be.focused')
  })

  it('returns focus to the font size trigger when dismissed without a choice', () => {
    const escapeTrace: EscapeTrace = { event: null, menu: null, capture: null, transitions: [] }
    viewportAfterResize(320, 740)
    mountLongEditor()
    cy.get('[data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.get('[role="listbox"]').should('be.visible').then(($listbox) => {
      const menu = $listbox[0]
      const doc = menu.ownerDocument
      const win = doc.defaultView
      const trigger = doc.querySelector('[data-cy="font-size-button"]')
      if (!win || !trigger) throw new Error('Missing font menu context')
      escapeTrace.menu = menu
      const onKeyDown = (event: KeyboardEvent) => {
        if (event.key !== 'Escape') return
        const target = event.target instanceof win.Element ? event.target : null
        escapeTrace.event = event
        escapeTrace.capture = {
          at: win.performance.now(), trusted: event.isTrusted, cancelable: event.cancelable,
          defaultPrevented: event.defaultPrevented, targetTag: target?.tagName ?? null, targetRole: target?.getAttribute('role') ?? null,
        }
      }
      const observer = new win.MutationObserver((mutations) => {
        for (const mutation of mutations) {
          const attribute = mutation.attributeName
          if (!attribute) continue
          const target = mutation.target === trigger ? trigger : menu
          escapeTrace.transitions.push({
            at: win.performance.now(), target: target === trigger ? 'trigger' : 'menu', attribute,
            previous: mutation.oldValue, current: target.getAttribute(attribute),
          })
          if (escapeTrace.transitions.length > 20) escapeTrace.transitions.shift()
        }
      })
      stopEscapeTrace = () => {
        doc.removeEventListener('keydown', onKeyDown, true)
        observer.disconnect()
      }
      doc.addEventListener('keydown', onKeyDown, { capture: true, passive: true })
      observer.observe(trigger, { attributes: true, attributeFilter: ['aria-expanded'], attributeOldValue: true })
      observer.observe(menu, { attributes: true, attributeFilter: ['data-state'], attributeOldValue: true })
    })
    cy.get('[data-cy="font-size-button"]').should('have.attr', 'aria-expanded', 'true')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('body').should(($body) => {
      const doc = $body[0].ownerDocument
      expect(Cypress.$(doc).find('[role="listbox"]').length, `font-size menu is removed; ${fontMenuDiagnostic(doc, escapeTrace)}`).to.equal(0)
    })
    cy.get('[data-cy="font-size-button"]').should('be.focused')
  })

  it('restores the selection and allows typing after choosing a text color', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[data-cy="color-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.get('.twitter-picker [title="#FF6900"]').click()
    cy.get('.tiptap').should('be.focused')
    cy.window().should((win) => expect(win.getSelection()?.toString()).to.equal('Paragraph 0'))
    cy.press('x')
    cy.get('.tiptap p').first().find('span[style*="color"]').should('have.text', 'x')
  })

  it('saves the chosen text color together with the font size', () => {
    viewportAfterResize(320, 740)
    mountShortEditor()
    selectFirstParagraph()
    cy.get('[data-cy="font-size-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.contains('[role="option"]', '14 pt').scrollIntoView().click()
    cy.get('[data-cy="color-button"]').scrollIntoView().click({ scrollBehavior: false })
    cy.get('.twitter-picker [title="#FF6900"]').click()
    cy.get('.tiptap').should(($editor) => {
      const editor = $editor[0]
      const doc = editor.ownerDocument
      const active = doc.activeElement as HTMLElement | null
      expect(active, `active=${active?.tagName}:${active?.getAttribute('aria-label')}, documentHasFocus=${doc.hasFocus()}, visibility=${doc.visibilityState}`).to.equal(editor)
    })
    cy.get('[data-cy="note-save-button"]').click()
    cy.get('@saveNote').should('have.been.calledOnce')
    cy.get('@saveNote').its('firstCall.args.0.description')
      .should('contain', 'font-size: 14pt')
      .and('match', /color:\s*(?:rgb\(255, 105, 0\)|#ff6900)/i)
      .and('contain', 'Short text')
  })

  it('keeps a collapsed formatting mark when typing after the menu closes', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    cy.get('.tiptap p').first().click().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      range.collapse(false)
      selectionFrom(doc).removeAllRanges()
      selectionFrom(doc).addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Bold').click()
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p').first().find('strong').should('have.text', 'x')
  })

  it('preserves an existing stored mark when adding another at a collapsed caret', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    cy.get('.tiptap p').first().click().then(($paragraph) => {
      const doc = $paragraph[0].ownerDocument
      const range = doc.createRange()
      range.selectNodeContents($paragraph[0])
      range.collapse(false)
      selectionFrom(doc).removeAllRanges()
      selectionFrom(doc).addRange(range)
      doc.dispatchEvent(new Event('selectionchange'))
    })
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Bold').click()
    cy.get('.tiptap').should('be.focused')
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.contains('[role="menuitemcheckbox"]', 'Italic').click()
    cy.get('.tiptap').should('be.focused')
    cy.press('x')
    cy.get('.tiptap p').first().find('strong').should('have.text', 'x')
    cy.get('.tiptap p').first().find('em').should('have.text', 'x')
  })

  it('returns focus to the trigger when a menu is dismissed with Escape', () => {
    cy.viewport(320, 740)
    mountLongEditor()
    cy.get('[aria-label="Text formatting"]').focus()
    cy.press(Cypress.Keyboard.Keys.ENTER)
    cy.get('[role="menu"]').should('be.visible')
    cy.press(Cypress.Keyboard.Keys.ESC)
    cy.get('[role="menu"]').should('not.exist')
    cy.get('[aria-label="Text formatting"]').should('be.focused')
  })

  it('focuses the editor synchronously for an emulated Android selection', () => {
    cy.viewport(320, 740)
    cy.window().then((win) => {
      const original = Object.getOwnPropertyDescriptor(win.navigator, 'userAgent')
      Object.defineProperty(win.navigator, 'userAgent', { configurable: true, value: 'Mozilla/5.0 (Linux; Android 13) AppleWebKit/537.36 Chrome/120 Mobile Safari/537.36' })
      restoreNavigator = () => {
        if (original) Object.defineProperty(win.navigator, 'userAgent', original)
        else Reflect.deleteProperty(win.navigator, 'userAgent')
      }
    })
    mountLongEditor()
    selectFirstParagraph()
    cy.get('[aria-label="Text formatting"]').click({ scrollBehavior: false })
    cy.get('.tiptap').then(($editor) => cy.spy($editor[0], 'focus').as('androidEditorFocus'))
    const frames: FrameRequestCallback[] = []
    selectFormatWhileHoldingFrames(frames, false)
    // Native mobile keyboards require focus within the selection event, before
    // the deferred animation frame has run.
    cy.get('@androidEditorFocus').should('have.been.called')
    releaseFrames(frames)
    cy.get('.tiptap').should('be.focused')
  })

})
