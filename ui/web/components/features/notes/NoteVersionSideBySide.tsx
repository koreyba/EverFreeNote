"use client"

import { Fragment, useMemo, type ReactNode } from "react"
import { RenderedNoteContent } from "@/components/RenderedNoteContent"
import { Badge } from "@/components/ui/badge"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { SanitizationService } from "@core/services/sanitizer"
import { compareNoteVersions, type NoteTextDiff } from "@core/utils/compareNoteVersions"

type Snapshot = Parameters<typeof compareNoteVersions>[0]
type Comparison = ReturnType<typeof compareNoteVersions>
type ChangeKind = "removed" | "added"

const changeStyle = {
  removed: "rounded bg-red-500/15 px-0.5 text-red-800 line-through decoration-red-600 dark:text-red-300",
  added: "rounded bg-emerald-500/15 px-0.5 text-emerald-800 underline decoration-emerald-600 dark:text-emerald-300",
}

function Highlight({ kind, block, children }: { kind: ChangeKind; block?: true; children: ReactNode }) {
  const Mark = kind === "removed" ? "del" : "ins"
  return <Mark className={block ? `${changeStyle[kind]} block` : changeStyle[kind]}>{children}</Mark>
}

function ColumnText({ diff, kind }: { diff: NoteTextDiff; kind: ChangeKind }) {
  return diff.parts.map((part, index) => {
    if (part.kind === kind) {
      return <Highlight key={index} kind={kind} block={part.block}>{part.text}</Highlight>
    }
    if (part.kind !== "unchanged") return null
    if (part.block) return <span key={index} className="block">{part.text}</span>
    return <Fragment key={index}>{part.text}</Fragment>
  })
}

function VersionColumn({
  snapshot,
  version,
  side,
  comparison,
}: {
  snapshot: Snapshot
  version: number
  side: "From" | "To"
  comparison: Comparison
}) {
  const label = `Version ${version}`
  const kind = side === "From" ? "removed" : "added"
  const { title, body } = comparison
  const highlightedTags = new Set(kind === "removed" ? comparison.removedTags : comparison.addedTags)

  return (
    <article aria-label={label} className="min-w-0 space-y-3 px-2.5 py-3 [overflow-wrap:anywhere] sm:px-4">
      <header className="border-b pb-2">
        <span className="block text-xs text-muted-foreground">{side}</span>
        <h3 className="text-sm font-semibold">{label}</h3>
      </header>
      <h4 className="whitespace-pre-wrap font-semibold">
        {snapshot.title && title && !title.limited
          ? <ColumnText diff={title} kind={kind} />
          : snapshot.title || "Untitled"}
      </h4>
      {!!snapshot.tags?.length && (
        <div className="flex flex-wrap gap-1">
          {snapshot.tags.map((tag, index) => (
            <Badge key={index} variant="outline" className="max-w-full">
              {highlightedTags.has(tag) ? <Highlight kind={kind}>{tag}</Highlight> : tag}
            </Badge>
          ))}
        </div>
      )}
      {body && !body.limited ? (
        <div className="whitespace-pre-wrap text-sm leading-relaxed">
          <ColumnText diff={body} kind={kind} />
        </div>
      ) : (
        <RenderedNoteContent
          html={SanitizationService.sanitizeForReading(snapshot.description ?? "")}
          className={NOTE_CONTENT_CLASS}
        />
      )}
    </article>
  )
}

export function NoteVersionSideBySide({
  from,
  to,
  fromVersion,
  toVersion,
}: {
  from: Snapshot
  to: Snapshot
  fromVersion: number
  toVersion: number
}) {
  const comparison = useMemo(() => compareNoteVersions(from, to), [from, to])

  return (
    <section aria-label="Side-by-side comparison" className="space-y-3" data-cy="note-history-side-by-side">
      <div className="flex flex-wrap gap-2 text-xs">
        <span className={changeStyle.removed}>Removed</span>
        <span className={changeStyle.added}>Added</span>
      </div>
      {comparison.bodyMarkupChanged && (
        <p className="text-sm text-muted-foreground">Formatting, links, or embedded content changed.</p>
      )}
      {(comparison.title?.limited || comparison.body?.limited) && (
        <p className="text-sm text-muted-foreground">Detailed highlights are unavailable for this comparison.</p>
      )}
      <div className="grid grid-cols-2 divide-x rounded-lg border">
        <VersionColumn snapshot={from} version={fromVersion} side="From" comparison={comparison} />
        <VersionColumn snapshot={to} version={toVersion} side="To" comparison={comparison} />
      </div>
    </section>
  )
}
