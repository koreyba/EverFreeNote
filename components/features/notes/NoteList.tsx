"use client"

import { Loader2, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { NoteListSkeleton } from "@/components/NoteListSkeleton"
import { NoteCard } from "./NoteCard"
import type { Note, SearchResult } from "@/types/domain"

// Define NoteRecord locally to match what's used in page.tsx
// Ideally this should be in a shared types file
type NoteRecord = Note & {
  content?: string | null
  headline?: string | null
  rank?: number | null
}

interface NoteListProps {
  notes: NoteRecord[]
  isLoading: boolean
  selectedNoteId?: string
  selectionMode?: boolean
  selectedIds?: Set<string>
  onToggleSelect?: (note: NoteRecord) => void
  onSelectNote: (note: NoteRecord) => void
  onTagClick: (tag: string) => void
  onLoadMore: () => void
  hasMore: boolean
  isFetchingNextPage: boolean

  // FTS Search Props
  ftsQuery: string
  ftsLoading: boolean
  showFTSResults: boolean
  ftsData?: {
    total: number
    executionTime: number
    results: SearchResult[]
  }
  onSearchResultClick: (note: SearchResult) => void
}

export function NoteList({
  notes,
  isLoading,
  selectedNoteId,
  selectionMode = false,
  selectedIds = new Set(),
  onToggleSelect,
  onSelectNote,
  onTagClick,
  onLoadMore,
  hasMore,
  isFetchingNextPage,
  ftsQuery,
  ftsLoading,
  showFTSResults,
  ftsData,
  onSearchResultClick,
}: NoteListProps) {
  // FTS Loading State
  if (ftsQuery.length >= 3 && ftsLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Searching notes...</span>
        </div>
      </div>
    )
  }

  // FTS Results
  if (showFTSResults && ftsData) {
    return (
      <div className="p-4">
        {/* FTS Search Results Header */}
        <div className="flex items-center justify-between text-sm text-muted-foreground mb-4">
          <div>
            Found: <span className="font-semibold">{ftsData.total}</span> {ftsData.total === 1 ? "note" : "notes"}
          </div>
          {typeof ftsData.executionTime === "number" && (
            <div className="flex items-center gap-2">
              <span>{ftsData.executionTime}ms</span>
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Quick search
              </Badge>
            </div>
          )}
        </div>

        {/* FTS Results List */}
        {ftsData.results.length === 0 ? (
          <div className="text-sm text-muted-foreground py-8 text-center">No results found.</div>
        ) : (
          <div className="space-y-4">
            {ftsData.results.map((note) => (
              <NoteCard
                key={note.id}
                note={note}
                variant="search"
                selectionMode={selectionMode}
                isSelected={selectionMode ? selectedIds.has(note.id) : false}
                onToggleSelect={() => onToggleSelect?.(note as unknown as NoteRecord)}
                onClick={() =>
                  selectionMode
                    ? onToggleSelect?.(note as unknown as NoteRecord)
                    : onSearchResultClick(note)
                }
                onTagClick={onTagClick}
              />
            ))}
          </div>
        )}
      </div>
    )
  }

  // Loading Skeleton
  if (isLoading) {
    return <NoteListSkeleton count={5} />
  }

  // Empty State
  if (notes.length === 0) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        <p>No notes yet</p>
        <p className="text-sm mt-2">Create your first note to get started!</p>
      </div>
    )
  }

  // Regular List (Small datasets)
  return (
    <>
      <div className="space-y-1 p-2">
        {notes.map((note) => (
          <NoteCard
            key={note.id}
            note={note}
            variant="compact"
            isSelected={selectionMode ? selectedIds.has(note.id) : selectedNoteId === note.id}
            selectionMode={selectionMode}
            onToggleSelect={() => onToggleSelect?.(note)}
            onClick={() => (selectionMode ? onToggleSelect?.(note) : onSelectNote(note))}
            onTagClick={onTagClick}
          />
        ))}
      </div>

      {hasMore && (
        <div className="p-4">
          {isFetchingNextPage && (
            <div className="text-center py-2">
              <Loader2 className="w-5 h-5 animate-spin mx-auto text-muted-foreground" />
            </div>
          )}
          {!isFetchingNextPage && (
            <div className="text-center">
              <Button
                variant="ghost"
                size="sm"
                onClick={onLoadMore}
                className="text-muted-foreground hover:text-foreground"
              >
                Load More
              </Button>
            </div>
          )}
        </div>
      )}
    </>
  )
}
