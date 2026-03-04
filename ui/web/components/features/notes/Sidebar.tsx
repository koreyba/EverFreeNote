"use client"

import { useEffect, useState } from "react"
import { BookOpen, Globe, KeyRound, LogOut, Plus, Search, Tag, X, Settings } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
import { useDebouncedCallback } from "@ui/web/hooks/useDebouncedCallback"
import { useSearchMode } from "@ui/web/hooks/useSearchMode"
import { useAISearch } from "@ui/web/hooks/useAISearch"
import { AI_SEARCH_MIN_QUERY_LENGTH } from "@core/constants/aiSearch"
import { AiSearchToggle } from "@/components/features/search/AiSearchToggle"
import { AiSearchPresetSelector } from "@/components/features/search/AiSearchPresetSelector"
import { AiSearchViewTabs } from "@/components/features/search/AiSearchViewTabs"
import { NoteSearchResults } from "@/components/features/search/NoteSearchResults"
import { ChunkSearchResults } from "@/components/features/search/ChunkSearchResults"

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
  searchQuery: string
  onSearch: (query: string) => void
  onClearTagFilter: () => void
  onCreateNote: () => void
  onSignOut: () => void
  onDeleteAccount: () => Promise<void> | void
  deleteAccountLoading?: boolean
  onImportComplete: () => void
  onExportComplete?: (success: boolean, exportedCount: number) => void
  wordpressConfigured?: boolean
  onWordPressConfiguredChange?: (configured: boolean) => void
  hasGeminiApiKey?: boolean
  onOpenInContext?: (noteId: string, charOffset: number, chunkLength: number) => void
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
  hasGeminiApiKey = true,
  onOpenInContext,
  children,
  className,
  "data-testid": dataTestId
}: SidebarProps) {
  const [bulkDialogOpen, setBulkDialogOpen] = useState(false)
  const [deleteAccountOpen, setDeleteAccountOpen] = useState(false)
  const [wordPressSettingsOpen, setWordPressSettingsOpen] = useState(false)
  const [apiKeysOpen, setApiKeysOpen] = useState(false)
  const [searchDraft, setSearchDraft] = useState(searchQuery)
  // AI search fires only on Enter — not on every keystroke, to avoid unnecessary API calls.
  const [aiSearchQuery, setAiSearchQuery] = useState(searchQuery)
  const debouncedSearch = useDebouncedCallback(onSearch, 250)

  // AI Search state
  const { isAIEnabled, preset, viewMode, setIsAIEnabled, setPreset, setViewMode } = useSearchMode()
  const { noteGroups, isLoading: aiLoading, error: aiError, refetch: aiRefetch } = useAISearch({
    query: aiSearchQuery,
    preset,
    filterTag: filterByTag,
    isEnabled: isAIEnabled,
  })

  const handleOpenInContext = (noteId: string, charOffset: number, chunkLength: number) => {
    onOpenInContext?.(noteId, charOffset, chunkLength)
  }

  const showAIResults = isAIEnabled && aiSearchQuery.trim().length >= AI_SEARCH_MIN_QUERY_LENGTH

  const handleBulkConfirm = async () => {
    await onBulkDelete()
    setBulkDialogOpen(false)
  }
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- intentional: syncs external prop to local draft
    setSearchDraft(searchQuery)
    // Only clear AI query when search is programmatically reset (e.g. X button, tag filter clear).
    // Normal FTS debounce also changes searchQuery, so we must NOT sync on every change.
    if (!searchQuery) setAiSearchQuery('')
  }, [searchQuery])

  const handleSearchChange = (value: string) => {
    setSearchDraft(value)
    if (!isAIEnabled) {
      debouncedSearch.call(value)
    }
    // When AI is enabled, search fires only on Enter
  }

  const handleSearchKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key !== 'Enter') return
    if (isAIEnabled) {
      setAiSearchQuery(searchDraft)
    } else {
      debouncedSearch.cancel()
      onSearch(searchDraft)
    }
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
        <div className="relative">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <Input
            type="text"
            placeholder={filterByTag ? `Search in "${filterByTag}" notes...` : "Search notes..."}
            value={searchDraft}
            onChange={(e) => handleSearchChange(e.target.value)}
            onKeyDown={handleSearchKeyDown}
            className="pl-10 pr-8"
          />
          {searchDraft && (
            <div className="absolute right-2 top-1/2 transform -translate-y-1/2">
              <TooltipProvider>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-6 w-6 hover:bg-transparent"
                      onClick={() => onSearch('')}
                    >
                      <X className="w-4 h-4 text-gray-400 hover:text-foreground" />
                      <span className="sr-only">Clear Search</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Clear Search</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
          )}
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
        {showAIResults ? (
          <div className="px-3 py-1">
            {aiLoading && (
              <div className="flex flex-col gap-3 py-2" role="status" aria-label="Searching…">
                {[1, 2, 3].map((i) => (
                  <div key={i} className="space-y-1.5">
                    <div className="h-3 bg-muted animate-pulse rounded w-3/4" />
                    <div className="h-2.5 bg-muted animate-pulse rounded w-full" />
                    <div className="h-2.5 bg-muted animate-pulse rounded w-5/6" />
                  </div>
                ))}
              </div>
            )}
            {aiError && !aiLoading && (
              <div className="py-2">
                <p className="text-xs text-destructive">AI Search unavailable</p>
                <Button
                  variant="ghost"
                  size="sm"
                  className="h-5 text-xs px-0 mt-1"
                  onClick={() => aiRefetch()}
                >
                  Retry
                </Button>
              </div>
            )}
            {!aiLoading && !aiError && (
              viewMode === 'chunk' ? (
                <ChunkSearchResults noteGroups={noteGroups} onOpenInContext={handleOpenInContext} />
              ) : (
                <NoteSearchResults noteGroups={noteGroups} onOpenInContext={handleOpenInContext} />
              )
            )}
          </div>
        ) : (
          children
        )}
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
