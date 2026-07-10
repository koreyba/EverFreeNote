"use client"

import { LogOut, Plus, Search, Settings } from "lucide-react"
import { Button } from "@/components/ui/button"
import { ThemeToggle } from "@/components/theme-toggle"
import { BrandLogo } from "@/components/BrandLogo"
import { BulkDeleteDialog } from "@/components/features/notes/BulkDeleteDialog"
import { SelectionModeActions } from "@/components/features/notes/SelectionModeActions"
import { User } from "@supabase/supabase-js"
import { cn } from "@ui/web/lib/utils"
import { useBulkDeleteConfirm } from "@ui/web/hooks/useBulkDeleteConfirm"

interface SidebarProps {
  user: User
  notesDisplayed?: number
  notesTotal?: number
  pendingCount?: number
  failedCount?: number
  isOffline: boolean
  selectionMode: boolean
  selectedCount: number
  bulkDeleting: boolean
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
  isOffline,
  selectionMode,
  selectedCount,
  bulkDeleting,
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
  const hasVisibleNotes = typeof notesDisplayed === "number" ? notesDisplayed > 0 : true
  const allVisibleSelected = typeof notesDisplayed === "number"
    ? notesDisplayed > 0 && selectedCount >= notesDisplayed
    : false

  const {
    isDialogOpen: bulkDialogOpen,
    setIsDialogOpen: setBulkDialogOpen,
    requestDelete: requestBulkDelete,
    confirmDelete: handleBulkConfirm,
    error: bulkDeleteError,
    clearError: clearBulkDeleteError,
  } = useBulkDeleteConfirm(onBulkDelete)

  return (
    <div
      className={cn(
        "w-80 bg-sidebar-background border-r border-sidebar-border flex flex-col h-full md:sticky md:top-0 md:h-screen md:overflow-hidden",
        className
      )}
      data-testid={dataTestId}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2.5">
            <div className="relative">
              <BrandLogo className="h-8 w-8 shrink-0 transition-transform hover:scale-105" />
              {/* Sync Status Dot */}
              <span className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-card",
                isOffline ? "bg-amber-500 animate-pulse" :
                (failedCount ?? 0) > 0 ? "bg-destructive" :
                (pendingCount ?? 0) > 0 ? "bg-muted-foreground animate-pulse" :
                "bg-emerald-500"
              )} title={
                isOffline ? "Offline mode" :
                (failedCount ?? 0) > 0 ? `Sync failed: ${failedCount}` :
                (pendingCount ?? 0) > 0 ? `Syncing: ${pendingCount}` :
                "Synchronized"
              }
              role="status"
              aria-label={
                isOffline ? "Offline mode" :
                (failedCount ?? 0) > 0 ? `Sync failed: ${failedCount}` :
                (pendingCount ?? 0) > 0 ? `Syncing: ${pendingCount}` :
                "Synchronized"
              } />
            </div>
            <h1 className="text-lg font-bold tracking-tight bg-gradient-to-r from-foreground to-foreground/80 bg-clip-text text-transparent">EverFreeNote</h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="relative w-full group"
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
      <div className="p-4 border-b space-y-3 bg-muted/5">
        <Button
          onClick={onCreateNote}
          className="w-full rounded-full shadow-sm hover:shadow transition-all duration-200 hover:-translate-y-[0.5px] active:translate-y-0"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
        <p className="text-[11px] text-muted-foreground/80 text-center tracking-wide uppercase font-semibold">
          {typeof notesDisplayed === "number" ? notesDisplayed : "-"} of {typeof notesTotal === "number" ? notesTotal : "unknown"} notes
        </p>
        {selectionMode && (
          <SelectionModeActions
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
      <div className="flex-1 overflow-y-auto" id="notes-list-container">
        {children}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t bg-muted/5">
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
              aria-label="Sign out"
            >
              <LogOut className="w-4 h-4" />
            </Button>
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
    </div>
  )
}
