"use client"

import { useState } from "react"
import { List, Plus, X } from "lucide-react"
import type { NoteWorkspaceTab } from "@core/services/noteWorkspaceTabs"
import { Button } from "@/components/ui/button"
import { cn } from "@ui/web/lib/utils"
import { getTabLabel, SaveStateIndicator, type NotesTabStripProps } from "./NotesTabStrip"

export type MobileNotesTabMenuProps = Readonly<NotesTabStripProps>

export function MobileNotesTabMenu({
  tabs,
  activeTabId,
  onAddTab,
  onActivateTab,
  onCloseTab,
}: MobileNotesTabMenuProps) {
  const [isOpen, setIsOpen] = useState(false)
  const activeTab = tabs.find((tab) => tab.id === activeTabId) ?? tabs[0]
  const activeLabel = activeTab ? getTabLabel(activeTab) : "No open notes"

  const handleActivate = (tabId: string) => {
    void onActivateTab(tabId)
    setIsOpen(false)
  }

  const handleAdd = () => {
    setIsOpen(false)
    void onAddTab()
  }

  const handleClose = (tab: NoteWorkspaceTab) => {
    void onCloseTab(tab.id)
    if (tab.id === activeTabId && tabs.length <= 1) setIsOpen(false)
  }

  return (
    <div className="relative border-b border-border/60 bg-background/80 px-3 py-2 backdrop-blur md:hidden">
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
        <div id="mobile-notes-tab-list" className="mt-2 rounded-xl border border-border bg-card p-1 shadow-lg" aria-label="Open notes">
          {tabs.map((tab) => {
            const label = getTabLabel(tab)
            const isActive = tab.id === activeTabId

            return (
              <div key={tab.id} className="flex items-center gap-1 rounded-lg">
                <Button
                  type="button"
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
          <Button type="button" variant="ghost" className="mt-1 w-full justify-start rounded-lg" onMouseDown={(event) => event.preventDefault()} onClick={handleAdd}>
            <Plus className="h-4 w-4" aria-hidden="true" />
            Add tab
          </Button>
        </div>
      )}
    </div>
  )
}
