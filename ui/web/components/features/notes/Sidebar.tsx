"use client"

import * as React from "react"
import { SignOut as LogOut, Plus, MagnifyingGlass as Search, Gear as Settings } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BrandLogo } from "@/components/BrandLogo"
import { BulkDeleteDialog } from "@/components/features/notes/BulkDeleteDialog"
import { SelectionModeActions } from "@/components/features/notes/SelectionModeActions"
import { User } from "@supabase/supabase-js"
import { useResizableNotesSidebar } from "@ui/web/hooks/useResizableNotesSidebar"
import { cn } from "@ui/web/lib/utils"
import { useBulkDeleteConfirm } from "@ui/web/hooks/useBulkDeleteConfirm"
import { describeDeviceSyncStatus } from "@/components/features/notes/DeviceSyncStatus"

interface SidebarProps {
  user: User
  notesDisplayed?: number
  notesTotal?: number
  pendingCount?: number
  failedCount?: number
  syncStateReady?: boolean
  storageReadError?: boolean
  legacyUnverifiedCount?: number
  unqueuedLocalCount?: number
  unavailableRemoteEdits?: boolean
  legacyClaimBlocked?: boolean
  localCleanupCount?: number
  isOffline: boolean
  selectionMode: boolean
  selectedCount: number
  bulkDeleting: boolean
  onEnterSelectionMode?: () => void
  onExitSelectionMode: () => void
  onSelectAll: () => void
  onBulkDelete: () => void
  filterByTag: string | null
  onClearTagFilter: () => void
  onOpenSearch: () => void
  onOpenSettings: () => void
  onCreateNote: () => void
  onSignOut: () => void
  children: React.ReactNode // For the NoteList
  className?: string
  "data-testid"?: string
}

export function Sidebar({
  user,
  notesDisplayed,
  notesTotal,
  pendingCount = 0,
  failedCount = 0,
  syncStateReady = true,
  storageReadError = false,
  legacyUnverifiedCount = 0,
  unqueuedLocalCount = 0,
  unavailableRemoteEdits = false,
  legacyClaimBlocked = false,
  localCleanupCount = 0,
  isOffline,
  selectionMode,
  selectedCount,
  bulkDeleting,
  onEnterSelectionMode,
  onExitSelectionMode,
  onSelectAll,
  onBulkDelete,
  onOpenSearch,
  onOpenSettings,
  onCreateNote,
  onSignOut,
  children,
  className,
  "data-testid": dataTestId
}: SidebarProps) {
  const sidebarRef = React.useRef<HTMLElement>(null)
  const resizer = useResizableNotesSidebar(sidebarRef)
  const hasVisibleNotes = typeof notesDisplayed === "number" ? notesDisplayed > 0 : true
  const allVisibleSelected = typeof notesDisplayed === "number"
    ? notesDisplayed > 0 && selectedCount >= notesDisplayed
    : false

  const syncStatus = React.useMemo(() => {
    const status = describeDeviceSyncStatus({ isOffline, failedCount, pendingCount, syncStateReady, storageReadError, legacyUnverifiedCount, unqueuedLocalCount, unavailableRemoteEdits, legacyClaimBlocked, localCleanupCount })
    return {
      className: status.tone === "error" ? "bg-destructive" : status.tone === "offline" ? "bg-amber-500" : "bg-muted-foreground",
      label: status.text,
    }
  }, [isOffline, failedCount, pendingCount, syncStateReady, storageReadError, legacyUnverifiedCount, unqueuedLocalCount, unavailableRemoteEdits, legacyClaimBlocked, localCleanupCount])

  const notesCountText = React.useMemo(() => {
    const displayed = typeof notesDisplayed === "number" ? notesDisplayed : "-"
    return typeof notesTotal === "number" ? `${displayed} of ${notesTotal} notes` : `${displayed} notes shown`
  }, [notesDisplayed, notesTotal])

  const {
    isDialogOpen: bulkDialogOpen,
    setIsDialogOpen: setBulkDialogOpen,
    requestDelete: requestBulkDelete,
    confirmDelete: handleBulkConfirm,
    error: bulkDeleteError,
    clearError: clearBulkDeleteError,
  } = useBulkDeleteConfirm(onBulkDelete)

  return (
    <aside
      ref={sidebarRef}
      className={cn(
        "relative w-80 bg-sidebar-background border-r border-sidebar-border flex flex-col h-full md:w-[var(--notes-sidebar-width)] md:flex-none md:sticky md:top-0 md:overflow-hidden",
        className
      )}
      style={{ "--notes-sidebar-width": `${resizer.width}px` } as React.CSSProperties}
      id="notes-sidebar"
      data-testid={dataTestId}
      aria-label="Sidebar"
    >
      <div
        role="separator"
        aria-label="Resize notes sidebar"
        aria-controls="notes-sidebar"
        aria-orientation="vertical"
        aria-valuemin={resizer.minWidth}
        aria-valuemax={resizer.maxWidth}
        aria-valuenow={resizer.width}
        tabIndex={0}
        onPointerDown={resizer.onPointerDown}
        onKeyDown={resizer.onKeyDown}
        className={cn("absolute inset-y-0 right-0 z-20 hidden w-2 cursor-col-resize touch-none hover:bg-primary/50 focus-visible:bg-primary focus-visible:outline-none md:block", resizer.dragging && "bg-primary")}
      />
      <div className="notes-sidebar-content flex min-h-0 flex-1 flex-col">
        {/* Header */}
        <div className="notes-sidebar-header hidden p-4 border-b md:block">
          <div className="notes-sidebar-brand-row flex items-center justify-between mb-4">
            <div className="flex items-center gap-2.5">
              <div className="relative">
                <BrandLogo className="h-8 w-8 shrink-0 transition-transform hover:scale-105" />
                {/* Sync Status Dot */}
                <span
                  className={cn(
                    "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                    syncStatus.className
                  )}
                  title={syncStatus.label}
                  aria-hidden="true"
                />
              </div>
              <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">EverFreeNote</h1>
            </div>
            <ThemeToggle />
          </div>

          {/* Search */}
          <button
            type="button"
            onClick={onOpenSearch}
            className="notes-sidebar-search relative w-full group"
            data-testid="sidebar-search-trigger"
            aria-label="Open search panel"
          >
            <Search aria-hidden="true" className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground transition-colors group-hover:text-foreground mr-2 pointer-events-none" />
            <div className="flex w-full items-center h-10 px-3 pl-9 py-2 rounded-full border border-border/80 bg-background/50 hover:bg-background hover:border-border transition-all duration-200 text-sm text-muted-foreground text-left shadow-sm group-hover:shadow">
              Click to search
            </div>
          </button>
        </div>

        {/* New Note Button */}
        <div className="notes-sidebar-controls flex flex-col gap-3 p-4 border-b bg-muted/5">
          <div className="notes-sidebar-create flex items-center gap-2 md:block">
            <div className="flex min-w-0 flex-1 items-center gap-2 md:hidden">
              <h1 className="text-xl font-bold tracking-tight">Notes</h1>
              <span className={cn("h-2.5 w-2.5 rounded-full", syncStatus.className)} title={syncStatus.label} aria-hidden="true" />
            </div>
            {!selectionMode && hasVisibleNotes && onEnterSelectionMode && (
              <Button type="button" variant="ghost" onClick={onEnterSelectionMode} className="h-11 px-3 md:hidden">
                Select
              </Button>
            )}
            <Button
              onClick={onCreateNote}
              className={cn("h-11 rounded-full px-4 shadow-sm hover:shadow transition-all duration-200 active:translate-y-0 md:h-9 md:w-full md:hover:-translate-y-[0.5px]", selectionMode && "hidden md:inline-flex")}
            >
              <Plus className="w-4 h-4 mr-2" />
              New Note
            </Button>
          </div>
          <p className="notes-sidebar-count text-[11px] text-muted-foreground md:text-center tracking-wide uppercase font-semibold">
            {notesCountText}
          </p>
          {selectionMode && (
            <SelectionModeActions
              className="notes-sidebar-selection"
              selectedCount={selectedCount}
              onSelectAll={onSelectAll}
              onDelete={requestBulkDelete}
              onCancel={onExitSelectionMode}
              selectingAllDisabled={!hasVisibleNotes || allVisibleSelected || bulkDeleting}
              deletingDisabled={selectedCount === 0 || bulkDeleting}
              deleting={bulkDeleting}
            />
          )}
        </div>

        {/* Notes List Container */}
        <div className="notes-sidebar-list flex-1 overflow-y-auto" id="notes-list-container">
          {children}
        </div>

        {/* User Profile */}
        <div className="notes-sidebar-profile hidden p-4 border-t bg-muted/5 md:block">
          <div className="flex items-center justify-between gap-2.5">
            <div className="flex items-center gap-2.5 flex-1 min-w-0">
              <div className="w-8 h-8 rounded-full bg-primary/10 text-primary flex items-center justify-center font-semibold text-xs border border-primary/20 shrink-0 shadow-sm">
                {user.email?.[0]?.toUpperCase()}
              </div>
              <span className="text-xs font-medium text-foreground/80 truncate">{user.email}</span>
            </div>
            <div className="flex items-center gap-0.5">
              <Button
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-foreground"
                onClick={onOpenSettings}
                aria-label="Open settings page"
              >
                <Settings className="w-4 h-4" />
              </Button>
              <Button
                onClick={onSignOut}
                variant="ghost"
                size="icon"
                className="h-8 w-8 rounded-full text-muted-foreground hover:text-destructive"
                data-cy="sign-out-button"
                aria-label="Sign out"
              >
                <LogOut className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </div>
      </div>

      <BulkDeleteDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        count={selectedCount}
        onConfirm={() => void handleBulkConfirm()}
        loading={bulkDeleting}
        errorMessage={bulkDeleteError?.message ?? null}
        onClearError={clearBulkDeleteError}
      />
    </aside>
  )
}

