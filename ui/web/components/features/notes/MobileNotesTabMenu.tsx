"use client"

import { useEffect, useRef, useState } from "react"
import { List, Plus, X } from "@phosphor-icons/react"
import type { NoteWorkspaceTab } from "@core/services/noteWorkspaceTabs"
import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"
import { getTabLabel, SaveStateIndicator, type NotesTabStripProps } from "./NotesTabStrip"
import { useAnimatedTabList, TAB_TRANSITION_MS } from "@ui/web/hooks/useAnimatedTabList"

export type MobileNotesTabMenuProps = Readonly<NotesTabStripProps>

export function MobileNotesTabMenu({
  tabs,
  activeTabId,
  onAddTab,
  onActivateTab,
  onCloseTab,
  addTabDisabled = false,
  addTabCapacityPending = false,
  maximumTabCount,
}: MobileNotesTabMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)
  const activeRowRef = useRef<HTMLDivElement | null>(null)
  // Same motion as the desktop strip, collapsing vertically instead.
  const renderedTabs = useAnimatedTabList(tabs)
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  const activeLabel = activeTab ? getTabLabel(activeTab) : "No open notes"

  // With many tabs the active one can sit far down the scrollable list; bring
  // it into view so opening the menu always shows where you currently are.
  useEffect(() => {
    if (!isOpen) return
    const row = activeRowRef.current
    if (row && typeof row.scrollIntoView === "function") {
      row.scrollIntoView({ block: "nearest" })
    }
  }, [isOpen])

  // The panel floats over the note, so it needs the dismissal affordances a
  // popover is expected to have: tapping outside it and pressing Escape.
  useEffect(() => {
    if (!isOpen) return

    const handlePointerDown = (event: PointerEvent | MouseEvent) => {
      const target = event.target
      if (target instanceof Node && containerRef.current?.contains(target)) return
      setIsOpen(false)
    }
    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") setIsOpen(false)
    }

    document.addEventListener("pointerdown", handlePointerDown)
    document.addEventListener("keydown", handleKeyDown)
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown)
      document.removeEventListener("keydown", handleKeyDown)
    }
  }, [isOpen])

  const handleActivate = (tabId: string) => {
    void onActivateTab(tabId)
    setIsOpen(false)
  }

  const handleAdd = () => {
    if (addTabDisabled || addTabCapacityPending) return
    setIsOpen(false)
    onAddTab()
  }

  const addTabLabel = addTabCapacityPending
    ? "Add tab (checking workspace capacity)"
    : addTabDisabled
      ? `Add tab (limit reached: ${maximumTabCount ?? "maximum"} tabs)`
      : "Add tab"

  const handleClose = (tab: NoteWorkspaceTab) => {
    void onCloseTab(tab.id)
    if (tab.id === activeTabId && tabs.length <= 1) setIsOpen(false)
  }

  return (
    <div
      ref={containerRef}
      className="relative z-40 min-w-0 border-b border-border/60 bg-background/80 px-3 py-2 backdrop-blur md:hidden"
    >
      <div className="flex items-center gap-2">
        <div className="min-w-0 flex-1">
          <p className="truncate text-sm font-medium" title={activeLabel}>{activeLabel}</p>
          <p className="text-xs text-muted-foreground">{tabs.length} {tabs.length === 1 ? "tab" : "tabs"}</p>
        </div>
        {activeTab && <SaveStateIndicator tab={activeTab} />}
        <Button
          type="button"
          variant="outline"
          size="sm"
          className="shrink-0"
          data-cy="mobile-tabs-toggle"
          aria-expanded={isOpen}
          aria-controls="mobile-notes-tab-list"
          aria-label={`Open note tabs (${tabs.length})`}
          onClick={() => setIsOpen((open) => !open)}
        >
          <List className="h-4 w-4" aria-hidden="true" />
          <span className="sr-only">Open tabs</span>
          <span aria-hidden="true">{tabs.length}</span>
        </Button>
      </div>

      {isOpen && (
        <div
          id="mobile-notes-tab-list"
          // Absolutely positioned so opening the list overlays the note
          // instead of pushing the editor down the page.
          className="absolute left-3 right-3 top-full z-50 mt-1 rounded-xl border border-border bg-popover p-1 shadow-lg"
          aria-label="Open notes"
        >
          <div className="max-h-[60vh] overflow-y-auto overscroll-contain">
            {renderedTabs.map(({ tab, closing }) => {
              const label = getTabLabel(tab)
              const isActive = !closing && tab.id === activeTabId

              return (
                <div
                  key={tab.id}
                  ref={isActive ? activeRowRef : undefined}
                  className={cn(
                    "flex items-center gap-1 rounded-lg",
                    closing ? "note-tab-row-closing" : "animate-in fade-in slide-in-from-top-1",
                  )}
                  style={{
                    ["--note-tab-motion" as string]: `${TAB_TRANSITION_MS}ms`,
                    animationDuration: `${TAB_TRANSITION_MS}ms`,
                  }}
                  aria-hidden={closing || undefined}
                  inert={closing}
                  data-closing={closing || undefined}
                >
                  <Button
                    type="button"
                    data-cy="mobile-workspace-tab"
                    aria-pressed={isActive}
                    aria-label={tab.noteId ? undefined : "Open empty note tab"}
                    variant="ghost"
                    className={cn("min-w-0 flex-1 justify-start rounded-lg px-2.5", isActive && "bg-muted font-semibold")}
                    title={label}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleActivate(tab.id)}
                  >
                    <span className="min-w-0 flex-1 truncate text-left">{label}</span>
                    <SaveStateIndicator tab={tab} />
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 shrink-0 text-muted-foreground hover:text-foreground"
                    data-cy="mobile-workspace-tab-close"
                    aria-label={tab.noteId ? `Close ${label}` : "Close empty note tab"}
                    title={`Close ${label}`}
                    onMouseDown={(event) => event.preventDefault()}
                    onClick={() => handleClose(tab)}
                  >
                    <X className="h-3.5 w-3.5" aria-hidden="true" />
                  </Button>
                </div>
              )
            })}
          </div>
          <Button
            type="button"
            variant="ghost"
            className="mt-1 w-full justify-start rounded-lg"
            data-cy="mobile-add-tab-button"
            onMouseDown={(event) => event.preventDefault()}
            onClick={handleAdd}
            disabled={addTabDisabled || addTabCapacityPending}
            aria-label={addTabLabel}
            title={addTabLabel}
          >
            <Plus className="h-4 w-4" aria-hidden="true" />
            <span>Add tab</span>
          </Button>
        </div>
      )}
    </div>
  )
}
