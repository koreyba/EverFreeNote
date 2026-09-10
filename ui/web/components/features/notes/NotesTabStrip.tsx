"use client"

import { useEffect, useRef, useState, type KeyboardEvent, type WheelEvent } from "react"
import { AlertCircle, ChevronLeft, ChevronRight, Loader2, Plus, Circle, X } from "lucide-react"
import { MAX_NOTE_WORKSPACE_TABS, type NoteWorkspaceTab } from "@core/services/noteWorkspaceTabs"
import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"

export type NotesTabStripProps = {
  tabs: NoteWorkspaceTab[]
  activeTabId: string
  onAddTab: () => void
  onActivateTab: (tabId: string) => void | Promise<void>
  onCloseTab: (tabId: string) => void | Promise<void>
  addTabDisabled?: boolean
  addTabCapacityPending?: boolean
  maximumTabCount?: number
}

type ReadonlyNotesTabStripProps = Readonly<NotesTabStripProps>

/**
 * Keep the close affordance and a useful part of the title visible at the
 * narrowest desktop size. The CSS min-width below and this value are kept in
 * sync, so the measured capacity matches the actual layout constraint.
 */
export const MIN_TAB_WIDTH_PX = 120
const TAB_GAP_PX = 4
/** Ignore sub-pixel scroll rounding when deciding whether an arrow is usable. */
const SCROLL_EPSILON_PX = 1

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
  addTabDisabled = false,
  addTabCapacityPending = false,
  maximumTabCount = MAX_NOTE_WORKSPACE_TABS,
}: ReadonlyNotesTabStripProps) {
  const tabViewportRef = useRef<HTMLDivElement | null>(null)
  const tabButtonRefs = useRef(new Map<string, HTMLButtonElement>())
  const [overflow, setOverflow] = useState({ left: false, right: false })

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
        aria-label="Open notes"
        onScroll={syncOverflow}
        onWheel={handleWheel}
      >
        <div className="flex min-w-full items-center gap-1">
          {tabs.map((tab, index) => {
            const label = getTabLabel(tab)
            const isActive = tab.id === activeTabId

            return (
              <div
                key={tab.id}
                className={cn(
                  "group flex min-w-[120px] max-w-56 flex-1 snap-start items-center rounded-md border border-transparent",
                  isActive && "border-border bg-muted/60",
                )}
                data-tab-id={tab.id}
              >
                <Button
                  type="button"
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
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => onActivateTab(tab.id)}
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
    </div>
  )
}

export { getTabLabel, SaveStateIndicator }
