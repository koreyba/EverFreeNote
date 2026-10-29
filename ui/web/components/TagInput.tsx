"use client"

import * as React from "react"
import { Plus, Tag } from "@phosphor-icons/react"
import { NoteTagList } from "@/components/NoteTagList"
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
  const [inputOpen, setInputOpen] = React.useState(tags.length === 0)
  const inputId = React.useId()
  const discardBlurRef = React.useRef(false)
  const inputRef = React.useRef<HTMLInputElement>(null)
  const addButtonRef = React.useRef<HTMLButtonElement>(null)

  // Reset highlighted suggestion index when suggestions list changes
  React.useEffect(() => {
    setHighlightedIndex(-1)
  }, [suggestions])

  const focusInput = () => {
    if (disabled) return
    setInputOpen(true)
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

  const clearInput = () => {
    setInputValue("")
    onQueryChange?.("")
    setBackspaceArmed(false)
    setHighlightedIndex(-1)
  }

  const commitTags = (value: string) => {
    const parts = value.split(",").map((tag) => tag.trim().toLowerCase()).filter(Boolean)
    if (parts.length > 0) onAddTags(parts)
    clearInput()
  }

  const closeInput = (restoreFocus: boolean) => {
    setInputOpen(false)
    if (restoreFocus) {
      // Focusing Add synchronously fires blur before React flushes inputValue.
      discardBlurRef.current = inputRef.current?.ownerDocument.activeElement === inputRef.current
      addButtonRef.current?.focus()
    }
  }

  const handleInputBlur = () => {
    if (!discardBlurRef.current && inputValue.trim()) {
      commitTags(inputValue)
    }
    discardBlurRef.current = false
    setBackspaceArmed(false)
    setHighlightedIndex(-1)
    closeInput(false)
  }

  const handleSuggestionClick = (suggestion: string, close: boolean) => {
    onAddTags([suggestion])
    clearInput()
    if (close) closeInput(true)
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

  const handleSelectionKey = (event: React.KeyboardEvent<HTMLInputElement>, close: boolean) => {
    event.preventDefault()
    const suggestion = getHighlightedSuggestion()
    if (suggestion) {
      handleSuggestionClick(suggestion, close)
      return
    }
    commitTags(inputValue)
    if (close) closeInput(true)
  }

  const handleTabKey = () => {
    const suggestion = getHighlightedSuggestion()
    if (suggestion) {
      handleSuggestionClick(suggestion, false)
      discardBlurRef.current = true
    } else if (inputValue.trim()) {
      commitTags(inputValue)
      discardBlurRef.current = true
    }
    // Let Tab move to the next control; its normal blur closes the input.
  }

  const handleEscapeKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    event.preventDefault()
    discardBlurRef.current = true
    setInputValue("")
    onQueryChange?.("")
    setBackspaceArmed(false)
    setHighlightedIndex(-1)
    setInputOpen(false)
    addButtonRef.current?.focus()
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
    // Enter confirms the IME composition first, not the tag.
    if (event.nativeEvent.isComposing || event.nativeEvent.keyCode === 229) return
    switch (event.key) {
      case "ArrowDown":
        handleArrowKey(event, 1)
        return
      case "ArrowUp":
        handleArrowKey(event, -1)
        return
      case "Tab":
        handleTabKey()
        return
      case "Enter":
        handleSelectionKey(event, true)
        return
      case ",":
        handleSelectionKey(event, false)
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

  const isExpanded = !disabled && inputOpen && suggestions.length > 0

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

        <NoteTagList tags={tags} expanded={expanded} onExpandedChange={setExpanded}
          onTagClick={onTagClick} onRemoveTag={disabled ? undefined : onRemoveTag}
          armedTag={backspaceArmed ? tags.at(-1) : undefined} variant="editor" />

        <button
          ref={addButtonRef}
          type="button"
          disabled={disabled}
          onClick={(e) => {
            e.stopPropagation()
            if (inputOpen) {
              inputRef.current?.blur()
              setInputOpen(false)
            } else focusInput()
          }}
          className={cn(
            "shrink-0 flex items-center justify-center w-11 h-11 rounded-lg",
            "hover:bg-accent transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary",
            "text-muted-foreground hover:text-accent-foreground",
            disabled && "opacity-50 cursor-not-allowed"
          )}
          title="Add tag"
          aria-label="Add tag"
          aria-expanded={inputOpen}
          aria-controls={inputId}
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </div>

      {!disabled && (
        <input
          ref={inputRef}
          id={inputId}
          hidden={!inputOpen}
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
          className="mt-1 h-11 w-full min-w-0 rounded-md bg-muted/30 px-2 text-base md:max-w-xs md:text-sm outline-none placeholder:text-muted-foreground focus-visible:shadow-[inset_0_-2px_0_var(--color-primary)]"
          disabled={disabled}
        />
      )}
      {inputOpen && backspaceArmed && <p role="status" className="mt-1 text-xs text-muted-foreground">Press Backspace again to remove “{tags.at(-1)}”.</p>}

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
                onClick={() => handleSuggestionClick(suggestion, true)}
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

