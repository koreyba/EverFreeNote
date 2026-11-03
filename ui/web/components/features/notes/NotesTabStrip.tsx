"use client"

import { useCallback, useEffect, useRef, useState, type DragEvent, type KeyboardEvent, type WheelEvent } from "react"
import { WarningCircle as AlertCircle, CaretLeft as ChevronLeft, CaretRight as ChevronRight, CircleNotch as Loader2, Columns, Rectangle, Plus, Circle, X } from "@phosphor-icons/react"
import { MAX_NOTE_WORKSPACE_TABS, type NoteWorkspaceTab } from "@core/services/noteWorkspaceTabs"
import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"
import { useAnimatedTabList, TAB_TRANSITION_MS } from "@ui/web/hooks/useAnimatedTabList"
import { useNoteDragSource } from "@ui/web/providers/NoteDragProvider"
import { isNoteTabDrag } from "@ui/web/lib/noteDrag"

export type NotesTabStripProps = {
  tabs: NoteWorkspaceTab[]
  activeTabId: string
  onAddTab: () => void
  onActivateTab: (tabId: string) => void | Promise<void>
  onCloseTab: (tabId: string) => void | Promise<void>
  onReorderTab?: (tabId: string, targetTabId: string, position: 'before' | 'after') => void
  addTabDisabled?: boolean
  addTabCapacityPending?: boolean
  maximumTabCount?: number
  onToggleSplit?: () => void
  splitView?: boolean
  splitDisabled?: boolean
}

type ReadonlyNotesTabStripProps = Readonly<NotesTabStripProps>

type TabDropTarget = { tabId: string; position: 'before' | 'after' }

function findTabDropTarget(viewport: HTMLElement, clientX: number): TabDropTarget | null {
  const rows = Array.from(viewport.querySelectorAll<HTMLElement>('[data-tab-id]'))
  for (const row of rows) {
    const bounds = row.getBoundingClientRect()
    if (clientX < bounds.left + bounds.width / 2) return { tabId: row.dataset.tabId!, position: 'before' }
  }
  const last = rows.at(-1)
  return last ? { tabId: last.dataset.tabId!, position: 'after' } : null
}

/**
 * Keep the close affordance and a useful part of the title visible at the
 * narrowest desktop size. The CSS min-width below and this value are kept in
 * sync, so the measured capacity matches the actual layout constraint.
 */
export const MIN_TAB_WIDTH_PX = 120
const TAB_GAP_PX = 4
/** Ignore sub-pixel scroll rounding when deciding whether an arrow is usable. */
const SCROLL_EPSILON_PX = 1
const DRAG_SCROLL_EDGE_PX = 32
const DRAG_SCROLL_STEP_PX = 12

/**
 * How many tabs fit at their minimum width. Tabs beyond that stay reachable
 * through the scroller, so this only drives the scroll affordances — it is
 * never a cap on how many tabs the workspace may hold.
 */
export function getTabCapacity(availableWidth: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return 1
  return Math.max(1, Math.floor((availableWidth + TAB_GAP_PX) / (MIN_TAB_WIDTH_PX + TAB_GAP_PX)))
}

function getTabLabel(tab: NoteWorkspaceTab): string {
  const title = tab.note?.title?.trim() || tab.draft.title.trim()
  if (title) return title
  return tab.noteId ? "Untitled note" : "New note"
}

function scrollTabIntoView(button: HTMLButtonElement) {
  // Align the whole tab (title button plus its close control), otherwise the
  // close affordance of the active tab can still sit outside the viewport.
  const tab = button.closest<HTMLElement>("[data-tab-id]") ?? button
  // jsdom does not implement scrollIntoView, so guard explicitly.
  if (typeof tab.scrollIntoView === "function") {
    tab.scrollIntoView({ block: "nearest", inline: "nearest" })
  }
}

function SaveStateIndicator({ tab }: Readonly<{ tab: NoteWorkspaceTab }>) {
  if (tab.saveState === "dirty") {
    return (
      <span
        className="inline-flex shrink-0 text-amber-600 dark:text-amber-400"
        title="Unsaved changes"
        aria-label="Unsaved changes"
      >
        <Circle className="h-2 w-2 fill-current" aria-hidden="true" />
      </span>
    )
  }

  if (tab.saveState === "saving") {
    return (
      <span
        className="inline-flex shrink-0 text-muted-foreground"
        title="Saving changes"
        aria-label="Saving changes"
      >
        <Loader2 className="h-3.5 w-3.5 animate-spin" aria-hidden="true" />
      </span>
    )
  }

  if (tab.saveState === "error") {
    return (
      <span
        className="inline-flex shrink-0 text-destructive"
        title={tab.saveError || "Saving failed"}
        aria-label={tab.saveError || "Saving failed"}
      >
        <AlertCircle className="h-3.5 w-3.5" aria-hidden="true" />
      </span>
    )
  }

  return null
}

function activateWithKeyboard(
  event: KeyboardEvent<HTMLButtonElement>,
  tabIndex: number,
  tabs: NoteWorkspaceTab[],
  onActivateTab: ReadonlyNotesTabStripProps["onActivateTab"],
  onFocusTab: (tabId: string) => void,
) {
  if (event.key !== "ArrowLeft" && event.key !== "ArrowRight" && event.key !== "Home" && event.key !== "End") {
    return
  }

  event.preventDefault()
  let nextIndex: number
  if (event.key === "Home") {
    nextIndex = 0
  } else if (event.key === "End") {
    nextIndex = tabs.length - 1
  } else {
    const direction = event.key === "ArrowRight" ? 1 : -1
    nextIndex = (tabIndex + direction + tabs.length) % tabs.length
  }
  const nextTab = tabs[nextIndex]
  if (nextTab) {
    void onActivateTab(nextTab.id)
    onFocusTab(nextTab.id)
  }
}

export function NotesTabStrip({
  tabs,
  activeTabId,
  onAddTab,
  onActivateTab,
  onCloseTab,
  onReorderTab,
  addTabDisabled = false,
  addTabCapacityPending = false,
  maximumTabCount = MAX_NOTE_WORKSPACE_TABS,
  onToggleSplit,
  splitView = false,
  splitDisabled = false,
}: ReadonlyNotesTabStripProps) {
  const drag = useNoteDragSource()
  const tabViewportRef = useRef<HTMLDivElement | null>(null)
  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [overflow, setOverflow] = useState({ left: false, right: false })
  const [dropTarget, setDropTarget] = useState<TabDropTarget | null>(null)
  const dragging = useRef(false)
  const dragScrollFrame = useRef<number | null>(null)
  const dragPointerX = useRef<number | null>(null)
  const dragEndTimer = useRef<number | null>(null)
  // A closed tab stays on screen just long enough to collapse, so the strip
  // closes the gap instead of snapping. It is already gone from state.
  const renderedTabs = useAnimatedTabList(tabs)

  const updateDropTarget = useCallback((viewport: HTMLElement, clientX: number) => {
    const target = findTabDropTarget(viewport, clientX)
    setDropTarget(current => current?.tabId === target?.tabId && current?.position === target?.position ? current : target)
  }, [])

  const stopDragScroll = useCallback(() => {
    if (dragScrollFrame.current !== null) window.cancelAnimationFrame(dragScrollFrame.current)
    dragScrollFrame.current = null
    dragPointerX.current = null
  }, [])

  const scrollDuringDrag = (clientX: number) => {
    dragPointerX.current = clientX
    if (dragScrollFrame.current !== null) return
    const step = () => {
      dragScrollFrame.current = null
      const viewport = tabViewportRef.current
      const pointer = dragPointerX.current
      if (!viewport || pointer === null) return
      const bounds = viewport.getBoundingClientRect()
      let direction = 0
      if (pointer < bounds.left + DRAG_SCROLL_EDGE_PX) direction = -1
      else if (pointer > bounds.right - DRAG_SCROLL_EDGE_PX) direction = 1
      if (!direction) return
      const previous = viewport.scrollLeft
      viewport.scrollLeft += direction * DRAG_SCROLL_STEP_PX
      updateDropTarget(viewport, pointer)
      if (Math.abs(viewport.scrollLeft - previous) > SCROLL_EPSILON_PX) {
        dragScrollFrame.current = window.requestAnimationFrame(step)
      }
    }
    dragScrollFrame.current = window.requestAnimationFrame(step)
  }

  useEffect(() => {
    const finish = () => {
      stopDragScroll()
      setDropTarget(null)
      // Ignore a browser-generated click following a drag without blocking
      // the next intentional click on a tab.
      if (dragEndTimer.current !== null) window.clearTimeout(dragEndTimer.current)
      dragEndTimer.current = window.setTimeout(() => { dragging.current = false }, 0)
    }
    window.addEventListener('dragend', finish)
    window.addEventListener('drop', finish)
    return () => {
      window.removeEventListener('dragend', finish)
      window.removeEventListener('drop', finish)
      stopDragScroll()
      if (dragEndTimer.current !== null) window.clearTimeout(dragEndTimer.current)
    }
  }, [stopDragScroll])

  const handleTabDragOver = (event: DragEvent<HTMLDivElement>) => {
    if (!drag.tabsEnabled || !onReorderTab || !isNoteTabDrag(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    event.dataTransfer.dropEffect = 'move'
    updateDropTarget(event.currentTarget, event.clientX)
    scrollDuringDrag(event.clientX)
  }

  const handleTabDrop = (event: DragEvent<HTMLDivElement>) => {
    if (!drag.tabsEnabled || !onReorderTab || !isNoteTabDrag(event.dataTransfer)) return
    event.preventDefault()
    event.stopPropagation()
    const payload = drag.readPayload(event.dataTransfer)
    const target = findTabDropTarget(event.currentTarget, event.clientX)
    stopDragScroll()
    setDropTarget(null)
    if (payload?.tabId && target && tabs.some(tab => tab.id === payload.tabId)) onReorderTab(payload.tabId, target.tabId, target.position)
  }

  const syncOverflow = () => {
    const viewport = tabViewportRef.current
    if (!viewport) return
    const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth
    setOverflow({
      left: viewport.scrollLeft > SCROLL_EPSILON_PX,
      right: viewport.scrollLeft < maxScrollLeft - SCROLL_EPSILON_PX,
    })
  }

  const focusTab = (tabId: string) => {
    const button = tabButtonRefs.current.get(tabId)
    if (!button) return
    button.focus()
    scrollTabIntoView(button)
  }

  // The active tab must stay reachable after anything that changes the strip
  // geometry: activating a tab, opening or closing one, and resizing the
  // window — a narrower strip otherwise leaves the active tab off-screen.
  useEffect(() => {
    const viewport = tabViewportRef.current
    if (!viewport) return

    const reveal = () => {
      const button = tabButtonRefs.current.get(activeTabId)
      if (button) scrollTabIntoView(button)
      const maxScrollLeft = viewport.scrollWidth - viewport.clientWidth
      setOverflow({
        left: viewport.scrollLeft > SCROLL_EPSILON_PX,
        right: viewport.scrollLeft < maxScrollLeft - SCROLL_EPSILON_PX,
      })
    }

    reveal()
    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(reveal)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [activeTabId, tabs.length])

  const scrollByTabs = (direction: -1 | 1) => {
    const viewport = tabViewportRef.current
    if (!viewport) return
    const step = Math.max(MIN_TAB_WIDTH_PX + TAB_GAP_PX, viewport.clientWidth - MIN_TAB_WIDTH_PX)
    // Instant, not smooth: mandatory scroll snapping re-snaps the strip on the
    // next layout, which aborts an in-flight smooth animation and leaves the
    // arrow looking dead. Snapping still aligns the result to a tab edge.
    if (typeof viewport.scrollBy === "function") {
      viewport.scrollBy({ left: direction * step, behavior: "auto" })
    } else {
      viewport.scrollLeft += direction * step
    }
    syncOverflow()
  }

  // A vertical wheel over the strip should move it sideways: trackpads and
  // mice without a horizontal axis otherwise cannot reach the hidden tabs.
  const handleWheel = (event: WheelEvent<HTMLDivElement>) => {
    const viewport = tabViewportRef.current
    if (!viewport) return
    if (Math.abs(event.deltaY) <= Math.abs(event.deltaX)) return
    if (viewport.scrollWidth <= viewport.clientWidth) return
    viewport.scrollLeft += event.deltaY
    syncOverflow()
  }

  const isAtTabLimit = tabs.length >= maximumTabCount
  const isAddDisabled = addTabDisabled || addTabCapacityPending || isAtTabLimit
  let addTabLabel = "Add note tab"
  if (addTabCapacityPending) {
    addTabLabel = "Add note tab (checking workspace capacity)"
  } else if (isAddDisabled) {
    addTabLabel = `Add note tab (limit reached: ${maximumTabCount} tabs)`
  }

  const renderScrollButton = (direction: -1 | 1) => {
    const enabled = direction === -1 ? overflow.left : overflow.right
    if (!overflow.left && !overflow.right) return null
    const Icon = direction === -1 ? ChevronLeft : ChevronRight

    return (
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-6 shrink-0"
        data-cy={direction === -1 ? "tabs-scroll-left" : "tabs-scroll-right"}
        onMouseDown={(event) => event.preventDefault()}
        onClick={() => scrollByTabs(direction)}
        disabled={!enabled}
        aria-label={direction === -1 ? "Scroll tabs left" : "Scroll tabs right"}
        title={direction === -1 ? "Scroll tabs left" : "Scroll tabs right"}
      >
        <Icon className="h-4 w-4" aria-hidden="true" />
      </Button>
    )
  }

  return (
    <div className="hidden min-w-0 items-center gap-1 border-b border-border/60 bg-background/80 px-2 py-1 backdrop-blur md:flex">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-8 w-8 shrink-0"
        data-cy="add-tab-button"
        onMouseDown={(event) => event.preventDefault()}
        onClick={onAddTab}
        aria-label={addTabLabel}
        title={addTabLabel}
        disabled={isAddDisabled}
      >
        <Plus className="h-4 w-4" aria-hidden="true" />
      </Button>
      {renderScrollButton(-1)}
      <div
        ref={tabViewportRef}
        // The native scrollbar is hidden on purpose: it would change the strip
        // height when it appears, and the arrow buttons above cover the same
        // job on every platform (macOS hides overlay scrollbars until used).
        // Snapping keeps whole tabs at the left edge. Without it a tab can be
        // clipped down to just its close button, which is far too easy to hit
        // by accident for a tab the user cannot even read.
        className="scrollbar-none min-w-0 flex-1 snap-x snap-mandatory overflow-x-auto"
        style={{ scrollSnapType: dropTarget ? 'none' : undefined }}
        aria-label="Open notes"
        onScroll={syncOverflow}
        onWheel={handleWheel}
        onDragOver={handleTabDragOver}
        onDrop={handleTabDrop}
        onDragLeave={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            stopDragScroll()
            setDropTarget(null)
          }
        }}
      >
        <div className="flex min-w-full items-center gap-1">
          {renderedTabs.map(({ tab, closing }, index) => {
            const label = getTabLabel(tab)
            const isActive = !closing && tab.id === activeTabId

            return (
              <div
                key={tab.id}
                className={cn(
                  "group relative flex min-w-[120px] max-w-56 flex-1 snap-start items-center rounded-md border border-transparent",
                  isActive && "border-border bg-muted/60",
                  closing ? "note-tab-closing" : "animate-in fade-in zoom-in-95",
                )}
                style={{
                  ["--note-tab-motion" as string]: `${TAB_TRANSITION_MS}ms`,
                  animationDuration: `${TAB_TRANSITION_MS}ms`,
                }}
                aria-hidden={closing || undefined}
                inert={closing}
                data-tab-id={closing ? undefined : tab.id}
                data-closing={closing || undefined}
                draggable={drag.tabsEnabled && !closing}
                onDragStart={event => {
                  drag.startTab(event, { tabId: tab.id, noteId: tab.noteId ?? undefined })
                  if (!event.defaultPrevented) dragging.current = true
                }}
              >
                {dropTarget?.tabId === tab.id && <span data-cy="tab-insertion-indicator" data-position={dropTarget.position} aria-hidden="true"
                  className={cn('pointer-events-none absolute inset-y-1 z-20 w-0.5 rounded-full bg-primary', dropTarget.position === 'before' ? 'left-0' : 'right-0')} />}
                <Button
                  type="button"
                  data-cy="workspace-tab"
                  aria-pressed={isActive}
                  aria-label={tab.noteId ? undefined : "Open empty note tab"}
                  tabIndex={isActive ? 0 : -1}
                  ref={(button) => {
                    if (button) tabButtonRefs.current.set(tab.id, button)
                    else tabButtonRefs.current.delete(tab.id)
                  }}
                  variant="ghost"
                  className={cn(
                    "h-8 min-w-0 flex-1 justify-start rounded-md px-2 text-xs",
                    isActive && "font-semibold text-foreground hover:bg-transparent",
                  )}
                  title={label}
                  onMouseDown={(event) => { if (!drag.tabsEnabled) event.preventDefault() }}
                  onClick={() => { if (!dragging.current) void onActivateTab(tab.id) }}
                  onKeyDown={(event) => activateWithKeyboard(event, index, tabs, onActivateTab, focusTab)}
                >
                  <span className="min-w-0 truncate">{label}</span>
                  <SaveStateIndicator tab={tab} />
                </Button>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  className="mr-0.5 h-6 w-6 shrink-0 text-muted-foreground opacity-70 hover:text-foreground group-hover:opacity-100"
                  data-cy="workspace-tab-close"
                  aria-label={tab.noteId ? `Close ${label}` : "Close empty note tab"}
                  title={`Close ${label}`}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onCloseTab(tab.id)}
                >
                  <X className="h-3.5 w-3.5" aria-hidden="true" />
                </Button>
              </div>
            )
          })}
        </div>
      </div>
      {renderScrollButton(1)}
      {onToggleSplit && (
        <Button
          type="button"
          variant={splitView ? "default" : "ghost"}
          size="icon"
          className="h-8 w-8 shrink-0"
          data-cy="workspace-split-button"
          aria-label={splitView ? "Close split view" : "Open split view"}
          aria-pressed={splitView}
          title={splitView ? "Close split view" : "Open split view"}
          disabled={splitDisabled}
          onClick={onToggleSplit}
        >
          {splitView ? <Rectangle className="h-4 w-4" aria-hidden="true" /> : <Columns className="h-4 w-4" aria-hidden="true" />}
        </Button>
      )}
    </div>
  )
}

export { getTabLabel, SaveStateIndicator }
