"use client"

import * as React from "react"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { SanitizationService } from "@core/services/sanitizer"
import type { NoteViewSession, NoteWorkspaceTab } from "@core/services/noteWorkspaceTabs"
import { useDebouncedSessionCallback } from "@ui/web/hooks/useDebouncedSessionCallback"
import { parseTagString } from "@ui/web/lib/tags"
import { RenderedNoteContent } from "@/components/RenderedNoteContent"
import { restoreViewScroll, type RegisterViewScrollSurface } from "./viewScrollSurface"

/** The inactive pane is read-only; only the active tab owns an editor. */
export function SplitNotePreview({
  tab,
  onViewSessionChange,
  onViewScrollCapture,
  registerViewScrollSurface,
  visible = true,
}: {
  tab: NoteWorkspaceTab
  onViewSessionChange: (view: Partial<NoteViewSession>) => void
  onViewScrollCapture: (scrollTop: number, node: HTMLElement) => boolean | void
  registerViewScrollSurface?: RegisterViewScrollSurface
  visible?: boolean
}) {
  const useDraft = tab.mode === "editing" || tab.saveState !== "saved"
  const title = useDraft ? tab.draft.title : tab.note?.title ?? ""
  const body = useDraft ? tab.draft.description : tab.note?.description ?? tab.note?.content ?? ""
  const tags = useDraft ? parseTagString(tab.draft.tags) : tab.note?.tags ?? []
  const content = React.useMemo(() => SanitizationService.sanitizeForReading(body), [body])
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const initialScrollTop = React.useRef(tab.view.scrollTop)
  const restored = React.useRef(false)
  const pendingRestore = React.useRef<{ applied: number; changed: boolean; requested: number; tabId: string } | null>(null)
  const hasContent = Boolean(tab.note || tab.mode === "editing")
  const scrollNotify = useDebouncedSessionCallback(onViewSessionChange, 250, registerViewScrollSurface ? "cancel" : "flush")

  React.useLayoutEffect(() => { initialScrollTop.current = tab.view.scrollTop }, [tab.view.scrollTop])

  // Restore before the workspace can capture the new surface. A pane mounted
  // while hidden has no scrollable layout, so wait until it becomes visible.
  React.useLayoutEffect(() => {
    if (!hasContent) {
      restored.current = false
      pendingRestore.current = null
      return
    }
    if (!visible || restored.current || !contentRef.current) return
    const node = contentRef.current
    restored.current = true
    const previous = pendingRestore.current
    if (previous && previous.tabId === tab.id && previous.requested === initialScrollTop.current && node.scrollTop !== previous.applied) {
      // The browser can deliver a scroll event after the pane is hidden. On
      // showing it again, its live offset is newer than the cancelled retry.
      pendingRestore.current = null
      return
    }
    const state = { applied: 0, changed: false, requested: initialScrollTop.current, tabId: tab.id }
    const cancel = restoreViewScroll(node, initialScrollTop.current, () => { state.changed = true })
    state.applied = node.scrollTop
    const pending = cancel ? state : null
    pendingRestore.current = pending
    return () => {
      cancel?.()
      // If a clamped restoration was cancelled before a newer scroll arrived,
      // allow the next visible layout (or StrictMode effect replay) to retry.
      if (pending && !pending.changed) restored.current = false
      else if (pendingRestore.current === pending) pendingRestore.current = null
    }
  }, [hasContent, tab.id, visible])

  React.useLayoutEffect(() => {
    const node = contentRef.current
    if (!hasContent || !node || !registerViewScrollSurface) return
    return registerViewScrollSurface(tab.id, tab.noteId, node, scrollNotify.cancel)
  }, [hasContent, registerViewScrollSurface, scrollNotify.cancel, tab.id, tab.noteId])

  if (!tab.note && tab.mode !== "editing") {
    return <SplitEmptyPane />
  }

  return (
    <div className="relative flex min-h-0 min-w-0 flex-1 flex-col bg-card">
      <div className="absolute inset-x-0 top-0 z-10 flex min-h-16 items-center border-b border-border/40 bg-card/95 px-5">
        <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">Reading</span>
      </div>
      <div
        ref={contentRef}
        className="scrollbar-none min-h-0 flex-1 overflow-y-auto pb-10 pt-24"
        onScroll={(event) => {
          const scrollTop = event.currentTarget.scrollTop
          const pending = pendingRestore.current
          if (pending && scrollTop !== pending.applied) pending.changed = true
          if (onViewScrollCapture(scrollTop, event.currentTarget) !== false) scrollNotify.schedule({ scrollTop })
        }}
        data-cy="split-note-preview"
      >
        <div className="note-document-width mx-auto w-full max-w-4xl px-6">
          <h2 className="note-document-title mb-3 break-words text-4xl font-extrabold tracking-tight text-foreground">
            {title.trim() || "Untitled"}
          </h2>
          {tags.length > 0 && (
            <div className="mb-8 flex flex-wrap gap-1.5">
              {tags.map((tag) => (
                <span key={tag} className="rounded-full bg-muted px-2 py-1 text-xs text-muted-foreground">{tag}</span>
              ))}
            </div>
          )}
          <RenderedNoteContent className={NOTE_CONTENT_CLASS} html={content} />
        </div>
      </div>
    </div>
  )
}

export function SplitEmptyPane() {
  return (
    <div className="flex min-h-0 flex-1 items-center justify-center bg-card px-8 text-center text-sm text-muted-foreground">
      Choose a note from the list to show it here.
    </div>
  )
}
