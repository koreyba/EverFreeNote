"use client"

import * as React from "react"
import { Plus, Tag } from "@phosphor-icons/react"
import { NoteTag } from "@/components/NoteTag"
import { cn } from "@ui/web/lib/utils"

type TagInputProps = Readonly<{
  tags: string[]
  onAddTags: (tags: string[]) => void
  onRemoveTag: (tag: string) => void
  onTagClick?: (tag: string) => void
  suggestions?: string[]
  tagCounts?: Record<string, number>
  onQueryChange?: (query: string) => void
  placeholder?: string
  disabled?: boolean
  className?: string
}>

export function TagInput({
  tags,
  onAddTags,
  onRemoveTag,
  onTagClick,
  suggestions = [],
  tagCounts = {},
  onQueryChange,
  placeholder = "Add tag...",
  disabled = false,
  className,
}: TagInputProps) {
  const [inputValue, setInputValue] = React.useState("")
  const [backspaceArmed, setBackspaceArmed] = React.useState(false)
  const [highlightedIndex, setHighlightedIndex] = React.useState<number>(-1)
  const [expanded, setExpanded] = React.useState(false)
  const collectionId = React.useId()
  const showAll = expanded || tags.length <= 3
  const inputRef = React.useRef<HTMLInputElement>(null)

  // Reset highlighted suggestion index when suggestions list changes
  React.useEffect(() => {
    setHighlightedIndex(-1)
  }, [suggestions])

  const focusInput = () => {
    if (disabled) return
    setExpanded(true)
    setTimeout(() => {
      inputRef.current?.focus()
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

  const getHighlightedSuggestion = () =>
    suggestions.length > 0 && highlightedIndex >= 0 ? suggestions.at(highlightedIndex) : undefined

  const handleArrowKey = (event: React.KeyboardEvent<HTMLInputElement>, direction: 1 | -1) => {
    if (suggestions.length === 0) return

    event.preventDefault()
    setHighlightedIndex((prev) => {
      if (direction === 1) return prev < suggestions.length - 1 ? prev + 1 : 0
      return prev > 0 ? prev - 1 : suggestions.length - 1
    })
  }

  const handleSelectionKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    const suggestion = getHighlightedSuggestion()
    if (suggestion) {
      handleSuggestionClick(suggestion)
      return
    }
    commitTags(inputValue)
  }

  const handleTabKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    const suggestion = getHighlightedSuggestion()
    if (suggestion) {
      event.preventDefault()
      handleSuggestionClick(suggestion)
      return
    }
    if (inputValue.trim()) commitTags(inputValue)
  }

  const handleEscapeKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    setInputValue("")
    onQueryChange?.("")
    setBackspaceArmed(false)
    setHighlightedIndex(-1)
  }

  const handleBackspaceKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (inputValue.length > 0 || tags.length === 0) return

    event.preventDefault()
    const lastTag = tags.at(-1)
    if (backspaceArmed) {
      setBackspaceArmed(false)
      if (lastTag) onRemoveTag(lastTag)
      return
    }
    setBackspaceArmed(true)
  }

  const handleInputKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    switch (event.key) {
      case "ArrowDown":
        handleArrowKey(event, 1)
        return
      case "ArrowUp":
        handleArrowKey(event, -1)
        return
      case "Tab":
        handleTabKey(event)
        return
      case "Enter":
      case ",":
        handleSelectionKey(event)
        return
      case "Escape":
        handleEscapeKey(event)
        return
      case "Backspace":
        handleBackspaceKey(event)
        return
      default:
        setBackspaceArmed(false)
    }
  }

  const isExpanded = !disabled && showAll && suggestions.length > 0

  return (
    <div className={cn("relative z-30", className)}>
      <div
        data-testid="tag-input-container"
        onClick={() => focusInput()}
        onKeyDown={(e) => {
          if (e.target !== e.currentTarget) return
          if ((e.key === "Enter" || e.key === " ") && !disabled) {
            e.preventDefault()
            focusInput()
          }
        }}
        className={cn(
          "flex min-h-11 min-w-0 items-start gap-2 cursor-text"
        )}
      >
        <div data-cy="tag-input-label" className="sr-only">
          <Tag className="w-3.5 h-3.5" />
          <span>Tags</span>
        </div>

        <div id={collectionId} className="flex min-w-0 flex-1 flex-wrap items-center gap-1.5">
          {(showAll ? tags : tags.slice(0, 3)).map((tag) => (
            <NoteTag
              key={tag}
              tag={tag}
              onClick={onTagClick}
              onRemove={showAll && !disabled ? onRemoveTag : undefined}
              armed={backspaceArmed && tag === tags.at(-1)}
            />
          ))}

          {tags.length > 3 && (
            <button type="button" className="min-h-11 min-w-11 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"
              aria-label={expanded ? "Show fewer tags" : `Show all ${tags.length} tags`}
              aria-expanded={expanded} aria-controls={collectionId}
              onClick={(event) => { event.stopPropagation(); setExpanded(!expanded) }}>
              {expanded ? "Show less" : <>+{tags.length - 3}<span className="hidden min-[360px]:inline"> more</span></>}
            </button>
          )}

          {!disabled && (
            <input
              ref={inputRef}
              hidden={!showAll}
              type="text"
              role="combobox"
              aria-autocomplete="list"
              aria-label="Add tags"
              aria-expanded={isExpanded}
              aria-haspopup="listbox"
              aria-controls="tag-suggestions-listbox"
              aria-activedescendant={highlightedIndex >= 0 ? `tag-suggestion-option-${highlightedIndex}` : undefined}
              value={inputValue}
              onChange={handleInputChange}
              onKeyDown={handleInputKeyDown}
              onBlur={handleInputBlur}
              placeholder={placeholder}
              className="h-11 min-w-24 flex-1 max-w-48 rounded-md bg-transparent px-1 text-sm outline-none placeholder:text-muted-foreground focus-visible:shadow-[inset_0_-2px_0_var(--color-primary)]"
              disabled={disabled}
            />
          )}
        </div>

        <button
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            focusInput()
          }}
          className={cn(
            "shrink-0 flex items-center justify-center w-11 h-11 rounded-lg",
            "hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "text-muted-foreground hover:text-accent-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          title="Add tag"
          aria-label="Add tag"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Suggestions dropdown */}
      {isExpanded && (
        <div
          id="tag-suggestions-listbox"
          role="listbox"
          className="absolute z-50 mt-1 w-full max-w-xs rounded-md border border-input bg-popover text-popover-foreground shadow-lg"
        >
          {suggestions.map((suggestion, index) => {
            const count = tagCounts[suggestion]
            return (
              <button
                key={suggestion}
                id={`tag-suggestion-option-${index}`}
                type="button"
                role="option"
                aria-selected={index === highlightedIndex}
                className={cn(
                  "w-full px-3 py-2 text-left text-sm flex items-center justify-between transition-colors first:rounded-t-md last:rounded-b-md",
                  index === highlightedIndex ? "bg-accent text-accent-foreground font-semibold" : "hover:bg-muted"
                )}
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSuggestionClick(suggestion)}
              >
                <span>{suggestion}</span>
                {typeof count === "number" && (
                  <span className="text-xs text-muted-foreground bg-muted/60 px-1.5 py-0.5 rounded-full font-mono font-normal">
                    {count}
                  </span>
                )}
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}

