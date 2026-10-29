"use client"

import * as React from "react"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { SanitizationService } from "@core/services/sanitizer"
import type { NoteViewSession, NoteWorkspaceTab } from "@core/services/noteWorkspaceTabs"
import { useDebouncedSessionCallback } from "@ui/web/hooks/useDebouncedSessionCallback"
import { parseTagString } from "@ui/web/lib/tags"
import { RenderedNoteContent } from "@/components/RenderedNoteContent"

/** The inactive pane is read-only; only the active tab owns an editor. */
export function SplitNotePreview({
  tab,
  onViewSessionChange,
  onViewScrollCapture,
}: {
  tab: NoteWorkspaceTab
  onViewSessionChange: (view: Partial<NoteViewSession>) => void
  onViewScrollCapture: (scrollTop: number) => void
}) {
  const useDraft = tab.mode === "editing" || tab.saveState !== "saved"
  const title = useDraft ? tab.draft.title : tab.note?.title ?? ""
  const body = useDraft ? tab.draft.description : tab.note?.description ?? tab.note?.content ?? ""
  const tags = useDraft ? parseTagString(tab.draft.tags) : tab.note?.tags ?? []
  const content = React.useMemo(() => SanitizationService.sanitizeForReading(body), [body])
  const contentRef = React.useRef<HTMLDivElement | null>(null)
  const initialScrollTop = React.useRef(tab.view.scrollTop)
  const scrollNotify = useDebouncedSessionCallback(onViewSessionChange, 250, "flush")

  React.useEffect(() => {
    const frame = window.requestAnimationFrame(() => {
      if (contentRef.current) contentRef.current.scrollTop = initialScrollTop.current
    })
    return () => window.cancelAnimationFrame(frame)
  }, [tab.id])

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
          onViewScrollCapture(scrollTop)
          scrollNotify.schedule({ scrollTop })
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
