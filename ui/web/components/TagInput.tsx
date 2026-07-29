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
  const [inputValue, setInputValue] = React.useState("")
  const [backspaceArmed, setBackspaceArmed] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const scrollContainerRef = React.useRef<HTMLDivElement>(null)

  // Reset highlighted suggestion index when suggestions list changes
  React.useEffect(() => {
    setHighlightedIndex(-1)
  }, [suggestions])

  const focusInput = () => {
    if (disabled) return
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
    setHighlightedIndex(-1)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown") {
      if (suggestions.length > 0) {
        event.preventDefault()
        setHighlightedIndex((prev) => (prev < suggestions.length - 1 ? prev + 1 : 0))
      }
      return
    }

    if (event.key === "ArrowUp") {
      if (suggestions.length > 0) {
        event.preventDefault()
        setHighlightedIndex((prev) => (prev > 0 ? prev - 1 : suggestions.length - 1))
      }
      return
    }

    if (event.key === "Tab") {
      if (suggestions.length > 0 && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        event.preventDefault()
        handleSuggestionClick(suggestions[highlightedIndex])
        return
      }
      if (inputValue.trim()) {
        commitTags(inputValue)
      }
      return
    }

    if (event.key === "Enter" || event.key === ",") {
      event.preventDefault()
      if (suggestions.length > 0 && highlightedIndex >= 0 && suggestions[highlightedIndex]) {
        handleSuggestionClick(suggestions[highlightedIndex])
        return
      }
      commitTags(inputValue)
      return
    }

    if (event.key === "Escape") {
      event.preventDefault()
      setInputValue("")
      onQueryChange?.("")
      setBackspaceArmed(false)
      setHighlightedIndex(-1)
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
    setBackspaceArmed(false)
    setHighlightedIndex(-1)
  }

  const handleSuggestionClick = (suggestion: string) => {
    onAddTags([suggestion])
    setInputValue("")
    onQueryChange?.("")
    setHighlightedIndex(-1)
    inputRef.current?.focus()
  }

  const handleTagClick = (tag: string) => {
    onTagClick?.(tag)
  }

  const handleRemoveClick = (event: React.MouseEvent, tag: string) => {
    event.stopPropagation()
    onRemoveTag(tag)
  }

  const isExpanded = !disabled && suggestions.length > 0

  return (
    <div className={cn("relative z-30 group", className)}>
      <div
        role="presentation"
        data-testid="tag-input-container"
        onClick={() => focusInput()}
        onKeyDown={(e) => {
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault()
            focusInput()
          }
        }}
        className={cn(
          "flex items-center min-h-[44px] px-3 bg-muted/30 border border-transparent rounded-2xl transition-all duration-200 cursor-text bg-background border-primary/30 shadow-[0_2px_10px_-3px_rgba(0,0,0,0.05)] ring-4 ring-primary/5"
        )}
      >
        <div className="flex items-center gap-1.5 text-xs font-bold text-foreground/70 uppercase tracking-wider shrink-0 mr-2 select-none">
          <Tag className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Tags</span>
        </div>

        <HorizontalTagScroll
          ref={scrollContainerRef}
          className="flex-1 min-w-0 py-1.5 flex items-center cursor-text"
        >
          {tags.map((tag) => (
            <Badge
              key={tag}
              variant="secondary"
              data-cy="interactive-tag"
              className={cn(
                "shrink-0 cursor-pointer transition-all duration-200 hover:bg-accent hover:text-accent-foreground group relative rounded-full px-2.5 py-1 text-[11px] bg-background border shadow-sm",
                backspaceArmed && tag === tags[tags.length - 1] && "ring-2 ring-destructive"
              )}
              onMouseDown={(e) => {
                // Prevent focus loss from input when clicking tags/remove buttons
                e.preventDefault()
              }}
              onClick={(e) => {
                e.stopPropagation()
                handleTagClick(tag)
              }}
            >
              <Tag className="w-3 h-3 mr-1 opacity-70" />
              {tag}
              <button
                type="button"
                className={cn(
                  "ml-1.5 p-0.5 rounded-full transition-opacity duration-200 hover:bg-destructive/20 hover:text-destructive",
                  "opacity-100 md:opacity-0 md:group-hover:opacity-100"
                )}
                onClick={(e) => handleRemoveClick(e, tag)}
                title={`Remove tag "${tag}"`}
              >
                <X className="w-3 h-3" />
              </button>
            </Badge>
          ))}

          {!disabled && (
            <input
              ref={inputRef}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-expanded={isExpanded}
              aria-haspopup="listbox"
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className="shrink-0 min-w-[120px] max-w-[200px] bg-transparent text-sm outline-none placeholder:text-muted-foreground/50 ml-2"
              disabled={disabled}
            />
          )}
        </HorizontalTagScroll>

        {!disabled && (
          <button
            type="button"
            disabled={disabled}
            onClick={(e) => {
              e.stopPropagation()
              focusInput()
            }}
            className={cn(
              "shrink-0 flex items-center justify-center w-7 h-7 rounded-full",
              "bg-background/50 hover:bg-accent transition-colors duration-200 shadow-sm border",
              "text-muted-foreground hover:text-accent-foreground ml-2",
              disabled && "opacity-50 cursor-not-allowed"
            )}
            title="Add tag"
            aria-label="Add tag"
          >
            <Plus className="w-3.5 h-3.5" />
          </button>
        )}
      </div>

      {/* Suggestions dropdown */}
      {isExpanded && (
        <div
          role="listbox"
          className="absolute z-50 mt-1 w-full max-w-xs rounded-md border border-input bg-popover text-popover-foreground shadow-lg"
        >
          {suggestions.map((suggestion, index) => (
            <button
              key={suggestion}
              type="button"
              role="option"
              aria-selected={index === highlightedIndex}
              className={cn(
                "w-full px-3 py-2 text-left text-sm transition-colors first:rounded-t-md last:rounded-b-md",
                index === highlightedIndex ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted"
              )}
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

