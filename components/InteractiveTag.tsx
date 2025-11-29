"use client"

import * as React from "react"
import { Tag, X } from "lucide-react"

import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

type InteractiveTagProps = {
  tag: string
  onRemove?: (tag: string) => void
  onClick?: (tag: string) => void
  showIcon?: boolean
  className?: string
}

export default function InteractiveTag({
  tag,
  onRemove,
  onClick,
  showIcon = true,
  className,
}: InteractiveTagProps) {
  const [isHovered, setIsHovered] = React.useState(false)

  const handleTagClick = (event: React.MouseEvent<HTMLDivElement>) => {
    event.stopPropagation() // Prevent card onClick from firing
    const target = event.target as HTMLElement | null
    if (target?.closest(".remove-tag")) return
    onClick?.(tag)
  }

  const handleRemoveClick = (event: React.MouseEvent<HTMLButtonElement>) => {
    event.stopPropagation()
    onRemove?.(tag)
  }

  return (
    <Badge
      variant="secondary"
      data-cy="interactive-tag"
      className={cn(
        "cursor-pointer transition-all duration-200 hover:bg-accent hover:text-accent-foreground group relative",
        className
      )}
      onClick={handleTagClick}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {showIcon && <Tag className="w-3 h-3 mr-1" />}
      {tag}

      {onRemove && (
        <button
          type="button"
          className={cn(
            "remove-tag ml-2 p-0.5 rounded-full transition-opacity duration-200 hover:bg-destructive/20 hover:text-destructive",
            isHovered ? "opacity-100" : "opacity-0"
          )}
          onClick={handleRemoveClick}
          title={`Remove tag "${tag}"`}
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </Badge>
  )
}
