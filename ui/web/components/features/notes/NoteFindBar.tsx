"use client"

import * as React from "react"
import { createPortal } from "react-dom"
import { CaretDown, CaretUp, X } from "@phosphor-icons/react"
import { Button } from "@/components/ui/button"
import { useAppBackHandler, APP_BACK_PRIORITY } from "@ui/web/lib/appBack"
import { findInNote, type NoteFindMatch } from "@ui/web/lib/noteFind"

type OverlayRect = { left: number; top: number; width: number; height: number; active: boolean }

interface NoteFindBarProps {
  scrollRef: React.RefObject<HTMLElement | null>
  titleRef: React.RefObject<HTMLElement | null>
  bodyRef: React.RefObject<HTMLElement | null>
  bodySelector?: string
  includeTitle?: boolean
  onClose: () => void
}

export function NoteFindBar({ scrollRef, titleRef, bodyRef, bodySelector, includeTitle = true, onClose }: NoteFindBarProps) {
  const [query, setQuery] = React.useState("")
  const [matches, setMatches] = React.useState<NoteFindMatch[]>([])
  const [index, setIndex] = React.useState(0)
  const [scrollRevision, setScrollRevision] = React.useState(0)
  const [fallbackOverlay, setFallbackOverlay] = React.useState<{ container: HTMLElement; rects: OverlayRect[] } | null>(null)
  const scrollRequested = React.useRef(false)
  const activeIndex = matches.length ? Math.min(index, matches.length - 1) : 0

  useAppBackHandler(APP_BACK_PRIORITY.menu, () => { onClose(); return true })

  const scan = React.useCallback((value: string) => {
    const root = bodyRef.current
    const body = bodySelector ? root?.querySelector<HTMLElement>(bodySelector) ?? null : root
    return findInNote(includeTitle ? titleRef.current : null, body, value)
  }, [bodyRef, bodySelector, includeTitle, titleRef])

  React.useEffect(() => {
    if (!query) return
    const refresh = () => setMatches(scan(query))
    const observer = new MutationObserver(refresh)
    if (bodyRef.current) observer.observe(bodyRef.current, { childList: true, characterData: true, subtree: true })
    const title = titleRef.current
    if (title instanceof HTMLInputElement) title.addEventListener("input", refresh)
    else if (title) observer.observe(title, { childList: true, characterData: true, subtree: true })
    return () => {
      observer.disconnect()
      if (title instanceof HTMLInputElement) title.removeEventListener("input", refresh)
    }
  }, [bodyRef, query, scan, titleRef])

  React.useLayoutEffect(() => {
    const active = matches[activeIndex]
    const title = titleRef.current
    if (title instanceof HTMLInputElement) title.toggleAttribute("data-note-find-current", active?.kind === "title")
    const textRanges = matches.flatMap((match) => match.kind === "text" ? [match.range] : [])
    const hasHighlights = typeof CSS !== "undefined" && Boolean(CSS.highlights) && typeof Highlight !== "undefined"
    let allHighlight: Highlight | undefined
    let currentHighlight: Highlight | undefined
    if (hasHighlights) {
      allHighlight = new Highlight()
      textRanges.forEach((range) => allHighlight?.add(range))
      currentHighlight = new Highlight()
      currentHighlight.priority = 1
      if (active?.kind === "text") currentHighlight.add(active.range)
      CSS.highlights.set("note-find-matches", allHighlight)
      CSS.highlights.set("note-find-current", currentHighlight)
    }

    const updateFallback = () => {
      const scroll = scrollRef.current
      if (!scroll || hasHighlights) {
        setFallbackOverlay(null)
        return
      }
      const container = scroll.getBoundingClientRect()
      const rects: OverlayRect[] = []
      matches.forEach((match, matchIndex) => {
        if (match.kind === "title") return
        for (const rect of Array.from(match.range.getClientRects())) {
          if (rects.length >= 500 && matchIndex !== activeIndex) break
          rects.push({ left: rect.left - container.left + scroll.scrollLeft, top: rect.top - container.top + scroll.scrollTop,
            width: rect.width, height: rect.height, active: matchIndex === activeIndex })
        }
      })
      setFallbackOverlay({ container: scroll, rects })
    }
    updateFallback()

    if (scrollRequested.current && active && scrollRef.current) {
      const scroll = scrollRef.current
      const bounds = active.kind === "title" ? active.input.getBoundingClientRect() : active.range.getBoundingClientRect()
      const viewport = scroll.getBoundingClientRect()
      scroll.scrollTop = Math.max(0, scroll.scrollTop + bounds.top - viewport.top - scroll.clientHeight / 2 + bounds.height / 2)
    }
    scrollRequested.current = false

    window.addEventListener("resize", updateFallback)
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(updateFallback)
    if (observer && scrollRef.current) observer.observe(scrollRef.current)
    if (observer && bodyRef.current) observer.observe(bodyRef.current)
    return () => {
      window.removeEventListener("resize", updateFallback)
      observer?.disconnect()
      if (hasHighlights && CSS.highlights.get("note-find-matches") === allHighlight) CSS.highlights.delete("note-find-matches")
      if (hasHighlights && CSS.highlights.get("note-find-current") === currentHighlight) CSS.highlights.delete("note-find-current")
      if (title instanceof HTMLInputElement) title.removeAttribute("data-note-find-current")
    }
  }, [activeIndex, bodyRef, matches, scrollRef, scrollRevision, titleRef])

  const move = (direction: -1 | 1) => {
    if (!matches.length) return
    scrollRequested.current = true
    setIndex((activeIndex + direction + matches.length) % matches.length)
    setScrollRevision((value) => value + 1)
  }

  return (
    <>
      {/* Turbopack's CSS parser does not yet recognize ::highlight(); the
          browser can parse it directly without touching the editable DOM. */}
      <style>{`::highlight(note-find-matches) { background-color: #fde68a; color: #1f2937; }
        ::highlight(note-find-current) { background-color: #fb923c; color: #111827; }`}</style>
      <div className="flex min-w-0 items-center gap-1 border-t border-border/40 bg-card px-3 py-1" onKeyDown={(event) => {
        if (event.key === "Escape") { event.preventDefault(); event.stopPropagation(); onClose() }
        if (event.key === "Enter" && event.target instanceof HTMLInputElement) {
          event.preventDefault()
          move(event.shiftKey ? -1 : 1)
        }
      }}>
        <input
          autoFocus
          type="search"
          aria-label="Find in note"
          data-cy="note-find-input"
          placeholder="Find in note"
          value={query}
          onChange={(event) => {
            const value = event.currentTarget.value
            scrollRequested.current = true
            setQuery(value)
            setMatches(scan(value))
            setIndex(0)
            setScrollRevision((current) => current + 1)
          }}
          className="h-11 min-w-0 flex-1 rounded-lg border border-border bg-background px-3 text-base outline-none focus-visible:ring-2 focus-visible:ring-primary/50"
        />
        <output data-cy="note-find-count" aria-live="polite" className="shrink-0 px-1 text-xs tabular-nums text-muted-foreground">
          {query ? `${matches.length ? activeIndex + 1 : 0} / ${matches.length}` : "0 / 0"}
        </output>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Previous match" disabled={!matches.length} onClick={() => move(-1)}><CaretUp className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Next match" disabled={!matches.length} onClick={() => move(1)}><CaretDown className="h-4 w-4" /></Button>
        <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0" aria-label="Close find" data-cy="note-find-close" onClick={onClose}><X className="h-4 w-4" /></Button>
      </div>
      {fallbackOverlay && fallbackOverlay.rects.length > 0 && createPortal(
        <div aria-hidden="true" data-testid="note-find-fallback" className="pointer-events-none absolute left-0 top-0 z-10">
          {fallbackOverlay.rects.map((rect, itemIndex) => <span key={itemIndex} className={rect.active ? "absolute bg-orange-400/50" : "absolute bg-yellow-300/40"} style={{ left: rect.left, top: rect.top, width: rect.width, height: rect.height }} />)}
        </div>, fallbackOverlay.container,
      )}
    </>
  )
}
