"use client"

import { Fragment, useMemo, type ReactNode } from "react"
import { compareNoteVersions, type NoteTextDiff } from "@core/utils/compareNoteVersions"

type Snapshot = Parameters<typeof compareNoteVersions>[0]
type ChangeKind = "added" | "removed"

const changeStyle = {
  added: "rounded bg-emerald-500/15 px-0.5 text-emerald-800 underline decoration-emerald-600 dark:text-emerald-300",
  removed: "rounded bg-red-500/15 px-0.5 text-red-800 line-through decoration-red-600 dark:text-red-300",
}
const blockSpacing = "my-1 block"

function ChangeHighlight({ kind, children, block }: { kind: ChangeKind; children: ReactNode; block?: true }) {
  const Mark = kind === "added" ? "ins" : "del"
  return (
    <Mark className={block ? `${changeStyle[kind]} ${blockSpacing}` : changeStyle[kind]}>
      <span className="sr-only">{kind === "added" ? "Added " : "Removed "}</span>
      {children}
    </Mark>
  )
}

function TextChanges({ label, diff }: { label: string; diff: NoteTextDiff }) {
  return (
    <div className="space-y-1.5">
      <h4 className="text-sm font-semibold">{label}</h4>
      {diff.limited ? (
        <p className="text-sm text-muted-foreground">Too much changed text to highlight. Open a version preview to read the full note.</p>
      ) : (
        <p className="whitespace-pre-wrap break-words text-sm leading-relaxed">
          {diff.parts.map((part, index) => {
            if (part.kind !== "unchanged") {
              return <ChangeHighlight key={index} kind={part.kind} block={part.block}>{part.text}</ChangeHighlight>
            }
            if (part.block) return <span key={index} className={blockSpacing}>{part.text}</span>
            return <Fragment key={index}>{part.text}</Fragment>
          })}
        </p>
      )}
    </div>
  )
}

export function NoteVersionComparison({
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
  const { title, body, addedTags, removedTags, tagOrderChanged, bodyMarkupChanged } = useMemo(
    () => compareNoteVersions(from, to),
    [from, to],
  )
  const tagsChanged = addedTags.length > 0 || removedTags.length > 0 || tagOrderChanged

  return (
    <section aria-label="Version comparison" className="space-y-4" data-cy="note-history-comparison">
      <header className="space-y-2 border-b pb-3">
        <h3 className="font-semibold">Version {fromVersion} → Version {toVersion}</h3>
        <div className="flex flex-wrap gap-3 text-xs">
          <span className={changeStyle.removed}>Removed</span>
          <span className={changeStyle.added}>Added</span>
        </div>
      </header>
      {title && <TextChanges label="Title" diff={title} />}
      {body && <TextChanges label="Text" diff={body} />}
      {bodyMarkupChanged && (
        <p className="text-sm text-muted-foreground">Formatting, links, or embedded content changed. Open a version preview to review the original formatting.</p>
      )}
      {tagsChanged && (
        <div className="space-y-1.5">
          <h4 className="text-sm font-semibold">Tags</h4>
          <div className="flex flex-wrap gap-2 text-sm">
            {removedTags.map(tag => <ChangeHighlight key={tag} kind="removed">{tag}</ChangeHighlight>)}
            {addedTags.map(tag => <ChangeHighlight key={tag} kind="added">{tag}</ChangeHighlight>)}
            {tagOrderChanged && <span className="text-muted-foreground">Tag order changed.</span>}
          </div>
        </div>
      )}
      {!title && !body && !tagsChanged && !bodyMarkupChanged && (
        <p className="text-sm text-muted-foreground">These versions have the same saved content.</p>
      )}
    </section>
  )
}
