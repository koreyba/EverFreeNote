"use client"

import { BookOpen, LogOut, Plus, Search, Tag, X } from "lucide-react"
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
import { ImportButton } from "@/components/ImportButton"
import { User } from "@supabase/supabase-js"
import { cn } from "@/lib/utils"

interface SidebarProps {
  user: User
  filterByTag: string | null
  searchQuery: string
  onSearch: (query: string) => void
  onClearTagFilter: () => void
  onCreateNote: () => void
  onSignOut: () => void
  onImportComplete: () => void
  children: React.ReactNode // For the NoteList
  className?: string
}

export function Sidebar({
  user,
  filterByTag,
  searchQuery,
  onSearch,
  onClearTagFilter,
  onCreateNote,
  onSignOut,
  onImportComplete,
  children,
  className
}: SidebarProps) {
  return (
    <div className={cn("w-80 bg-card border-r flex flex-col h-full", className)}>
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
      <div className="p-4 border-b space-y-2">
        <Button
          onClick={onCreateNote}
          className="w-full"
        >
          <Plus className="w-4 h-4 mr-2" />
          New Note
        </Button>
        <ImportButton onImportComplete={onImportComplete} />
      </div>

      {/* Notes List Container */}
      <div className="flex-1 overflow-y-auto" id="notes-list-container">
        {children}
      </div>

      {/* User Profile */}
      <div className="p-4 border-t">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2 flex-1 min-w-0">
            <div className="w-8 h-8 bg-accent rounded-full flex items-center justify-center">
              <span className="text-sm font-semibold text-accent-foreground">
                {user.email?.[0]?.toUpperCase()}
              </span>
            </div>
            <span className="text-sm truncate">{user.email}</span>
          </div>
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
