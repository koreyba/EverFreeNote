"use client"

import * as React from "react"
import { Plus, X, Tag } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { HorizontalTagScroll } from "@/components/HorizontalTagScroll"
import { cn } from "@ui/web/lib/utils"

type TagInputProps = {
  tags: string[]
  onAddTags: (tags: string[]) => void
  onRemoveTag: (tag: string) => void
  onTagClick?: (tag: string) => void
  suggestions?: string[]
  onQueryChange?: (query: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}

export function TagInput({
  tags,
  onAddTags,
  onRemoveTag,
  onTagClick,
  suggestions = [],
  onQueryChange,
  placeholder = "Add tag...",
  disabled = false,
  className,
}: TagInputProps) {
  const [isEditing, setIsEditing] = React.useState(false)
  const [inputValue, setInputValue] = React.useState("")
  const [backspaceArmed, setBackspaceArmed] = React.useState(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  const handleStartEditing = () => {
    if (disabled) return
    setIsEditing(true)
    // Scroll to end when opening input
    setTimeout(() => {
      inputRef.current?.focus()
      if (scrollContainerRef.current) {
        scrollContainerRef.current.scrollLeft = scrollContainerRef.current.scrollWidth
      }
    }, 0)
  }

  const handleInputChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const value = event.target.value
    setInputValue(value)
    setBackspaceArmed(false)
    onQueryChange?.(value)
  }

  const commitTags = (value: string) => {
    const parts = value
      .split(",")
      .map((t) => t.trim().toLowerCase())
      .filter((t) => t.length > 0)

    if (parts.length > 0) {
      onAddTags(parts)
    }
    setInputValue("")
    onQueryChange?.("")
    setBackspaceArmed(false)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      commitTags(inputValue)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setIsEditing(false)
      setInputValue("")
      onQueryChange?.("")
      setBackspaceArmed(false)
      return
    }

    if (event.key === "Backspace" && inputValue.length === 0 && tags.length > 0) {
      event.preventDefault()
      const lastTag = tags[tags.length - 1]
      if (backspaceArmed) {
        setBackspaceArmed(false)
        if (lastTag) onRemoveTag(lastTag)
      } else {
        setBackspaceArmed(true)
      }
      return
    }

    if (event.key !== "Backspace") {
      setBackspaceArmed(false)
    }
  }

  const handleInputBlur = () => {
    if (inputValue.trim()) {
      commitTags(inputValue)
    }
    setIsEditing(false)
    setBackspaceArmed(false)
  }

  const handleSuggestionClick = (suggestion: string) => {
    onAddTags([suggestion])
    setInputValue("")
    onQueryChange?.("")
    inputRef.current?.focus()
  }

  const handleTagClick = (tag: string) => {
    onTagClick?.(tag)
  }

  const handleRemoveClick = (event: React.MouseEvent, tag: string) => {
    event.stopPropagation()
    onRemoveTag(tag)
  }

  return (
    <div className={cn("relative overflow-hidden", className)}>
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-2">
        <Tag className="w-4 h-4" />
        <span>Tags:</span>
      </div>

      <div className="flex items-center gap-2 max-w-full">
        <HorizontalTagScroll
          ref={scrollContainerRef}
          className="flex-1 min-w-0 py-2"
        >
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              data-cy="interactive-tag"
              className={cn(
                "shrink-0 cursor-pointer transition-all duration-200 hover:bg-accent hover:text-accent-foreground group relative",
                backspaceArmed && tag === tags[tags.length - 1] && "ring-2 ring-destructive"
              )}
              onClick={() => handleTagClick(tag)}
            >
              <Tag className="w-3 h-3 mr-1" />
              {tag}
              <button
                type="button"
                className={cn(
                  "ml-2 p-0.5 rounded-full transition-opacity duration-200 hover:bg-destructive/20 hover:text-destructive",
                  "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                )}
                onClick={(e) => handleRemoveClick(e, tag)}
                title={`Remove tag "${tag}"`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {isEditing && (
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className="shrink-0 min-w-[120px] max-w-[200px] bg-transparent text-sm outline-none placeholder:text-muted-foreground"
              disabled={disabled}
            />
          )}
        </HorizontalTagScroll>

        {/* Fixed add button */}
        {!isEditing && (
          <button
            type="button"
            onClick={handleStartEditing}
            disabled={disabled}
            className={cn(
              "shrink-0 flex items-center justify-center w-7 h-7 rounded-full",
              "bg-muted hover:bg-accent transition-colors duration-200",
              "text-muted-foreground hover:text-accent-foreground",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title="Add tag"
          >
            <Plus className="w-4 h-4" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isEditing && suggestions.length > 0 && (
        <div className="absolute z-10 mt-1 w-full max-w-xs rounded-md border border-input bg-popover text-popover-foreground shadow-md">
          {suggestions.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              className="w-full px-3 py-2 text-left text-sm hover:bg-muted first:rounded-t-md last:rounded-b-md"
              onMouseDown={(e) => e.preventDefault()}
              onClick={() => handleSuggestionClick(suggestion)}
            >
              {suggestion}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
