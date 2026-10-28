"use client"

import { useAppBackHandler, APP_BACK_PRIORITY } from "@ui/web/lib/appBack"
import * as React from "react"
import { CircleNotch as Loader2 } from "@phosphor-icons/react"
import { useQuery } from "@tanstack/react-query"
import { useRouter } from "next/navigation"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"

import { cn } from "@ui/web/lib/utils"
import { PullToRefresh } from "@/components/PullToRefresh"
import { Sidebar } from "@/components/features/notes/Sidebar"
import { NoteList } from "@/components/features/notes/NoteList"
import { NoteEditor, type NoteEditorHandle, type PendingChunkFocus } from "@/components/features/notes/NoteEditor"
import { NoteView } from "@/components/features/notes/NoteView"
import { EmptyState } from "@/components/features/notes/EmptyState"
import { SearchResultsPanel } from "@/components/features/notes/SearchResultsPanel"
import type { SearchResultsPanelHandle } from "@/components/features/notes/SearchResultsPanel"
import type { Note } from "@core/types/domain"
import type { NoteAppController } from "@ui/web/hooks/useNoteAppController"
import { normalizeTag, normalizeTagList } from "@ui/web/lib/tags"
import { useAllTagsQuery } from "@ui/web/hooks/useNotesQuery"
import { useIsMobile } from "@ui/web/hooks/use-mobile"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import { WordPressSettingsService } from "@core/services/wordpressSettings"
import { ApiKeysSettingsService } from "@core/services/apiKeysSettings"
import { saveSettingsReturnState } from "@ui/web/lib/settingsNavigationState"
import { consumeActiveSettingsNoteReturnPath } from "@ui/web/lib/aiIndexNavigationState"
import { getTabLabel, NotesTabStrip } from "@/components/features/notes/NotesTabStrip"
import { MobileNotesTabMenu } from "@/components/features/notes/MobileNotesTabMenu"
import { SplitEmptyPane, SplitNotePreview } from "@/components/features/notes/SplitNotePreview"
import { Button } from "@/components/ui/button"

import { MobileWorkspace } from "@/components/features/navigation/MobileWorkspace"
import { NavRail } from "@/components/features/navigation/NavRail"
import { TagsPage } from "@/components/features/tags/TagsPage"
import { MAX_NOTE_WORKSPACE_TABS } from "@core/services/noteWorkspaceTabs"

type NoteRecord = Note & {
  content?: string | null
  headline?: string | null
  rank?: number | null
}

type NotesShellProps = {
  controller: NoteAppController
}

type SplitViewState = {
  leftTabId: string
  rightTabId: string
  focusedTabId: string
}

// Below this width there is not enough room for two useful note surfaces.
const MIN_SPLIT_WORKSPACE_WIDTH = 680

export function NotesShell({ controller }: NotesShellProps) {

  const router = useRouter()
  const isMobile = useIsMobile()
  const noteEditorRef = React.useRef<NoteEditorHandle | null>(null)
  const searchPanelRef = React.useRef<SearchResultsPanelHandle | null>(null)
  const { supabase } = useSupabase()
  const wordpressSettingsService = React.useMemo(() => new WordPressSettingsService(supabase), [supabase])
  const apiKeysService = React.useMemo(() => new ApiKeysSettingsService(supabase), [supabase])
  const [wordpressConfigured, setWordpressConfigured] = React.useState(false)

  const [pendingChunkFocus, setPendingChunkFocus] = React.useState<PendingChunkFocus | null>(null)
  const workspaceRef = React.useRef<HTMLDivElement | null>(null)
  const [workspaceWidth, setWorkspaceWidth] = React.useState(0)
  const [split, setSplit] = React.useState<SplitViewState | null>(null)
  const [splitOpening, setSplitOpening] = React.useState(false)
  const [pendingSplit, setPendingSplit] = React.useState<{ leftTabId: string, rightTabId: string } | null>(null)
  const splitOpeningRef = React.useRef(false)
  const paneFocusTargetRef = React.useRef<string | null>(null)
  const viewScrollsRef = React.useRef(new Map<string, { noteId: string | null, scrollTop: number }>())

  React.useEffect(() => {
    controller.registerNoteEditorRef(noteEditorRef)
  }, [controller])

  const user = controller.user
  const { data: apiKeysStatus } = useQuery({
    queryKey: ['apiKeysStatus', user?.id],
    queryFn: () => apiKeysService.getStatus(),
    staleTime: 5 * 60 * 1000,
    enabled: Boolean(user?.id),
  })
  const hasGeminiApiKey = apiKeysStatus?.gemini?.configured ?? false

  const {
    notesDisplayed,
    notesTotal,
    selectionMode,
    selectedCount,
    bulkDeleting,
    enterSelectionMode,
    exitSelectionMode,
    selectAllVisible,
    deleteSelectedNotes,
    filterByTag,
    handleClearTagFilter,
    handleCreateNote,
    handleSignOut,
    pendingCount,
    failedCount,
    isOffline,
    selectedNote,
    isEditing,
    notePaneVisible,
    tabs = [],
    activeTabId = '',
    addTab,
    activateTab,
    closeTab,
    handleTabViewSessionChange,
    registerWorkspaceViewCapture,
    canAddTab = true,
    workspaceHydrated = true,
    handleSelectNote,
    hideNotePane,
    isSearchPanelOpen,
    setIsSearchPanelOpen,
    activeMainView,
    setActiveMainView,
    handleRenameTag,
    handleDeleteTag,
    notes,
    notesQuery,
    tagManagementBlockReason,
    checkTagCoverage,
    loadMoreTagNotes,
    checkingTagCoverage,
    tagMutationInProgress,
  } = controller

  const tabsRef = React.useRef(tabs)
  const activeTabIdRef = React.useRef(activeTabId)
  React.useLayoutEffect(() => { tabsRef.current = tabs }, [tabs])
  React.useLayoutEffect(() => { activeTabIdRef.current = activeTabId }, [activeTabId])
  const recordViewScroll = React.useCallback((tabId: string, noteId: string | null, scrollTop: number) => {
    viewScrollsRef.current.set(tabId, { noteId, scrollTop })
  }, [])
  const captureViewScrolls = React.useCallback(() => {
    for (const tab of tabsRef.current) {
      const view = viewScrollsRef.current.get(tab.id)
      // A tab may have been reused for a different note since its last scroll.
      // The active editor captures its own (potentially newer) position.
      if (view && view.noteId === tab.noteId && !(tab.id === activeTabIdRef.current && tab.mode === "editing") && view.scrollTop !== tab.view.scrollTop) {
        handleTabViewSessionChange?.(tab.id, tab.noteId, { scrollTop: view.scrollTop })
      }
    }
  }, [handleTabViewSessionChange])

  React.useEffect(() => {
    registerWorkspaceViewCapture?.(captureViewScrolls)
    return () => registerWorkspaceViewCapture?.(null)
  }, [captureViewScrolls, registerWorkspaceViewCapture])

  React.useEffect(() => {
    const workspace = workspaceRef.current
    if (!workspace) return
    const measure = () => {
      captureViewScrolls()
      setWorkspaceWidth(workspace.getBoundingClientRect().width)
    }
    measure()
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", measure)
      return () => window.removeEventListener("resize", measure)
    }
    const observer = new ResizeObserver(measure)
    observer.observe(workspace)
    return () => observer.disconnect()
  }, [activeMainView, captureViewScrolls])

  // Creating an empty tab is asynchronous because it first flushes the old
  // editor. Resolve its identity only after the workspace state has committed.
  React.useEffect(() => {
    if (!pendingSplit) return
    if (!tabs.some((tab) => tab.id === pendingSplit.leftTabId)) {
      setPendingSplit(null)
      return
    }
    if (!tabs.some((tab) => tab.id === pendingSplit.rightTabId)) return
    setSplit({ ...pendingSplit, focusedTabId: pendingSplit.rightTabId })
    setPendingSplit(null)
  }, [pendingSplit, tabs])

  // Selecting a third tab replaces the last active pane; selecting either
  // visible tab just transfers focus. Closing a pane returns to one view.
  React.useEffect(() => {
    setSplit((current) => {
      if (!current) return current
      if (!tabs.some((tab) => tab.id === current.leftTabId) || !tabs.some((tab) => tab.id === current.rightTabId)) return null
      if (activeTabId === current.leftTabId || activeTabId === current.rightTabId) {
        return current.focusedTabId === activeTabId ? current : { ...current, focusedTabId: activeTabId }
      }
      return current.focusedTabId === current.leftTabId
        ? { ...current, leftTabId: activeTabId, focusedTabId: activeTabId }
        : { ...current, rightTabId: activeTabId, focusedTabId: activeTabId }
    })
  }, [activeTabId, tabs])

  React.useEffect(() => {
    if (paneFocusTargetRef.current !== activeTabId) return
    paneFocusTargetRef.current = null
    workspaceRef.current?.querySelector<HTMLElement>('[data-active-pane="true"]')?.focus()
  }, [activeTabId])

  const handleActivatePane = React.useCallback(async (tabId: string) => {
    paneFocusTargetRef.current = tabId
    if (!(await activateTab(tabId))) paneFocusTargetRef.current = null
  }, [activateTab])

  const handleToggleSplit = React.useCallback(async () => {
    if (split) {
      captureViewScrolls()
      setSplit(null)
      return
    }
    if (splitOpeningRef.current || pendingSplit || !activeTabId) return
    const other = tabs.find((tab) => tab.id !== activeTabId && tab.note) ?? tabs.find((tab) => tab.id !== activeTabId)
    if (other) {
      setSplit({ leftTabId: activeTabId, rightTabId: other.id, focusedTabId: activeTabId })
      return
    }
    splitOpeningRef.current = true
    setSplitOpening(true)
    try {
      const rightTabId = await addTab()
      if (rightTabId) setPendingSplit({ leftTabId: activeTabId, rightTabId })
    } finally {
      splitOpeningRef.current = false
      setSplitOpening(false)
    }
  }, [activeTabId, addTab, captureViewScrolls, pendingSplit, split, tabs])

  const checkTagCoverageRef = React.useRef(checkTagCoverage)
  React.useEffect(() => { checkTagCoverageRef.current = checkTagCoverage }, [checkTagCoverage])
  React.useEffect(() => {
    if (activeMainView === 'tags' && user?.id && workspaceHydrated) void checkTagCoverageRef.current?.()
  }, [activeMainView, user?.id, workspaceHydrated])

  const refreshWordPressStatus = React.useCallback(async () => {
    try {
      const status = await wordpressSettingsService.getStatus()
      setWordpressConfigured(status.configured)
    } catch {
      setWordpressConfigured(false)
    }
  }, [wordpressSettingsService])

  React.useEffect(() => {
    void refreshWordPressStatus()
  }, [refreshWordPressStatus, user?.id])

  const handleOpenInContext = React.useCallback(async (noteId: string, charOffset: number, chunkLength: number) => {
    let note = controller.notes.find((n) => n.id === noteId)

    if (!note) {
      // Note not in the current paginated list — fetch it from the DB
      try {
        const { data } = await supabase
          .from('notes')
          .select('id, title, description, tags, created_at, updated_at, user_id')
          .eq('id', noteId)
          .maybeSingle()
        if (!data) return
        note = data as Note
      } catch (error) {
        console.error("Failed to fetch note for open-in-context", { noteId, error })
        return
      }
    }
    if (!note) return  // TypeScript: narrowing lost after await + let reassignment

    const nextPendingChunkFocus = {
      requestId: `${noteId}:${charOffset}:${chunkLength}:${Date.now()}`,
      noteId,
      charOffset,
      chunkLength,
    }
    setPendingChunkFocus(nextPendingChunkFocus)

    if (controller.selectedNote?.id === noteId && controller.isEditing) {
      return
    }

    await controller.handleEditNote(note)
  }, [controller, supabase])

  const showEditor = notePaneVisible ?? !!(selectedNote || isEditing)
  const handleOpenSearchPanel = React.useCallback(async () => {
    if (tagMutationInProgress) return
    if (isMobile && showEditor && !(await hideNotePane())) return
    if (activeMainView !== "notes") {
      setActiveMainView("notes")
    }
    if (isSearchPanelOpen) {
      searchPanelRef.current?.focusInput()
      return
    }
    setIsSearchPanelOpen(true)
  }, [activeMainView, hideNotePane, isMobile, isSearchPanelOpen, setActiveMainView, setIsSearchPanelOpen, showEditor, tagMutationInProgress])

  const handleSelectMainView = React.useCallback(async (view: "notes" | "tags") => {
    if (tagMutationInProgress) return
    if (view === "tags" && controller.prepareTagManagement && !(await controller.prepareTagManagement())) return
    if (showEditor && (isMobile || view !== activeMainView) && !(await hideNotePane())) return
    if (isMobile && view === "notes") {
      setIsSearchPanelOpen(false)
      if (selectionMode) exitSelectionMode()
    }
    setActiveMainView(view)
  }, [activeMainView, controller, exitSelectionMode, hideNotePane, isMobile, selectionMode, setActiveMainView, setIsSearchPanelOpen, showEditor, tagMutationInProgress])


  const handlePendingChunkFocusApplied = React.useCallback((requestId: string) => {
    setPendingChunkFocus((current) => (current?.requestId === requestId ? null : current))
  }, [])

  const handleOpenSettings = React.useCallback(async () => {
    if (tagMutationInProgress) return
    const notesUiState = await controller.captureSettingsReturnState()
    if (!notesUiState) return

    if (typeof globalThis.location !== "undefined") {
      saveSettingsReturnState({
        returnPath: `${globalThis.location.pathname}${globalThis.location.search}${globalThis.location.hash}`,
        notesUiState,
      })
    }

    router.push("/settings")
  }, [controller, router, tagMutationInProgress])

  const handleBackFromNote = React.useCallback(async () => {
    await noteEditorRef.current?.flushPendingSave()
    const settingsReturnPath = consumeActiveSettingsNoteReturnPath()
    if (settingsReturnPath) {
      router.push(settingsReturnPath)
      return
    }
    await handleSelectNote(null)
  }, [handleSelectNote, router])

  useAppBackHandler(APP_BACK_PRIORITY.navigation, async () => {
    if (tagMutationInProgress) return true
    if (isMobile && showEditor) await handleBackFromNote()
    else if (isSearchPanelOpen) setIsSearchPanelOpen(false)
    else if (selectionMode) exitSelectionMode()
    else if (showEditor) await handleBackFromNote()
    else if (activeMainView !== "notes") setActiveMainView("notes")
    else return false
    return true
  })

  const handleSelectTagFromTagsPage = React.useCallback((tag: string) => {
    if (tagMutationInProgress) return
    // A tag chosen from the tag browser represents all notes with that tag,
    // rather than the intersection with an earlier unrelated search.
    if (isMobile) controller.handleSearch("")
    controller.handleTagClick(tag).catch(() => undefined)
    setIsSearchPanelOpen(true)
    setActiveMainView("notes")
  }, [controller, isMobile, setActiveMainView, setIsSearchPanelOpen, tagMutationInProgress])

  // Derive the next pair during the same render as a tab switch, so the
  // editor never disappears while the reconciliation effect catches up.
  let displayedSplit = split
  if (displayedSplit && (!tabs.some((tab) => tab.id === displayedSplit!.leftTabId) || !tabs.some((tab) => tab.id === displayedSplit!.rightTabId))) {
    displayedSplit = null
  } else if (displayedSplit && activeTabId !== displayedSplit.leftTabId && activeTabId !== displayedSplit.rightTabId) {
    displayedSplit = displayedSplit.focusedTabId === displayedSplit.leftTabId
      ? { ...displayedSplit, leftTabId: activeTabId, focusedTabId: activeTabId }
      : { ...displayedSplit, rightTabId: activeTabId, focusedTabId: activeTabId }
  }
  const showBothPanes = Boolean(displayedSplit && !isMobile && workspaceWidth >= MIN_SPLIT_WORKSPACE_WIDTH)
  const paneIds = displayedSplit ? [displayedSplit.leftTabId, displayedSplit.rightTabId] : [activeTabId]

  return (
    <MobileWorkspace
      viewKey={`${activeMainView}:${activeTabId}:${selectedNote?.id ?? "list"}:${isEditing}:${isSearchPanelOpen}`}
      className="flex h-[100dvh] max-h-[100dvh] min-h-[100svh] bg-muted/20 overflow-hidden relative"
      data-testid="notes-shell"
    >
      {/* Main Navigation Rail (Desktop Dock & Mobile Bottom Bar) */}
      <NavRail
        activeView={activeMainView}
        searchActive={isMobile && isSearchPanelOpen && activeMainView === "notes" && !showEditor}
        onSelectView={(view) => {
          if (view === "settings") {
            void handleOpenSettings()
          } else {
            void handleSelectMainView(view)
          }
        }}
        onOpenSearch={() => void handleOpenSearchPanel()}
        onOpenSettings={() => void handleOpenSettings()}
      />

      {activeMainView === "tags" ? (
        <main className="flex-1 flex min-h-0 flex-col h-full overflow-hidden">
          <TagsPage
            notes={notes}
            onSelectTag={handleSelectTagFromTagsPage}
            onRenameTag={handleRenameTag}
            onDeleteTag={handleDeleteTag}
            managementBlockReason={tagManagementBlockReason}
            checkingNotes={checkingTagCoverage}
            loadingMoreNotes={notesQuery.isFetchingNextPage}
            onCheckNotes={!isOffline && checkTagCoverage ? () => void checkTagCoverage() : undefined}
            onLoadMoreNotes={!isOffline && notesQuery.hasNextPage && loadMoreTagNotes ? () => void loadMoreTagNotes() : undefined}
          />
        </main>
      ) : (
        <div className="flex min-h-0 min-w-0 flex-1 flex-col">
          <MobileNotesTabMenu
            tabs={tabs}
            activeTabId={activeTabId}
            showActiveTabTitle={showEditor}
            addTabDisabled={!workspaceHydrated || !canAddTab || splitOpening || Boolean(pendingSplit)}
            addTabCapacityPending={!workspaceHydrated}
            maximumTabCount={MAX_NOTE_WORKSPACE_TABS}
            onAddTab={() => void addTab?.()}
            onActivateTab={(tabId) => void activateTab?.(tabId)}
            onCloseTab={(tabId) => void closeTab?.(tabId)}
          />
          <div className="flex min-h-0 min-w-0 flex-1">
            <Sidebar
              user={user!}
              filterByTag={filterByTag}
              notesDisplayed={notesDisplayed}
              notesTotal={notesTotal}
              pendingCount={pendingCount}
              failedCount={failedCount}
              isOffline={isOffline}
              selectionMode={selectionMode}
              selectedCount={selectedCount}
              bulkDeleting={bulkDeleting}
              onEnterSelectionMode={enterSelectionMode}
              onExitSelectionMode={exitSelectionMode}
              onSelectAll={selectAllVisible}
              onBulkDelete={deleteSelectedNotes}
              onClearTagFilter={handleClearTagFilter}
              onOpenSettings={() => void handleOpenSettings()}
              onCreateNote={handleCreateNote}
              onSignOut={handleSignOut}
              onOpenSearch={() => void handleOpenSearchPanel()}
              className={cn((showEditor || isSearchPanelOpen) ? "hidden md:flex" : "w-full")}
              data-testid="sidebar-container"
            >
              <ListPane controller={controller} />
            </Sidebar>

            {isSearchPanelOpen && (
              <SearchResultsPanel
                ref={searchPanelRef}
                controller={controller}
                hasGeminiApiKey={hasGeminiApiKey}
                onOpenInContext={handleOpenInContext}
                onClose={() => setIsSearchPanelOpen(false)}
                className={cn(showEditor ? "hidden md:flex" : "w-full min-w-[300px] md:min-w-0")}
              />
            )}

            <main
              className={cn(
                "flex-1 flex min-h-0 min-w-0 flex-col h-full overflow-hidden",
                !showEditor ? "hidden md:flex" : "w-full"
              )}
              data-testid="editor-container"
            >
              <NotesTabStrip
                tabs={tabs}
                activeTabId={activeTabId}
                addTabDisabled={!workspaceHydrated || !canAddTab || splitOpening || Boolean(pendingSplit)}
                addTabCapacityPending={!workspaceHydrated}
                maximumTabCount={MAX_NOTE_WORKSPACE_TABS}
                onAddTab={() => void addTab?.()}
                onActivateTab={(tabId) => void activateTab?.(tabId)}
                onCloseTab={(tabId) => void closeTab?.(tabId)}
                onToggleSplit={() => void handleToggleSplit()}
                splitView={Boolean(split)}
                splitDisabled={splitOpening || Boolean(pendingSplit) || (!split && (!workspaceHydrated || (!canAddTab && tabs.length < 2)))}
              />
              {displayedSplit && !showBothPanes && !isMobile && (
                <div className="border-b border-border/50 bg-muted/20 px-4 py-2 text-xs text-muted-foreground" role="status">
                  Enlarge the workspace to show both notes.
                </div>
              )}
              <div ref={workspaceRef} className="flex-1 min-h-0 min-w-0 flex">
                {paneIds.map((tabId, index) => {
                  const tab = tabs.find((item) => item.id === tabId)
                  const active = tabId === activeTabId
                  const label = index === 0 ? "left" : "right"
                  return (
                    <section
                      key={tabId}
                      aria-label={displayedSplit ? `${label === "left" ? "Left" : "Right"} note pane` : undefined}
                      data-testid={displayedSplit ? `split-pane-${label}` : undefined}
                      data-active-pane={active ? "true" : undefined}
                      tabIndex={-1}
                      className={cn("flex min-h-0 min-w-0 flex-1 flex-col", displayedSplit && index === 1 && showBothPanes && "border-l border-border", displayedSplit && !showBothPanes && !active && "hidden")}
                    >
                      {displayedSplit && showBothPanes && (
                        <div className="flex h-11 shrink-0 items-center justify-between gap-2 border-b border-border/50 bg-muted/20 px-4">
                          <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
                            {label === "left" ? "Left" : "Right"} · {tab ? getTabLabel(tab) : "Note"}
                          </span>
                          {active ? (
                            <span className="shrink-0 text-xs font-medium text-primary">Active</span>
                          ) : (
                            <Button type="button" variant="ghost" size="sm" className="h-7 shrink-0 text-xs" aria-label={`Activate ${tab ? getTabLabel(tab) : "note"}`} onClick={() => void handleActivatePane(tabId)}>
                              Activate
                            </Button>
                          )}
                        </div>
                      )}
                      {active ? (
                        displayedSplit && tab && !tab.note && tab.mode !== "editing" ? <SplitEmptyPane /> : (
                          <EditorPane
                            controller={controller}
                            onBack={() => { void handleBackFromNote().catch(() => undefined) }}
                            noteEditorRef={noteEditorRef}
                            wordpressConfigured={wordpressConfigured}
                            pendingChunkFocus={pendingChunkFocus}
                            onPendingChunkFocusApplied={handlePendingChunkFocusApplied}
                            onReaderScroll={(scrollTop) => recordViewScroll(tabId, tab?.noteId ?? null, scrollTop)}
                          />
                        )
                      ) : tab && (
                        <SplitNotePreview tab={tab} onViewSessionChange={(view) => handleTabViewSessionChange?.(tabId, tab.noteId, view)} onViewScrollCapture={(scrollTop) => recordViewScroll(tabId, tab.noteId, scrollTop)} />
                      )}
                    </section>
                  )
                })}
              </div>
            </main>
          </div>
        </div>
      )}

      <DeleteNoteDialog controller={controller} />
      <DiscardFailedSaveDialog controller={controller} />
    </MobileWorkspace>
  )
}


function ListPane({ controller }: { controller: NoteAppController }) {
  const {
    notes,
    notesQuery,
    selectedNote,
    handleSelectNote,
    selectionMode,
    selectedNoteIds,
    toggleNoteSelection,
    handleTagClick,
  } = controller

  return (
    <PullToRefresh onRefresh={controller.refreshNotes}>
      <NoteList
        notes={notes as NoteRecord[]}
        isLoading={notesQuery.isLoading}
        selectedNoteId={selectedNote?.id}
        selectionMode={selectionMode}
        selectedIds={selectedNoteIds}
        onToggleSelect={(note) => toggleNoteSelection(note.id)}
        onSelectNote={(note) => handleSelectNote(note)}
        onDeleteNote={controller.handleDeleteNote}
        onTagClick={handleTagClick}
        onLoadMore={() => notesQuery.fetchNextPage()}
        hasMore={notesQuery.hasNextPage}
        isFetchingNextPage={notesQuery.isFetchingNextPage}
      />
    </PullToRefresh>
  )
}

function EditorPane({
  controller,
  onBack,
  noteEditorRef,
  wordpressConfigured,
  pendingChunkFocus,
  onPendingChunkFocusApplied,
  onReaderScroll,
}: {
  controller: NoteAppController
  onBack: () => void
  noteEditorRef: React.RefObject<NoteEditorHandle | null>
  wordpressConfigured: boolean
  pendingChunkFocus: PendingChunkFocus | null
  onPendingChunkFocusApplied: (requestId: string) => void
  onReaderScroll: (scrollTop: number) => void
}) {
  const {
    selectedNote,
    activeTab,
    activeTabId,
    isEditing,
    saving,
    autoSaving,
    lastSavedAt,
    handleSaveNote,
    handleReadNote,
    handleEditNote,
    handleDeleteNote,
    handleRemoveTagFromNote,
    notes,
  } = controller

  const { user } = useSupabase()
  const allTagsQuery = useAllTagsQuery({ userId: user?.id, enabled: !!user })

  const availableTags = React.useMemo(() => {
    if (allTagsQuery.data?.tags && allTagsQuery.data.tags.length > 0) {
      return allTagsQuery.data.tags
    }
    const collected = notes.flatMap((note) => note.tags ?? [])
    return normalizeTagList(collected)
  }, [allTagsQuery.data, notes])

  const tagCounts = React.useMemo(() => {
    if (allTagsQuery.data?.counts && Object.keys(allTagsQuery.data.counts).length > 0) {
      return allTagsQuery.data.counts
    }
    const counts: Record<string, number> = {}
    for (const note of notes) {
      if (!note.tags) continue
      const seenInNote = new Set<string>()
      for (const rawTag of note.tags) {
        if (typeof rawTag !== 'string') continue
        const tag = normalizeTag(rawTag)
        if (tag && !seenInNote.has(tag)) {
          seenInNote.add(tag)
          counts[tag] = (counts[tag] || 0) + 1
        }
      }
    }
    return counts
  }, [allTagsQuery.data, notes])

  // The editor treats its initial* props as an external snapshot and
  // reconciles them against local typing. The live tab draft echoes every
  // keystroke back through the controller, so it must be frozen per editor
  // session (tab + note + mode) — otherwise the echo is acknowledged as an
  // external refresh and the pending autosave is cancelled before it runs.
  const sessionDraft = React.useMemo(
    () => activeTab.draft,
    // eslint-disable-next-line react-hooks/exhaustive-deps -- session identity only; the live draft must not retrigger
    [activeTabId, activeTab.noteId, activeTab.mode],
  )

  if (!selectedNote && !isEditing) {
    return <EmptyState />
  }

  if (isEditing) {
    return (
      <NoteEditor
        ref={noteEditorRef}
        key={`workspace-tab-${activeTabId}`}
        noteId={selectedNote?.id}
        initialTitle={sessionDraft.title}
        initialDescription={sessionDraft.description}
        initialTags={sessionDraft.tags}
        initialSession={{ draft: sessionDraft, view: activeTab.view }}
        onDraftChange={controller.handleDraftChange}
        onViewSessionChange={controller.handleViewSessionChange}
        availableTags={availableTags}
        tagCounts={tagCounts}
        isSaving={saving}
        onSave={handleSaveNote}
        onRead={handleReadNote}
        onAutoSave={controller.handleAutoSave}
        isAutoSaving={autoSaving}
        lastSavedAt={lastSavedAt}
        wordpressConfigured={wordpressConfigured}
        onDelete={selectedNote ? () => handleDeleteNote(selectedNote) : undefined}
        onBack={onBack}
        pendingChunkFocus={pendingChunkFocus}
        onPendingChunkFocusApplied={onPendingChunkFocusApplied}
      />
    )
  }

  if (selectedNote) {
    return (
      <NoteView
        key={`workspace-tab-${activeTabId}-note-${selectedNote.id}`}
        note={selectedNote}
        onEdit={() => handleEditNote(selectedNote)}
        onDelete={() => handleDeleteNote(selectedNote)}
        onTagClick={controller.handleTagClick}
        onRemoveTag={(tag) => handleRemoveTagFromNote(selectedNote.id, tag)}
        onBack={onBack}
        wordpressConfigured={wordpressConfigured}
        initialScrollTop={activeTab.view.scrollTop}
        onRefresh={controller.refreshSelectedNote}
        onViewSessionChange={(view) => controller.handleTabViewSessionChange(activeTabId, activeTab.noteId, view)}
        onViewScrollCapture={onReaderScroll}
      />
    )
  }

  return (
    <div className="flex-1 flex items-center justify-center">
      <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
    </div>
  )
}

/**
 * Closing a tab whose save failed throws those edits away, so it confirms
 * first — in the app's own dialog, matching every other destructive action.
 */
function DiscardFailedSaveDialog({ controller }: { controller: NoteAppController }) {
  const { tabPendingClose, confirmCloseTab, cancelCloseTab } = controller

  return (
    <AlertDialog
      open={Boolean(tabPendingClose)}
      onOpenChange={(open) => {
        if (!open) cancelCloseTab?.()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Discard unsaved changes?</AlertDialogTitle>
          <AlertDialogDescription>
            &quot;{tabPendingClose?.label}&quot; could not be saved. Closing this tab discards those changes.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel data-cy="discard-failed-save-cancel">Keep editing</AlertDialogCancel>
          <AlertDialogAction
            data-cy="discard-failed-save-confirm"
            onClick={() => void confirmCloseTab?.()}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Discard and close
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

function DeleteNoteDialog({ controller }: { controller: NoteAppController }) {
  const {
    deleteDialogOpen,
    setDeleteDialogOpen,
    confirmDeleteNote,
    noteToDelete,
  } = controller
  const [deleting, setDeleting] = React.useState(false)
  const deletingRef = React.useRef(false)

  const handleConfirm = async () => {
    if (deletingRef.current) return
    deletingRef.current = true
    setDeleting(true)
    try {
      await confirmDeleteNote()
    } finally {
      deletingRef.current = false
      setDeleting(false)
    }
  }

  return (
    <AlertDialog open={deleteDialogOpen} onOpenChange={(open) => {
      if (!deletingRef.current) setDeleteDialogOpen(open)
    }}>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Note</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete &quot;{noteToDelete?.title}&quot;? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={deleting}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={(event) => {
            event.preventDefault()
            void handleConfirm()
          }} disabled={deleting} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {deleting ? 'Deleting...' : 'Delete'}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
