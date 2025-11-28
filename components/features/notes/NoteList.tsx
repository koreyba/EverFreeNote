"use client"

import { Loader2, Zap } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import InteractiveTag from "@/components/InteractiveTag"
import { NoteListSkeleton } from "@/components/NoteListSkeleton"
import DOMPurify from "isomorphic-dompurify"
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
  onSelectNote,
  onTagClick,
  onLoadMore,
  hasMore,
  isFetchingNextPage,
  ftsQuery,
  ftsLoading,
  showFTSResults,
  ftsData,
  onSearchResultClick
}: NoteListProps) {
  
  // FTS Loading State
  if (ftsQuery.length >= 3 && ftsLoading) {
    return (
      <div className="p-4">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="w-6 h-6 animate-spin text-primary mr-2" />
          <span className="text-sm text-muted-foreground">Поиск заметок...</span>
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
            Найдено: <span className="font-semibold">{ftsData.total}</span> {ftsData.total === 1 ? 'заметка' : 'заметок'}
          </div>
          {typeof ftsData.executionTime === 'number' && (
            <div className="flex items-center gap-2">
              <span>{ftsData.executionTime}ms</span>
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Быстрый поиск
              </Badge>
            </div>
          )}
        </div>

        {/* FTS Results List */}
        <div className="space-y-4">
          {ftsData.results.map((note) => (
            <Card
              key={note.id}
              className="hover:shadow-md transition-shadow cursor-pointer"
              onClick={() => onSearchResultClick(note)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between gap-2">
                  <CardTitle className="text-lg line-clamp-2">
                    {note.title || 'Без названия'}
                  </CardTitle>
                  <div className="flex gap-1 flex-shrink-0">
                    {note.rank !== undefined && note.rank !== null && (
                      <Badge variant="secondary" className="text-xs">
                        {(note.rank * 100).toFixed(1)}%
                      </Badge>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-3">
                {/* Highlighted content preview */}
                {note.headline && (
                  <div
                    className="text-sm text-muted-foreground line-clamp-3"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(note.headline, { ALLOWED_TAGS: ['mark'] })
                    }}
                    style={{
                      '--mark-bg': 'hsl(var(--primary) / 0.2)',
                      '--mark-color': 'hsl(var(--primary))'
                    } as React.CSSProperties}
                  />
                )}

                {/* Tags */}
                {note.tags && note.tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {note.tags.slice(0, 5).map((tag, idx) => (
                      <Badge key={idx} variant="outline" className="text-xs">
                        {tag}
                      </Badge>
                    ))}
                    {note.tags.length > 5 && (
                      <Badge variant="outline" className="text-xs">
                        +{note.tags.length - 5}
                      </Badge>
                    )}
                  </div>
                )}

                {/* Metadata */}
                <div className="text-xs text-muted-foreground">
                  {new Date(note.updated_at).toLocaleDateString('ru-RU', {
                    year: 'numeric',
                    month: 'short',
                    day: 'numeric'
                  })}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
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
          <div
            key={note.id}
            onClick={() => onSelectNote(note)}
            className={`p-3 rounded-lg cursor-pointer transition-colors ${
              selectedNoteId === note.id
                ? 'bg-accent border'
                : 'hover:bg-muted/50 border border-transparent'
            }`}
          >
            <h3 className="font-semibold truncate">{note.title}</h3>
            <p className="text-sm text-muted-foreground truncate mt-1">
              {note.description}
            </p>
            {note.tags && note.tags.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {note.tags.slice(0, 3).map((tag, index) => (
                  <InteractiveTag
                    key={index}
                    tag={tag}
                    onClick={onTagClick}
                    showIcon={false}
                    className="text-xs px-2 py-0.5"
                  />
                ))}
              </div>
            )}
            <p className="text-xs text-muted-foreground mt-2">
              {new Date(note.updated_at).toLocaleDateString()}
            </p>
          </div>
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
