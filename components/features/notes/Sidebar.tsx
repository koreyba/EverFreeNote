"use client"

import { BookOpen, LogOut, Plus, Search, Tag, X, Settings } from "lucide-react"
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
import { User } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"

interface SidebarProps {
  user: User
  totalNotes?: number
  filterByTag: string | null
  searchQuery: string
  onSearch: (query: string) => void
  onClearTagFilter: () => void
  onCreateNote: () => void
  onSignOut: () => void
  onImportComplete: () => void
  onExportComplete?: (success: boolean, exportedCount: number) => void
  children: React.ReactNode // For the NoteList
  className?: string
  "data-testid"?: string
}

export function Sidebar({
  user,
  totalNotes,
  filterByTag,
  searchQuery,
  onSearch,
  onClearTagFilter,
  onCreateNote,
  onSignOut,
  onImportComplete,
  onExportComplete,
  children,
  className,
  "data-testid": dataTestId
}: SidebarProps) {
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
            value={searchQuery}
            onChange={(e) => onSearch(e.target.value)}
            className="pl-10 pr-8"
          />
          {searchQuery && (
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
        <p className="text-xs text-muted-foreground text-center">
          Total notes: {typeof totalNotes === "number" ? totalNotes : "—"}
        </p>
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
              className="w-56 space-y-2 p-3"
            >
              <div className="space-y-2">
                <ImportButton onImportComplete={onImportComplete} />
                <ExportButton onExportComplete={onExportComplete} />
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
    </div>
  )
}
