"use client"

import { useEffect, useState } from "react"
import { BookOpen, Globe, KeyRound, LogOut, Plus, Search, Tag, X, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { ThemeToggle } from "@/components/theme-toggle"
import { DropdownMenu, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { ImportButton } from "@/components/ImportButton"
import { ExportButton } from "@/components/ExportButton"
import { BulkDeleteDialog } from "@/components/features/notes/BulkDeleteDialog"
import { DeleteAccountDialog } from "@/components/features/account/DeleteAccountDialog"
import { WordPressSettingsDialog } from "@/components/features/wordpress/WordPressSettingsDialog"
import { ApiKeysSettingsDialog } from "@/components/features/settings/ApiKeysSettingsDialog"
import { User } from "@supabase/supabase-js"
import { cn } from "@ui/web/lib/utils"

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
  onEnterSelectionMode: () => void
  onExitSelectionMode: () => void
  onSelectAll: () => void
  onClearSelection: () => void
  onBulkDelete: () => void
  filterByTag: string | null
  onClearTagFilter: () => void
  onOpenSearch: () => void
  onCreateNote: () => void
  onSignOut: () => void
  onDeleteAccount: () => Promise<void> | void
  deleteAccountLoading?: boolean
  onImportComplete: () => void
  onExportComplete?: (success: boolean, exportedCount: number) => void
  wordpressConfigured?: boolean
  onWordPressConfiguredChange?: (configured: boolean) => void
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
  onEnterSelectionMode,
  onExitSelectionMode,
  onSelectAll,
  onClearSelection,
  onBulkDelete,
  filterByTag,
  searchQuery,
  onSearch,
  onClearTagFilter,
  onCreateNote,
  onSignOut,
  onDeleteAccount,
  deleteAccountLoading = false,
  onImportComplete,
  onExportComplete,
  wordpressConfigured = false,
  onWordPressConfiguredChange,
  children,
  className,
  "data-testid": dataTestId
}: SidebarProps) {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [wordPressSettingsOpen, setWordPressSettingsOpen] = useState(false)
  const [apiKeysOpen, setApiKeysOpen] = useState(false)

  const handleBulkConfirm = async () => {
    await onBulkDelete()
    setBulkDialogOpen(false)
  }

  const handleDeleteAccount = async () => {
    await onDeleteAccount()
    setDeleteAccountOpen(false)
  }

  return (
    <div
      className={cn(
        "w-80 bg-card border-r flex flex-col h-full md:sticky md:top-0 md:h-screen md:overflow-hidden",
        className
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

        {/* Tag Filter Badge */}
        {filterByTag && (
          <div className="mb-3 flex items-center gap-2">
            <Badge variant="outline" className="bg-accent text-accent-foreground">
              <Tag className="w-3 h-3 mr-1" />
              {filterByTag}
            </Badge>
            <Button
              onClick={onClearTagFilter}
              variant="ghost"
              size="sm"
              className="h-6 text-xs"
            >
              Clear Tags
            </Button>
          </div>
        )}

        {/* Search */}
        <div className="relative cursor-pointer" onClick={onOpenSearch}>
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground mr-2 pointer-events-none" />
          <div className="flex w-full items-center h-10 px-3 pl-9 py-2 rounded-md border border-input bg-background/50 hover:bg-background/80 transition-colors text-sm text-muted-foreground text-left">
            {filterByTag ? `Search in "${filterByTag}" notes...` : "Search notes..."}
          </div>
        </div>

        {/* AI Search Controls */}
        <div className="mt-2 flex flex-col gap-1.5">
          <AiSearchToggle
            enabled={isAIEnabled}
            hasApiKey={hasGeminiApiKey}
            onChange={setIsAIEnabled}
          />
          {isAIEnabled && (
            <>
              <AiSearchPresetSelector value={preset} onChange={setPreset} />
              {showAIResults && noteGroups.length > 0 && (
                <AiSearchViewTabs value={viewMode} onChange={setViewMode} />
              )}
            </>
          )}
        </div>
      </div>

      {/* New Note Button */}
      <div className="p-4 border-b space-y-3">
        <Button
          onClick={onCreateNote}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
        <Button
          variant={selectionMode ? "secondary" : "outline"}
          onClick={selectionMode ? onExitSelectionMode : onEnterSelectionMode}
          className="w-full"
        >
          {selectionMode ? "Exit selection" : "Select Notes"}
        </Button>
        <p className="text-xs text-muted-foreground text-center">
          Notes displayed: {typeof notesDisplayed === "number" ? notesDisplayed : "-"} out of {typeof notesTotal === "number" ? notesTotal : "unknown"}
        </p>
        {selectionMode && (
          <div className="space-y-2">
            <div className="flex gap-2">
              <Button variant="outline" size="sm" className="flex-1" onClick={onSelectAll}>
                Select all
              </Button>
              <Button variant="outline" size="sm" className="flex-1" onClick={onClearSelection}>
                Unselect all
              </Button>
            </div>
            <Button
              variant="destructive"
              disabled={selectedCount === 0 || bulkDeleting}
              className="w-full"
              onClick={() => setBulkDialogOpen(true)}
            >
              {bulkDeleting ? "Deleting..." : `Delete selected${selectedCount > 0 ? ` (${selectedCount})` : ""}`}
            </Button>
          </div>
        )}
      </div>

      {/* Notes List Container */}
      <div className="flex-1 overflow-y-auto" id="notes-list-container">
        {children}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-accent-foreground">
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm truncate">{user.email}</span>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm" className="p-2">
                <Settings className="w-4 h-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              side="top"
              sideOffset={12}
              alignOffset={-45}
              className="w-56 space-y-2 p-3 bg-popover text-popover-foreground border border-border shadow-xl backdrop-blur"
            >
              <div className="space-y-2">
                <Button
                  variant={wordpressConfigured ? "secondary" : "outline"}
                  size="sm"
                  className="w-full"
                  onClick={() => setWordPressSettingsOpen(true)}
                >
                  <Globe className="w-4 h-4 mr-2" />
                  WordPress settings
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="w-full"
                  onClick={() => setApiKeysOpen(true)}
                >
                  <KeyRound className="w-4 h-4 mr-2" />
                  API Keys
                </Button>
                <ImportButton onImportComplete={onImportComplete} />
                <ExportButton onExportComplete={onExportComplete} />
                <Button
                  variant="destructive"
                  size="sm"
                  className="w-full"
                  onClick={() => setDeleteAccountOpen(true)}
                >
                  Delete my account
                </Button>
              </div>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button
            onClick={onSignOut}
            variant="ghost"
            size="sm"
          >
            <LogOut className="w-4 h-4" />
          </Button>
        </div>
      </div>

      <BulkDeleteDialog
        open={bulkDialogOpen}
        onOpenChange={setBulkDialogOpen}
        count={selectedCount}
        onConfirm={handleBulkConfirm}
        loading={bulkDeleting}
      />
      <DeleteAccountDialog
        open={deleteAccountOpen}
        onOpenChange={setDeleteAccountOpen}
        onConfirm={handleDeleteAccount}
        loading={deleteAccountLoading}
      />
      <WordPressSettingsDialog
        open={wordPressSettingsOpen}
        onOpenChange={setWordPressSettingsOpen}
        onConfiguredChange={onWordPressConfiguredChange}
      />
      <ApiKeysSettingsDialog
        open={apiKeysOpen}
        onOpenChange={setApiKeysOpen}
      />
    </div>
  )
}
