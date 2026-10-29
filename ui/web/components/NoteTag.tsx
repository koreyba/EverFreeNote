"use client"

import { Tag, X } from "@phosphor-icons/react"
import { cn } from "@ui/web/lib/utils"

type NoteTagProps = {
  tag: string
  onClick?: (tag: string) => void
  onRemove?: (tag: string) => void
  armed?: boolean
  variant?: "editor" | "reader"
}

export function NoteTag({ tag, onClick, onRemove, armed, variant = "reader" }: NoteTagProps) {
  return (
    <span data-cy="interactive-tag" className={cn(
      "group relative inline-flex h-11 max-w-full min-w-0 items-center font-semibold text-secondary-foreground",
      "text-[11px]",
    )}>
      {/* Keep the original compact badge appearance inside accessible hit areas. */}
      <span aria-hidden="true" className={cn("pointer-events-none absolute inset-x-0 inset-y-2 border",
        variant === "editor" ? "rounded-full border-border bg-background shadow-sm" : "rounded-full border-transparent bg-secondary",
        armed && "ring-2 ring-destructive",
      )} />
      {onClick ? (
        <button type="button" className="relative flex h-11 min-w-11 items-center rounded-md px-2.5 hover:text-accent-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary" title={tag}
          onClick={(event) => { event.stopPropagation(); onClick(tag) }}>
          <Tag className="mr-1 h-3 w-3 shrink-0 opacity-70" /><span className="truncate">{tag}</span>
        </button>
      ) : <span className="relative flex min-w-0 items-center px-2.5" title={tag}><Tag className="mr-1 h-3 w-3 shrink-0 opacity-70" /><span className="truncate">{tag}</span></span>}
      {onRemove && (
        <button type="button" className="relative flex h-11 w-7 shrink-0 items-center justify-center rounded-md hover:text-destructive focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
          title={`Remove tag "${tag}"`} aria-label={`Remove tag "${tag}"`}
          onMouseDown={(event) => event.preventDefault()}
          onClick={(event) => { event.stopPropagation(); onRemove(tag) }}>
          <X className="h-3 w-3 opacity-100 md:opacity-0 md:group-hover:opacity-100 md:group-focus-within:opacity-100" />
        </button>
      )}
    </span>
  )
}
