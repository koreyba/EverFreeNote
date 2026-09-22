import React from 'react'
import { dispatchAppBack } from '@ui/web/lib/appBack'
import '../../../../app/globals.css'
import { NotesShell } from '../../../../ui/web/components/features/notes/NotesShell'
import { MobileNotesTabMenu } from '@ui/web/components/features/notes/MobileNotesTabMenu'
import type { NoteAppController } from '../../../../ui/web/hooks/useNoteAppController'
import { SupabaseTestProvider } from '../../../../ui/web/providers/SupabaseProvider'
import type { SupabaseClient } from '@supabase/supabase-js'
import type { NoteWorkspaceTab } from '@core/services/noteWorkspaceTabs'
import { ThemeProvider } from '../../../../ui/web/components/theme-provider'


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

describe('Mobile Layout Adaptation', { retries: 0 }, () => {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mockUser = { id: 'test-user', email: 'test@example.com' } as any

  let createMockController: (overrides?: Partial<NoteAppController>) => NoteAppController
  let mockSupabase: SupabaseClient
  let restoreViewport: (() => void) | undefined

  afterEach(() => {
    restoreViewport?.()
    restoreViewport = undefined
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
      user: mockUser,
      loading: false,
      notes: [],

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      notesQuery: { isLoading: false, hasNextPage: false, isFetchingNextPage: false, fetchNextPage: cy.stub() } as any,
      selectedNote: null,
      isEditing: false,
      tabs: [activeTab],
      activeTabId: activeTab.id,
      activeTab,
      canAddTab: true,
      workspaceHydrated: true,
      addTab: cy.stub().resolves(),
      activateTab: cy.stub().resolves(),
      closeTab: cy.stub().resolves(),
      tabPendingClose: null,
      confirmCloseTab: cy.stub().resolves(),
      cancelCloseTab: cy.stub(),
      handleDraftChange: cy.stub(),
      handleViewSessionChange: cy.stub(),
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
    cy.viewport(390, 844)
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
    cy.get('[role="listbox"]').type('{esc}')
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
})
