"use client"

import * as React from "react"
import { MoreVertical, Edit2, Trash2, Tag as TagIcon } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { TagWithCount } from "@core/types/tags"
import { cn } from "@ui/web/lib/utils"

interface TagCardProps {
  tag: TagWithCount
  onSelectTag: (tagName: string) => void
  onRequestRename: (tag: TagWithCount) => void
  onRequestDelete: (tag: TagWithCount) => void
  isHighlighted?: boolean
  className?: string
}

export function TagCard({
  tag,
  onSelectTag,
  onRequestRename,
  onRequestDelete,
  isHighlighted,
  className,
}: TagCardProps) {
  return (
    <div
      id={`tag-card-${encodeURIComponent(tag.name)}`}
      data-testid={`tag-card-${tag.name}`}
      className={cn(
        "group flex items-center justify-between p-3 rounded-xl border border-border/80 bg-card hover:bg-accent/40 active:scale-[0.99] transition-all shadow-sm hover:shadow min-h-[52px]",
        isHighlighted && "ring-2 ring-primary bg-primary/10 border-primary/50 shadow-md animate-pulse",
        className
      )}
    >
      <button
        type="button"
        onClick={() => onSelectTag(tag.name)}
        className="flex items-center gap-2.5 flex-1 min-w-0 text-left cursor-pointer group-hover:text-primary transition-colors py-1"
        data-testid={`select-tag-${tag.name}`}
      >
        <TagIcon className={cn("h-4 w-4 text-muted-foreground shrink-0 group-hover:text-primary transition-colors", isHighlighted && "text-primary")} />
        <span className={cn("font-medium text-sm text-foreground truncate", isHighlighted && "font-bold text-primary")}>
          {tag.name}
        </span>
        {isHighlighted ? (
          <span className="text-[10px] font-bold uppercase tracking-wider text-primary bg-primary/20 px-2 py-0.5 rounded-full shrink-0">
            Updated
          </span>
        ) : (
          <span className="text-xs font-semibold text-muted-foreground bg-muted px-2 py-0.5 rounded-full shrink-0">
            ({tag.count})
          </span>
        )}
      </button>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button
            variant="ghost"
            size="icon"
            className="h-9 w-9 rounded-lg text-muted-foreground opacity-90 group-hover:opacity-100 hover:text-foreground hover:bg-muted shrink-0"
            aria-label={`Actions for tag ${tag.name}`}
            data-testid={`tag-menu-trigger-${tag.name}`}
          >
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-40">
          <DropdownMenuItem
            onClick={() => onRequestRename(tag)}
            data-testid={`rename-action-${tag.name}`}
            className="cursor-pointer gap-2"
          >
            <Edit2 className="h-4 w-4 text-muted-foreground" />
            <span>Rename</span>
          </DropdownMenuItem>
          <DropdownMenuItem
            onClick={() => onRequestDelete(tag)}
            data-testid={`delete-action-${tag.name}`}
            className="cursor-pointer gap-2 text-destructive focus:text-destructive"
          >
            <Trash2 className="h-4 w-4" />
            <span>Delete</span>
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  )
}
