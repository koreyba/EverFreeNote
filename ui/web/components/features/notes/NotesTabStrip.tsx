"use client"

import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { AlertCircle, Loader2, Plus, Circle, X } from "lucide-react"
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
 * sync so add capacity reflects the actual layout constraint.
 */
export const MIN_TAB_WIDTH_PX = 120
const TAB_GAP_PX = 4

export function getTabCapacity(availableWidth: number): number {
  if (!Number.isFinite(availableWidth) || availableWidth <= 0) return 1
  return Math.max(1, Math.floor((availableWidth + TAB_GAP_PX) / (MIN_TAB_WIDTH_PX + TAB_GAP_PX)))
}

function getTabLabel(tab: NoteWorkspaceTab): string {
  const title = tab.note?.title?.trim() || tab.draft.title.trim()
  if (title) return title
  return tab.noteId ? "Untitled note" : "New note"
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
  const [tabViewportWidth, setTabViewportWidth] = useState<number | null>(null)

  useEffect(() => {
    const viewport = tabViewportRef.current
    if (!viewport) return

    const measure = () => {
      const width = viewport.clientWidth || viewport.getBoundingClientRect().width
      setTabViewportWidth(width > 0 ? width : null)
    }

    measure()
    if (typeof ResizeObserver === "undefined") return

    const observer = new ResizeObserver(measure)
    observer.observe(viewport)
    return () => observer.disconnect()
  }, [])

  const measuredCapacity = tabViewportWidth === null ? null : getTabCapacity(tabViewportWidth)
  const tabCapacity = measuredCapacity === null
    ? null
    : Math.min(measuredCapacity, maximumTabCount)
  const isCapacityPending = addTabCapacityPending || tabViewportWidth === null
  const isAddDisabled = addTabDisabled || isCapacityPending || (tabCapacity !== null && tabs.length >= tabCapacity)
  let addTabLabel = "Add note tab"
  if (addTabCapacityPending) {
    addTabLabel = "Add note tab (checking workspace capacity)"
  } else if (addTabDisabled) {
    addTabLabel = `Add note tab (limit reached: ${maximumTabCount} tabs)`
  } else if (isCapacityPending) {
    addTabLabel = "Add note tab (checking capacity)"
  } else if (isAddDisabled) {
    addTabLabel = `Add note tab (limit reached: ${tabCapacity} tabs)`
  }

  const focusTab = (tabId: string) => {
    const button = tabButtonRefs.current.get(tabId)
    if (!button) return
    button.focus()
    button.scrollIntoView?.({ block: "nearest", inline: "nearest" })
  }

  useEffect(() => {
    const button = tabButtonRefs.current.get(activeTabId)
    button?.scrollIntoView?.({ block: "nearest", inline: "nearest" })
  }, [activeTabId])

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
      <div ref={tabViewportRef} className="min-w-0 flex-1 overflow-x-auto" aria-label="Open notes">
        <div className="flex min-w-full items-center gap-1">
          {tabs.map((tab, index) => {
            const label = getTabLabel(tab)
            const isActive = tab.id === activeTabId

            return (
              <div
                key={tab.id}
                className={cn(
                  "group flex min-w-[120px] max-w-56 flex-1 items-center rounded-md border border-transparent",
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
    </div>
  )
}

export { getTabLabel, SaveStateIndicator }
