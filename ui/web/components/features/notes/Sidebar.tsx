"use client";

import { BookOpen, LogOut, Plus, Search, Settings } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { BulkDeleteDialog } from "@/components/features/notes/BulkDeleteDialog";
import { SelectionModeActions } from "@/components/features/notes/SelectionModeActions";
import { PlanBadge } from "@/components/features/subscription/PlanBadge";
import { User } from "@supabase/supabase-js";
import { cn } from "@ui/web/lib/utils";
import { useBulkDeleteConfirm } from "@ui/web/hooks/useBulkDeleteConfirm";
import type { Plan } from "@core/types/subscription";
import { FREE_PLAN_NOTE_LIMIT } from "@core/constants/subscription";

interface SidebarProps {
  user: User;
  notesDisplayed?: number;
  notesTotal?: number;
  pendingCount?: number;
  failedCount?: number;
  isOffline: boolean;
  selectionMode: boolean;
  selectedCount: number;
  bulkDeleting: boolean;
  onExitSelectionMode: () => void;
  onSelectAll: () => void;
  onBulkDelete: () => void;
  filterByTag: string | null;
  onClearTagFilter: () => void;
  onOpenSearch: () => void;
  onOpenSettings: () => void;
  onCreateNote: () => void;
  onSignOut: () => void;
  plan?: Plan;
  onUpgrade?: () => void;
  children: React.ReactNode; // For the NoteList
  className?: string;
  "data-testid"?: string;
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
  plan = "free",
  onUpgrade,
  children,
  className,
  "data-testid": dataTestId,
}: SidebarProps) {
  const hasVisibleNotes =
    typeof notesDisplayed === "number" ? notesDisplayed > 0 : true;
  const allVisibleSelected =
    typeof notesDisplayed === "number"
      ? notesDisplayed > 0 && selectedCount >= notesDisplayed
      : false;

  const {
    isDialogOpen: bulkDialogOpen,
    setIsDialogOpen: setBulkDialogOpen,
    requestDelete: requestBulkDelete,
    confirmDelete: handleBulkConfirm,
    error: bulkDeleteError,
    clearError: clearBulkDeleteError,
  } = useBulkDeleteConfirm(onBulkDelete);

  return (
    <div
      className={cn(
        "w-80 bg-card border-r flex flex-col h-full md:sticky md:top-0 md:h-screen md:overflow-hidden",
        className,
      )}
      data-testid={dataTestId}
    >
      {/* Header */}
      <div className="p-4 border-b">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <BookOpen className="w-6 h-6 text-primary" />
            <h1 className="text-xl font-bold">EverFreeNote</h1>
          </div>
          <ThemeToggle />
        </div>

        {/* Sync Status - always visible to prevent layout shift */}
        <div className="mb-3 flex flex-wrap gap-2 text-xs">
          {isOffline ? (
            <span className="rounded bg-amber-500/10 text-amber-600 dark:text-amber-400 px-2 py-1">
              Offline mode
            </span>
          ) : (failedCount ?? 0) > 0 ? (
            <span className="rounded bg-destructive/10 text-destructive px-2 py-1">
              Sync failed: {failedCount}
            </span>
          ) : (pendingCount ?? 0) > 0 ? (
            <span className="rounded bg-muted px-2 py-1 text-muted-foreground animate-pulse">
              Syncing: {pendingCount}
            </span>
          ) : (
            <span className="rounded bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 px-2 py-1">
              Synchronized
            </span>
          )}
        </div>

        {/* Search */}
        <button
          type="button"
          onClick={onOpenSearch}
          className="relative w-full text-left"
          data-testid="sidebar-search-trigger"
          aria-label="Open search panel"
        >
          <Search
            aria-hidden="true"
            className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground mr-2 pointer-events-none"
          />
          <div className="flex w-full items-center h-10 px-3 pl-9 py-2 rounded-md border border-input bg-background/50 hover:bg-background/80 transition-colors text-sm text-muted-foreground text-left">
            Click to search
          </div>
        </button>
      </div>

      {/* New Note Button */}
      <div className="p-4 border-b space-y-3">
        <Button onClick={onCreateNote} className="w-full">
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
        {/* Note count: Free users see limit progress, paid users see displayed/total */}
        <p className="text-xs text-muted-foreground text-center">
          {plan === "free" && typeof notesTotal === "number"
            ? `${notesTotal} of ${FREE_PLAN_NOTE_LIMIT} notes`
            : `Notes displayed: ${typeof notesDisplayed === "number" ? notesDisplayed : "-"} out of ${typeof notesTotal === "number" ? notesTotal : "unknown"}`}
        </p>
        {selectionMode && (
          <SelectionModeActions
            selectedCount={selectedCount}
            onSelectAll={onSelectAll}
            onDelete={requestBulkDelete}
            onCancel={onExitSelectionMode}
            selectingAllDisabled={
              !hasVisibleNotes || allVisibleSelected || bulkDeleting
            }
            deletingDisabled={selectedCount === 0 || bulkDeleting}
            deleting={bulkDeleting}
            className="rounded-md border bg-card/70 backdrop-blur"
          />
        )}
      </div>

      {/* Notes List Container */}
      <div className="flex-1 overflow-y-auto" id="notes-list-container">
        {children}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-accent-foreground">
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm truncate">{user.email}</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="p-2"
            onClick={onOpenSettings}
            aria-label="Open settings page"
          >
            <Settings className="w-4 h-4" />
          </Button>
          <Button onClick={onSignOut} variant="ghost" size="sm">
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
        {/* Plan Badge */}
        <div className="flex justify-center">
          <PlanBadge plan={plan} onClick={onUpgrade} />
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
  );
}
