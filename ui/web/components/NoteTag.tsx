"use client"

import { X } from "@phosphor-icons/react"
import { cn } from "@ui/web/lib/utils"

type NoteTagProps = {
  tag: string
  onClick?: (tag: string) => void
  onRemove?: (tag: string) => void
  armed?: boolean
}

export function NoteTag({ tag, onClick, onRemove, armed }: NoteTagProps) {
  return (
    <span data-cy="interactive-tag" className={cn(
      "inline-flex max-w-full min-w-0 items-center rounded-lg bg-muted/70 text-[13px] font-medium text-foreground/75",
      armed && "ring-2 ring-destructive",
    )}>
      {onClick ? (
        <button type="button" className="min-h-11 min-w-11 truncate rounded-lg px-2 hover:bg-accent focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title={tag}
          onClick={(event) => { event.stopPropagation(); onClick(tag) }}>
          {tag}
        </button>
      ) : <span className="min-w-0 truncate px-2 py-1.5" title={tag}>{tag}</span>}
      {onRemove && (
        <button type="button" className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg hover:bg-destructive/10 hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`Remove tag "${tag}"`} aria-label={`Remove tag "${tag}"`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => { event.stopPropagation(); onRemove(tag) }}>
          <X className="h-3.5 w-3.5" />
        </button>
      )}
    </span>
  )
}
