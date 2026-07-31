"use client"

import * as React from "react"
import { Search, Tag as TagIcon } from "lucide-react"
import { Input } from "@/components/ui/input"
import { ThemeToggle } from "@/components/theme-toggle"
import { getTagsWithCounts, groupTagsAlphabetically } from "@core/services/tags"
import type { TagWithCount } from "@core/types/tags"
import { cn } from "@ui/web/lib/utils"
import { AlphabeticalGrid } from "./AlphabeticalGrid"
import { TagCard } from "./TagCard"
import { RenameTagDialog } from "./RenameTagDialog"
import { DeleteTagDialog } from "./DeleteTagDialog"

interface NoteLike {
  readonly tags?: string[]
}

interface TagsPageProps {
  readonly notes: NoteLike[]
  readonly onSelectTag: (string) => void
  readonly onRenameTag: (string, string) => void
  readonly onDeleteTag: (string) => void
  readonly className?: string
}

export function TagsPage({
  notes,
  onSelectTag,
  onRenameTag,
  onDeleteTag,
  className,
}: TagsPageProps) {
  const containerRef = React.useRef<HTMLDivElement | null>(null)
  const [searchQuery, setSearchQuery] = React.useState("")
  const [selectedLetter, setSelectedLetter] = React.useState<string | null>(null)
  const [highlightedTag, setHighlightedTag] = React.useState<string | null>(null)
  const highlightTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null)

  const [renameTarget, setRenameTarget] = React.useState<TagWithCount | null>(null)
  const [deleteTarget, setDeleteTarget] = React.useState<TagWithCount | null>(null)

  React.useEffect(() => {
    return () => {
      if (highlightTimeoutRef.current) {
        clearTimeout(highlightTimeoutRef.current)
      }
    }
  }, [])

  // 1. Aggregate and sort tags from notes using core tag service
  const allTags = React.useMemo(() => {
    return getTagsWithCounts(notes)
  }, [notes])

  // 2. Filter tags by search query
  const filteredTags = React.useMemo(() => {
    if (!searchQuery.trim()) return allTags
    const queryLower = searchQuery.trim().toLowerCase()
    return allTags.filter((t) => t.name.toLowerCase().includes(queryLower))
  }, [allTags, searchQuery])

  // 3. Group filtered tags alphabetically
  const groupedTags = React.useMemo(() => {
    return groupTagsAlphabetically(filteredTags)
  }, [filteredTags])

  // Available letter jump options
  const availableLetters = React.useMemo(() => {
    return groupedTags.map((g) => g.letter)
  }, [groupedTags])

  // Filter by selected letter if active
  const displayedGroups = React.useMemo(() => {
    if (!selectedLetter) return groupedTags
    return groupedTags.filter((g) => g.letter === selectedLetter)
  }, [groupedTags, selectedLetter])

  // Deterministic smooth scroll helper that works on both desktop & mobile containers
  const scrollToTarget = React.useCallback((targetId: string) => {
    requestAnimationFrame(() => {
      setTimeout(() => {
        const container = containerRef.current ?? document.getElementById("tags-page-container")
        const target = document.getElementById(targetId)
        if (!container || !target) return

        const containerRect = container.getBoundingClientRect()
        const targetRect = target.getBoundingClientRect()
        const relativeTop = targetRect.top - containerRect.top + container.scrollTop - 20

        container.scrollTo({
          top: Math.max(0, relativeTop),
          behavior: "smooth",
        })
      }, 80)
    })
  }, [])

  const handleJumpToLetter = React.useCallback((letter: string) => {
    scrollToTarget(`tag-group-${encodeURIComponent(letter)}`)
  }, [scrollToTarget])

  const handleConfirmRename = React.useCallback((oldTag: string, newTag: string) => {
    onRenameTag(oldTag, newTag)
    setRenameTarget(null)

    // Clear letter filter to ensure target letter section is rendered
    setSelectedLetter(null)

    // Highlight renamed tag
    const normalizedNewTag = newTag.trim()
    setHighlightedTag(normalizedNewTag)

    // Smoothly scroll to the target tag card
    scrollToTarget(`tag-card-${encodeURIComponent(normalizedNewTag)}`)

    // Remove glow highlight after 2.5 seconds
    if (highlightTimeoutRef.current) {
      clearTimeout(highlightTimeoutRef.current)
    }
    highlightTimeoutRef.current = setTimeout(() => {
      setHighlightedTag((current) => (current === normalizedNewTag ? null : current))
      highlightTimeoutRef.current = null
    }, 2500)
  }, [onRenameTag, scrollToTarget])

  return (
    <div
      id="tags-page-container"
      ref={containerRef}
      data-testid="tags-page"
      className={cn("flex-1 flex flex-col h-full bg-background overflow-y-auto p-4 md:p-8 max-w-5xl mx-auto w-full pb-32 md:pb-12 scroll-smooth", className)}
    >
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4 mb-6 pb-4 border-b">
        <div className="w-full sm:w-auto space-y-1">
          <div className="flex items-center justify-between gap-3">
            <h1 className="text-xl sm:text-2xl font-bold tracking-tight flex items-center gap-2">
              <TagIcon className="h-5 w-5 sm:h-6 sm:w-6 text-primary shrink-0" />
              Tag Management
            </h1>
            {/* Mobile Theme Toggle aligned directly with heading */}
            <div className="sm:hidden shrink-0">
              <ThemeToggle />
            </div>
          </div>
          <p className="text-xs sm:text-sm text-muted-foreground">
            Total tags: <span className="font-semibold text-foreground">{allTags.length}</span>
          </p>
        </div>

        <div className="flex items-center gap-3 w-full sm:w-auto">
          {/* Tag Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground pointer-events-none" />
            <Input
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search tags..."
              className="pl-9 rounded-full bg-muted/40 hover:bg-muted/70 focus:bg-background transition-colors text-sm w-full"
              data-testid="tags-search-input"
            />
          </div>
          {/* Desktop Theme Toggle */}
          <div className="hidden sm:block shrink-0">
            <ThemeToggle />
          </div>
        </div>
      </div>

      {/* Alphabetical Grid Navigation Bar */}
      {availableLetters.length > 0 && (
        <div className="mb-6 space-y-1.5">
          <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Alphabetical Index
          </p>
          <AlphabeticalGrid
            availableLetters={availableLetters}
            selectedLetter={selectedLetter}
            onSelectLetter={setSelectedLetter}
            onJumpToLetter={handleJumpToLetter}
          />
        </div>
      )}

      {/* Main Content Area */}
      {displayedGroups.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 text-center border border-dashed rounded-2xl bg-muted/10 my-auto">
          <TagIcon className="h-10 w-10 text-muted-foreground/50 mb-3" />
          <h3 className="text-base font-semibold text-foreground">No tags found</h3>
          <p className="text-sm text-muted-foreground max-w-sm mt-1 px-4">
            {searchQuery
              ? `No tags matching "${searchQuery}".`
              : "No tags found in your notes. Add tags to your notes to manage them here."}
          </p>
        </div>
      ) : (
        <div className="space-y-8">
          {displayedGroups.map((group) => (
            <section
              key={group.letter}
              id={`tag-group-${encodeURIComponent(group.letter)}`}
              className="space-y-3 scroll-mt-6"
            >
              <div className="flex items-center gap-2">
                <span className="flex items-center justify-center w-7 h-7 rounded-lg bg-primary/10 text-primary font-bold text-xs sm:text-sm">
                  {group.letter}
                </span>
                <div className="h-[1px] flex-1 bg-border/60" />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-3">
                {group.tags.map((tag) => (
                  <TagCard
                    key={tag.name}
                    tag={tag}
                    isHighlighted={highlightedTag === tag.name}
                    onSelectTag={onSelectTag}
                    onRequestRename={(t) => setRenameTarget(t)}
                    onRequestDelete={(t) => setDeleteTarget(t)}
                  />
                ))}
              </div>
            </section>
          ))}
        </div>
      )}

      {/* Rename Dialog */}
      <RenameTagDialog
        open={Boolean(renameTarget)}
        tagName={renameTarget?.name || null}
        existingTagNames={allTags.map((tag) => tag.name)}
        onOpenChange={(open) => !open && setRenameTarget(null)}
        onConfirmRename={handleConfirmRename}
      />

      {/* Delete Dialog */}
      <DeleteTagDialog
        open={Boolean(deleteTarget)}
        tagName={deleteTarget?.name || null}
        noteCount={deleteTarget?.count || 0}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        onConfirmDelete={onDeleteTag}
      />
    </div>
  )
}
