"use client"

import { useId, useState } from "react"
import { queryOptions, useInfiniteQuery, useMutation, useQuery, useQueryClient } from "@tanstack/react-query"
import { ArrowCounterClockwise, ArrowLeft, GitDiff } from "@phosphor-icons/react"
import { RenderedNoteContent } from "@/components/RenderedNoteContent"
import { NoteVersionComparison } from "@/components/features/notes/NoteVersionComparison"
import { NoteVersionSideBySide } from "@/components/features/notes/NoteVersionSideBySide"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { NOTE_CONTENT_CLASS } from "@core/constants/typography"
import { SanitizationService } from "@core/services/sanitizer"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"
import type { Tables } from "@/supabase/types"

const PAGE_SIZE = 30
const COMPARISON_SLOTS = [
  { key: "fromVersion", label: "From version" },
  { key: "toVersion", label: "To version" },
] as const
const VIEW_BUTTON_CLASS = "text-muted-foreground aria-pressed:bg-background aria-pressed:text-foreground aria-pressed:shadow-sm"
type VersionRow = Tables<"note_versions">
type VersionSummary = Pick<VersionRow, "version" | "created_at">
type VersionContent = Pick<VersionRow, "title" | "description" | "tags">
type ComparisonView = "inline" | "side-by-side"
type ComparisonPair = { fromVersion: number; toVersion: number }

export type NoteVersionHistoryOptions = {
  onRestore: (version: number, expectedVersion: number) => Promise<void>
  restoreBlockedReason?: string | null
}

export function NoteVersionHistoryDialog({
  noteId,
  onClose,
  onCloseAutoFocus,
  onRestore,
  restoreBlockedReason,
}: NoteVersionHistoryOptions & { noteId: string; onClose: () => void; onCloseAutoFocus: (event: Event) => void }) {
  const { supabase, user } = useSupabase()
  const queryClient = useQueryClient()
  const comparisonId = useId()
  const [selectedVersion, setSelectedVersion] = useState<number>()
  const [comparison, setComparison] = useState<ComparisonPair | null>(null)
  const [comparisonView, setComparisonView] = useState<ComparisonView>("inline")
  const versionsKey = ["note-versions", user?.id, noteId]
  const history = useInfiniteQuery({
    queryKey: versionsKey,
    enabled: Boolean(user),
    initialPageParam: null as number | null,
    queryFn: async ({ pageParam, signal }) => {
      let query = supabase.from("note_versions")
        .select("version, created_at")
        .eq("note_id", noteId)
        .order("version", { ascending: false })
        .range(0, PAGE_SIZE - 1)
      if (pageParam !== null) query = query.lt("version", pageParam)
      const { data, error } = await query.abortSignal(signal)
      if (error) throw error
      return (data ?? []) as VersionSummary[]
    },
    getNextPageParam: (page) => page.length === PAGE_SIZE ? page.at(-1)?.version : undefined,
  })
  const versions = history.data?.pages.flat() ?? []
  const latest = versions[0]
  const selected = versions.find(entry => entry.version === selectedVersion) ?? latest
  const latestVersion = latest?.version
  const version = selected?.version
  const initialFrom = version === latestVersion ? versions[1] : selected
  const from = comparison ? versions.find(entry => entry.version === comparison.fromVersion) : selected
  const to = comparison ? versions.find(entry => entry.version === comparison.toVersion) : undefined
  const sideBySide = comparison !== null && comparisonView === "side-by-side"
  const snapshotOptions = (snapshot: VersionSummary | undefined) => queryOptions({
    queryKey: [...versionsKey, snapshot?.version, snapshot?.created_at],
    // Include the timestamp because a recreated note can reuse version numbers.
    staleTime: Infinity,
    queryFn: async ({ signal }) => {
      if (!snapshot) throw new Error("Select a saved version.")
      const { data, error } = await supabase.from("note_versions")
        .select("title, description, tags")
        .eq("note_id", noteId)
        .eq("version", snapshot.version)
        .eq("created_at", snapshot.created_at)
        .abortSignal(signal)
        .single()
      if (error) throw error
      return data as VersionContent
    },
  })
  const fromSnapshot = useQuery({
    ...snapshotOptions(from),
    enabled: Boolean(user && from),
  })
  const toSnapshot = useQuery({
    ...snapshotOptions(to),
    enabled: Boolean(user && to),
  })
  const Comparison = sideBySide ? NoteVersionSideBySide : NoteVersionComparison

  const chooseComparisonVersion = (slot: keyof ComparisonPair, nextVersion: number) => {
    setComparison(current => {
      if (!current || current[slot] === nextVersion) return current
      if (nextVersion === current.fromVersion || nextVersion === current.toVersion) {
        return { fromVersion: current.toVersion, toVersion: current.fromVersion }
      }
      return { ...current, [slot]: nextVersion }
    })
  }

  const restore = useMutation({
    mutationFn: ({ version, latest }: { version: number; latest: number }) => onRestore(version, latest),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: versionsKey, exact: true, refetchType: "none" })
      onClose()
    },
    onError: () => { void history.refetch() },
  })

  const loadEarlier = (className?: string) => history.hasNextPage && (
    <Button variant="ghost" size="sm" className={className} disabled={history.isFetching || restore.isPending} onClick={() => void history.fetchNextPage()}>
      {history.isFetchingNextPage ? "Loading…" : "Load earlier versions"}
    </Button>
  )

  return (
    <Dialog open onOpenChange={(open) => { if (!open && !restore.isPending) onClose() }}>
      <DialogContent
        className={`max-h-[90dvh] w-[calc(100%-1.5rem)] gap-4 overflow-hidden rounded-2xl p-4 sm:p-6 ${comparison ? "grid-rows-[auto_minmax(0,1fr)]" : "grid-rows-[auto_minmax(0,1fr)_auto]"} ${sideBySide ? "max-w-6xl" : "max-w-4xl"}`}
        data-cy="note-history-dialog"
        onCloseAutoFocus={onCloseAutoFocus}
      >
        <DialogHeader className="pr-6">
          {comparison ? (
            <>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <DialogTitle>Compare versions</DialogTitle>
                <Button type="button" variant="outline" size="sm" onClick={() => setComparison(null)}>
                  <ArrowLeft />
                  Back to history
                </Button>
              </div>
              <DialogDescription>Choose two saved versions to compare.</DialogDescription>
            </>
          ) : (
            <>
              <DialogTitle>Version history</DialogTitle>
              <DialogDescription>Restoring a saved version creates a new version of this note.</DialogDescription>
            </>
          )}
        </DialogHeader>

        {versions.length === 0 ? (
          <p role="status" className="rounded-xl border bg-muted/30 p-4 text-sm text-muted-foreground">
            {history.isPaused ? "Connect to the internet to load version history."
              : history.isError ? "Could not load version history."
              : history.isPending ? "Loading versions…"
              : "No saved versions yet."}
          </p>
        ) : comparison ? (
          <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
            <div className="flex shrink-0 flex-wrap items-end gap-3 border-b bg-muted/25 p-3 sm:px-4">
              <div className="grid w-full min-w-0 grid-cols-2 gap-3 sm:w-auto">
                {COMPARISON_SLOTS.map(({ key, label }) => {
                  const triggerId = `${comparisonId}-${key}`
                  return (
                    <div key={key} className="grid min-w-0 gap-1.5 sm:w-40">
                      <Label htmlFor={triggerId} className="text-xs text-muted-foreground">{label}</Label>
                      <Select value={String(comparison[key])} onValueChange={(value) => chooseComparisonVersion(key, Number(value))}>
                        <SelectTrigger id={triggerId} className="min-w-0 gap-2 bg-background [&>svg]:shrink-0">
                          <SelectValue placeholder="Choose a version" />
                        </SelectTrigger>
                        <SelectContent align="start" className="max-h-[var(--radix-select-content-available-height)]">
                          {versions.map(entry => (
                            <SelectItem key={entry.version} value={String(entry.version)}>
                              Version {entry.version}{entry.version === latestVersion ? " (current)" : ""}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )
                })}
              </div>
              <div className="ml-auto flex flex-wrap items-center justify-end gap-2">
                {loadEarlier()}
                <div role="group" aria-label="Comparison view" className="flex shrink-0 items-center rounded-full bg-muted/70 p-0.5">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={VIEW_BUTTON_CLASS}
                    aria-pressed={!sideBySide}
                    onClick={() => setComparisonView("inline")}
                  >
                    Inline
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    className={VIEW_BUTTON_CLASS}
                    aria-pressed={sideBySide}
                    onClick={() => setComparisonView("side-by-side")}
                    data-cy="note-history-side-by-side-toggle"
                  >
                    Side by side
                  </Button>
                </div>
              </div>
            </div>
            <article key={`${comparison.fromVersion}-${comparison.toVersion}-${comparisonView}`} aria-label="Version comparison" className="min-h-0 overflow-y-auto p-4 sm:p-6">
              {fromSnapshot.data && toSnapshot.data ? (
                <Comparison
                  from={fromSnapshot.data}
                  to={toSnapshot.data}
                  fromVersion={comparison.fromVersion}
                  toVersion={comparison.toVersion}
                />
              ) : (
                <p role="status" className="text-sm text-muted-foreground">
                  {fromSnapshot.isPaused || toSnapshot.isPaused
                    ? "Connect to the internet to compare versions."
                    : !from || !to || fromSnapshot.isError || toSnapshot.isError
                      ? "Could not compare these versions."
                      : "Loading comparison…"}
                </p>
              )}
            </article>
          </div>
        ) : (
          <div className="grid min-h-0 grid-rows-[auto_minmax(0,1fr)] gap-3 sm:grid-cols-[minmax(0,13rem)_minmax(0,1fr)] sm:grid-rows-1">
            <div className="max-h-[26dvh] space-y-1 overflow-y-auto rounded-xl border bg-muted/25 p-2 sm:max-h-none" aria-label="Saved versions">
              {versions.map((entry) => (
                <button
                  key={entry.version}
                  type="button"
                  aria-pressed={entry.version === version}
                  disabled={restore.isPending}
                  onClick={() => {
                    setSelectedVersion(entry.version)
                    restore.reset()
                  }}
                  className="flex w-full flex-col gap-1 rounded-lg border border-transparent px-3 py-2 text-left hover:bg-accent aria-pressed:border-primary/25 aria-pressed:bg-background aria-pressed:shadow-sm"
                  data-cy={`note-history-version-${entry.version}`}
                >
                  <span className="flex flex-wrap items-center gap-2 text-sm font-semibold">
                    Version {entry.version}
                    {entry.version === latestVersion && <Badge variant="secondary">Current</Badge>}
                  </span>
                  <time dateTime={entry.created_at} className="text-xs text-muted-foreground">
                    {new Date(entry.created_at).toLocaleString()}
                  </time>
                </button>
              ))}
              {loadEarlier("w-full")}
            </div>
            <div className="flex min-h-0 min-w-0 flex-col overflow-hidden rounded-xl border bg-card">
              {initialFrom && latest && (
                <div className="flex shrink-0 justify-end border-b px-3 py-2">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={restore.isPending}
                    onClick={() => {
                      setSelectedVersion(version)
                      setComparison({ fromVersion: initialFrom.version, toVersion: latest.version })
                    }}
                    data-cy="note-history-compare"
                  >
                    <GitDiff />
                    Compare versions
                  </Button>
                </div>
              )}
              <article key={version} aria-label="Version preview" className="min-h-0 overflow-y-auto p-4 sm:p-6">
                {fromSnapshot.data ? (
                  <>
                    <h3 className="break-words text-xl font-bold">{fromSnapshot.data.title || "Untitled"}</h3>
                    {!!fromSnapshot.data.tags?.length && (
                      <div className="mt-2 flex flex-wrap gap-1">
                        {fromSnapshot.data.tags.map((tag, index) => <Badge key={index} variant="outline">{tag}</Badge>)}
                      </div>
                    )}
                    <RenderedNoteContent
                      html={SanitizationService.sanitizeForReading(fromSnapshot.data.description ?? "")}
                      className={`mt-4 ${NOTE_CONTENT_CLASS}`}
                    />
                  </>
                ) : (
                  <p role="status" className="text-sm text-muted-foreground">
                    {fromSnapshot.isPaused ? "Connect to the internet to load this version."
                      : fromSnapshot.isError ? "Could not load this version." : "Loading preview…"}
                  </p>
                )}
              </article>
            </div>
          </div>
        )}

        {!comparison && (
          <DialogFooter className="items-stretch gap-2 sm:items-center sm:space-x-0">
            {restore.error && <p role="alert" className="mr-auto text-sm text-destructive">{restore.error instanceof Error ? restore.error.message : "Could not restore this version."}</p>}
            {!restore.error && restoreBlockedReason && <p className="mr-auto text-sm text-muted-foreground">{restoreBlockedReason}</p>}
            <Button
              disabled={version === undefined || version === latestVersion || !fromSnapshot.data || !!restoreBlockedReason || history.isFetching || restore.isPending}
              onClick={() => {
                if (version !== undefined && latestVersion !== undefined) restore.mutate({ version, latest: latestVersion })
              }}
              data-cy="note-history-restore"
            >
              <ArrowCounterClockwise />
              {restore.isPending ? "Restoring…" : "Restore version"}
            </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
