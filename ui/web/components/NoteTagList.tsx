"use client"

import * as React from "react"
import { NoteTag } from "@/components/NoteTag"

const disclosureClass = "min-h-11 min-w-11 shrink-0 rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary"

type NoteTagListProps = {
  tags: string[]
  expanded: boolean
  onExpandedChange: (expanded: boolean) => void
  onTagClick?: (tag: string) => void
  onRemoveTag?: (tag: string) => void
  armedTag?: string
  variant?: "editor" | "reader"
}

export function NoteTagList({ tags, expanded, onExpandedChange, onTagClick, onRemoveTag, armedTag, variant }: NoteTagListProps) {
  const collectionId = React.useId()
  const rowRef = React.useRef<HTMLDivElement>(null)
  const measureRef = React.useRef<HTMLSpanElement>(null)
  const [visibleCount, setVisibleCount] = React.useState(tags.length)

  React.useLayoutEffect(() => {
    const row = rowRef.current
    const measure = measureRef.current
    if (!row || !measure) return
    let active = true
    const update = () => {
      if (!active) return
      const width = row.getBoundingClientRect().width
      if (!width) return
      const gap = Number.parseFloat(getComputedStyle(row).columnGap) || 0
      const widths = Array.from(row.querySelectorAll<HTMLElement>(":scope > [data-note-tag-item]"), item => item.getBoundingClientRect().width)
      const total = widths.reduce((sum, itemWidth) => sum + itemWidth, 0) + Math.max(0, widths.length - 1) * gap
      let count = widths.length
      if (total > width) {
        count = 0
        let used = 0
        for (let index = 0; index < widths.length; index++) {
          measure.textContent = `+${widths.length - index - 1} more`
          const next = used + widths[index] + (index ? gap : 0)
          if (next + gap + measure.getBoundingClientRect().width > width) break
          used = next
          count++
        }
      }
      setVisibleCount(count)
    }
    update()
    const observer = typeof ResizeObserver === "undefined" ? undefined : new ResizeObserver(update)
    observer?.observe(row)
    row.querySelectorAll<HTMLElement>(":scope > [data-note-tag-item]").forEach(item => observer?.observe(item))
    document.fonts?.addEventListener("loadingdone", update)
    void document.fonts?.ready.then(update)
    return () => { active = false; observer?.disconnect(); document.fonts?.removeEventListener("loadingdone", update) }
  }, [tags, onRemoveTag, variant])

  const overflow = visibleCount < tags.length
  return <div ref={rowRef} id={collectionId} className="relative flex min-w-0 flex-1 flex-wrap items-center gap-1.5" data-cy="note-tag-list">
    {tags.map((tag, index) => {
      const hidden = !expanded && index >= visibleCount
      return <span key={tag} data-note-tag-item inert={hidden} aria-hidden={hidden || undefined}
        className={`inline-flex w-max max-w-full shrink-0 ${hidden ? "invisible absolute left-0 top-0" : ""}`}>
        <NoteTag tag={tag} onClick={onTagClick} onRemove={onRemoveTag} armed={tag === armedTag} variant={variant} />
      </span>
    })}
    <span ref={measureRef} aria-hidden="true" className={`${disclosureClass} invisible absolute left-0 top-0 w-max whitespace-nowrap`}>+{tags.length} more</span>
    {overflow && <button type="button" className={disclosureClass}
      aria-label={expanded ? "Show fewer tags" : `Show all ${tags.length} tags`}
      aria-expanded={expanded} aria-controls={collectionId}
      onClick={event => { event.stopPropagation(); onExpandedChange(!expanded) }}>
      {expanded ? "Show less" : `+${tags.length - visibleCount} more`}
    </button>}
  </div>
}
