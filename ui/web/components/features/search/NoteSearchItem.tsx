import { useState } from 'react'
import { ChevronDown, ChevronUp, Tag } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { ChunkSnippet } from './ChunkSnippet'
import type { RagNoteGroup } from '@core/types/ragSearch'

interface NoteSearchItemProps {
  group: RagNoteGroup
  onOpenInContext: (noteId: string, charOffset: number, chunkLength: number) => void
}

function ScoreBadge({ score }: { score: number }) {
  const pct = Math.round(score * 100)
  return (
    <span className="text-xs font-medium text-muted-foreground tabular-nums">
      {pct}%
    </span>
  )
}

export function NoteSearchItem({ group, onOpenInContext }: NoteSearchItemProps) {
  const [expanded, setExpanded] = useState(false)

  const topChunk = group.chunks[0]
  const extraChunks = group.chunks.slice(1)
  const hasMore = extraChunks.length > 0 || group.hiddenCount > 0

  return (
    <div className="py-2 border-b last:border-b-0" role="listitem">
      {/* Note header */}
      <div className="flex items-start justify-between gap-2 mb-1">
        <span className="text-sm font-medium leading-snug flex-1 line-clamp-2">
          {group.noteTitle || 'Untitled'}
        </span>
        <ScoreBadge score={group.topScore} />
      </div>

      {/* Tags */}
      {group.noteTags.length > 0 && (
        <div className="flex flex-wrap gap-1 mb-1">
          {group.noteTags.map((tag) => (
            <Badge key={tag} variant="outline" className="text-xs h-4 px-1 py-0">
              <Tag className="w-2 h-2 mr-0.5" />
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {/* Top chunk snippet */}
      {topChunk && (
        <div className="mb-1">
          <ChunkSnippet content={topChunk.content} />
        </div>
      )}

      {/* Expanded chunks (accordion) */}
      {expanded && extraChunks.map((chunk) => (
        <div key={chunk.chunkIndex} className="mt-1 pl-2 border-l-2 border-muted">
          <div className="flex items-start justify-between gap-2">
            <ChunkSnippet content={chunk.content} />
            <ScoreBadge score={chunk.similarity} />
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-xs px-0 mt-0.5"
            onClick={() => onOpenInContext(group.noteId, chunk.charOffset, chunk.content.length)}
          >
            Open in context
          </Button>
        </div>
      ))}

      {/* Hidden count */}
      {expanded && group.hiddenCount > 0 && (
        <p className="text-xs text-muted-foreground mt-1 pl-2">
          +{group.hiddenCount} similar hidden
        </p>
      )}

      {/* Show more / less + open top chunk */}
      <div className="flex items-center gap-2 mt-1">
        {topChunk && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-xs px-0"
            onClick={() => onOpenInContext(group.noteId, topChunk.charOffset, topChunk.content.length)}
          >
            Open in context
          </Button>
        )}
        {hasMore && (
          <Button
            variant="ghost"
            size="sm"
            className="h-5 text-xs px-0 ml-auto"
            onClick={() => setExpanded((v) => !v)}
          >
            {expanded ? (
              <><ChevronUp className="w-3 h-3 mr-0.5" /> Show less</>
            ) : (
              <><ChevronDown className="w-3 h-3 mr-0.5" /> {extraChunks.length} more fragment{extraChunks.length !== 1 ? 's' : ''}</>
            )}
          </Button>
        )}
      </div>
    </div>
  )
}
