'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowCounterClockwise, Trash } from '@phosphor-icons/react'
import { toast } from 'sonner'
import {
  NoteService,
  TRASH_CARD_PREVIEW_LENGTH,
  type TrashEntry,
  type TrashSummary,
} from '@core/services/notes'
import type { Note } from '@core/types/domain'
import type { MutationQueueItem } from '@core/types/offline'
import { compactQueue } from '@core/utils/compactQueue'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { Button } from '@/components/ui/button'
import {
  AlertDialog,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogCancel,
  AlertDialogAction,
} from '@/components/ui/alert-dialog'
import { BulkDeleteDialog } from './BulkDeleteDialog'
import { NoteList, type NoteListLayout } from './NoteList'
import { NoteView } from './NoteView'
import { NoteListSidebar } from './Sidebar'
import { SelectionModeActions } from './SelectionModeActions'
import { PullToRefresh } from '@/components/PullToRefresh'
import { APP_BACK_PRIORITY, useAppBackHandler } from '@ui/web/lib/appBack'
import { clearTrashCache, trashCacheKey } from '@ui/web/lib/trashCache'
import { cn } from '@ui/web/lib/utils'

export type TrashPageProps = {
  isOffline: boolean
  loadPending: () => Promise<MutationQueueItem[]>
  onChanged: () => void | Promise<void>
  refreshToken?: number
  noteListLayout?: NoteListLayout
  onChangeNoteListLayout?: (layout: NoteListLayout) => void
  onOpenSettings?: () => void
  onSignOut?: () => void
}
type PendingEntry = TrashSummary & { localBody: string; pending: true }
type CachedTrash = {
  notes: TrashSummary[]
  totalCount: number
  previews: Record<string, string>
}
function readCache(owner: string): CachedTrash {
  try {
    const data = JSON.parse(
      localStorage.getItem(trashCacheKey(owner)) ?? 'null',
    ) as CachedTrash | null
    if (data && Array.isArray(data.notes))
      return {
        notes: data.notes.filter((note) => note.user_id === owner),
        totalCount: data.totalCount,
        previews: data.previews ?? {},
      }
  } catch {
    /* This is only a disposable cache; pending drafts live in the durable queue. */
  }
  return { notes: [], totalCount: 0, previews: {} }
}
function saveCache(owner: string, data: CachedTrash) {
  try {
    const notes = data.notes.slice(0, 100)
    const ids = new Set(notes.map((note) => note.trash_id))
    localStorage.setItem(
      trashCacheKey(owner),
      JSON.stringify({
        ...data,
        notes,
        previews: Object.fromEntries(
          Object.entries(data.previews).filter(([id]) => ids.has(id)),
        ),
      }),
    )
  } catch {
    // A full cache must not leave removed previews behind; pending drafts are separate.
    clearTrashCache(owner)
  }
}
const message = (error: unknown) =>
  error && typeof error === 'object' && 'message' in error
    ? String(error.message)
    : 'Could not complete the Trash action. Please retry.'

// The same note can return to Trash. Selection always refers to this deletion.
function asNote(entry: Omit<TrashEntry, 'description'>, description: string): Note {
  return {
    id: entry.trash_id,
    user_id: entry.user_id,
    title: entry.title || 'Untitled',
    tags: entry.tags,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    description,
  }
}

export function TrashPage({
  isOffline,
  loadPending,
  onChanged,
  refreshToken = 0,
  noteListLayout = 'list',
  onChangeNoteListLayout,
  onOpenSettings,
  onSignOut,
}: TrashPageProps) {
  const { supabase, user, getSessionSnapshot } = useSupabase()
  const owner = user?.id ?? ''
  const service = useMemo(() => new NoteService(supabase), [supabase])
  const [initialCache] = useState(() => readCache(owner))
  const cache = useRef(initialCache)
  const refreshSequence = useRef(0)
  const refreshing = useRef(false)
  const previewSequence = useRef(0)
  const [rows, setRows] = useState<TrashSummary[]>(cache.current.notes)
  const [total, setTotal] = useState(cache.current.totalCount)
  const [pending, setPending] = useState<PendingEntry[]>([])
  const [page, setPage] = useState(0)
  const [hasMore, setHasMore] = useState(false)
  const [loading, setLoading] = useState(!isOffline)
  const [busy, setBusy] = useState(false)
  const working = useRef(false)
  const alive = useRef(true)
  const [selected, setSelected] = useState<Set<string>>(new Set())
  const [selectionMode, setSelectionMode] = useState(false)
  const [preview, setPreview] = useState<
    (TrashEntry & { pending?: boolean }) | null
  >(null)
  const [error, setError] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<{
    kind: 'single' | 'bulk'
    ids: string[]
    title?: string
  } | null>(null)
  const currentSession = useCallback(
    (
      started: ReturnType<NonNullable<typeof getSessionSnapshot>> | undefined,
    ) => {
      if (!alive.current) return false
      const current = getSessionSnapshot?.()
      return (
        !started ||
        (current?.userId === owner && current.epoch === started.epoch)
      )
    },
    [getSessionSnapshot, owner],
  )
  useEffect(() => {
    alive.current = true
    return () => {
      alive.current = false
    }
  }, [])

  const refresh = useCallback(
    async (nextPage = 0) => {
      if (!owner || (nextPage > 0 && (refreshing.current || working.current))) return
      const started = getSessionSnapshot?.()
      const sequence = ++refreshSequence.current
      const isLatest = () =>
        currentSession(started) && sequence === refreshSequence.current
      refreshing.current = true
      setLoading(true)
      setError(null)
      try {
        const queued = await loadPending()
        if (!isLatest()) return
        setPending(
          compactQueue(queued.filter((item) => item.payload.user_id === owner))
            .filter(
              (item) =>
                item.operation === 'delete' &&
                item.payload.user_id === owner &&
                typeof item.payload.title === 'string' &&
                typeof item.payload.description === 'string' &&
                Array.isArray(item.payload.tags),
            )
            .map((item) => ({
              trash_id: `local:${item.id}`,
              original_note_id: item.noteId,
              user_id: owner,
              title: item.payload.title!,
              tags: item.payload.tags!,
              created_at: item.payload.created_at ?? item.clientUpdatedAt,
              updated_at: item.clientUpdatedAt,
              deleted_at: item.clientUpdatedAt,
              body_bytes: 0,
              preview_html: item.payload.description!.slice(0, TRASH_CARD_PREVIEW_LENGTH),
              localBody: item.payload.description!,
              pending: true,
            })),
        )
        if (isOffline) return
        const result = await service.getTrash(owner, nextPage)
        if (!isLatest()) return
        const notes =
          nextPage === 0
            ? result.notes
            : [...new Map(
                [...cache.current.notes, ...result.notes].map((row) => [row.trash_id, row]),
              ).values()]
        setRows(notes)
        setTotal(result.totalCount)
        setHasMore(result.hasMore)
        setPage(nextPage)
        cache.current = {
          ...cache.current,
          notes,
          totalCount: result.totalCount,
          previews: Object.fromEntries(
            Object.entries(cache.current.previews).filter(([id]) =>
              notes.some((note) => note.trash_id === id),
            ),
          ),
        }
        setPreview((previous) =>
          previous &&
          !previous.pending &&
          !notes.some((note) => note.trash_id === previous.trash_id)
            ? null
            : previous,
        )
        saveCache(owner, cache.current)
      } catch (error) {
        if (isLatest()) {
          if (nextPage > 0) setHasMore(false)
          setError(message(error))
        }
      } finally {
        if (isLatest()) {
          refreshing.current = false
          setLoading(false)
        }
      }
    },
    [
      currentSession,
      getSessionSnapshot,
      isOffline,
      loadPending,
      owner,
      service,
    ],
  )
  useEffect(() => {
    void refresh()
  }, [refresh, refreshToken])

  const openPreview = async (row: TrashSummary | PendingEntry) => {
    const started = getSessionSnapshot?.()
    const sequence = ++previewSequence.current
    setError(null)
    try {
      const body =
        'pending' in row
          ? { ...row, description: row.localBody }
          : isOffline
            ? { ...row, description: cache.current.previews[row.trash_id] }
            : await service.getTrashedNote(row.trash_id, owner)
      if (!currentSession(started) || sequence !== previewSequence.current)
        return
      if (
        !('pending' in row) &&
        !cache.current.notes.some((note) => note.trash_id === row.trash_id)
      )
        return
      if (typeof body.description !== 'string')
        throw new Error('Connect to the internet to view this note.')
      setPreview(body)
      // Bound this optional reading cache; the server/queue remains the source of recovery.
      if (!('pending' in row) && body.description.length <= 250000) {
        cache.current.previews = {
          [row.trash_id]: body.description,
          ...Object.fromEntries(
            Object.entries(cache.current.previews)
              .filter(([id]) => id !== row.trash_id)
              .slice(0, 2),
          ),
        }
        saveCache(owner, cache.current)
      }
    } catch (error) {
      if (currentSession(started) && sequence === previewSequence.current)
        setError(message(error))
    }
  }

  const actOnEntries = async (action: 'restore' | 'purge', ids: string[]) => {
    if (isOffline || working.current || !ids.length) return
    working.current = true
    setBusy(true)
    setError(null)
    const started = getSessionSnapshot?.()
    const failed: string[] = []
    const completed = new Set<string>()
    try {
      for (let offset = 0; offset < ids.length; offset += 100) {
        if (!currentSession(started)) return
        const chunk = ids.slice(offset, offset + 100)
        try {
          const result =
            action === 'restore'
              ? await service.restoreTrashedNotes(chunk)
              : await service.purgeTrashedNotes(chunk)
          for (const item of result) {
            if (item.status === 'conflict') failed.push(item.trash_id)
            else completed.add(item.trash_id)
          }
        } catch (error) {
          failed.push(...ids.slice(offset))
          if (currentSession(started)) setError(message(error))
          break
        }
      }
      if (!currentSession(started)) return
      previewSequence.current++
      setSelected(new Set(failed))
      setConfirmation(null)
      setRows((previous) =>
        previous.filter((row) => !completed.has(row.trash_id)),
      )
      setPreview((previous) =>
        previous && completed.has(previous.trash_id) ? null : previous,
      )
      cache.current = {
        ...cache.current,
        notes: cache.current.notes.filter(
          (row) => !completed.has(row.trash_id),
        ),
        previews: Object.fromEntries(
          Object.entries(cache.current.previews).filter(
            ([id]) => !completed.has(id),
          ),
        ),
      }
      saveCache(owner, cache.current)
      if (completed.size) {
        void Promise.resolve(onChanged()).catch((error) => {
          if (currentSession(started)) setError(message(error))
        })
        if (action === 'purge' && supabase.functions?.invoke)
          void supabase.functions.invoke('trash-cleanup').catch(() => {})
      }
      await refresh()
      if (!currentSession(started)) return
      if (failed.length) {
        setSelectionMode(true)
        setError(
          `${failed.length} notes could not be ${action === 'restore' ? 'restored' : 'deleted'}. Their selection is retained; refresh and retry.`,
        )
      } else {
        setSelectionMode(false)
        toast.success(
          action === 'restore'
            ? 'Notes restored.'
            : 'Notes permanently deleted.',
        )
      }
    } finally {
      working.current = false
      if (currentSession(started)) setBusy(false)
    }
  }

  const prepareEmptyTrash = async () => {
    if (isOffline || working.current) return
    working.current = true
    setBusy(true)
    setError(null)
    const started = getSessionSnapshot?.()
    try {
      const ids = await service.getAllTrashIds(owner)
      if (currentSession(started)) {
        if (ids.length) setConfirmation({ kind: 'bulk', ids: [...ids] })
        else await refresh()
      }
    } catch (error) {
      if (currentSession(started)) setError(message(error))
    } finally {
      working.current = false
      if (currentSession(started)) setBusy(false)
    }
  }
  const closePreview = useCallback(() => {
    previewSequence.current++
    setPreview(null)
  }, [])
  const exitSelection = useCallback(() => {
    setSelectionMode(false)
    setSelected(new Set())
  }, [])
  useAppBackHandler(APP_BACK_PRIORITY.editor, () => {
    if (working.current) return true
    if (preview) closePreview()
    else if (selectionMode) exitSelection()
    else return false
    return true
  })

  const entries = useMemo(
    () => new Map([...pending, ...rows].map((entry) => [entry.trash_id, entry])),
    [pending, rows],
  )
  const notes = useMemo(
    () => Array.from(entries.values(), (entry) => asNote(entry, entry.preview_html ?? '')),
    [entries],
  )
  const canSelectNote = useCallback((note: Note) => !isOffline && !note.id.startsWith('local:'), [isOffline])
  const toggleNoteSelection = (note: Note) => {
    if (working.current) return
    setSelectionMode(true)
    setSelected((previous) => {
      const next = new Set(previous)
      if (next.has(note.id)) next.delete(note.id)
      else next.add(note.id)
      return next
    })
  }
  const loadMore = useCallback(() => {
    if (!isOffline && hasMore) void refresh(page + 1)
  }, [hasMore, isOffline, page, refresh])
  const errorMessage = error && (
    <div role="alert" className="border-b px-4 py-2 text-xs text-destructive">
      {error}
      {!isOffline && (
        <Button variant="link" size="sm" onClick={() => void refresh()} className="h-8 px-2">
          Refresh
        </Button>
      )}
    </div>
  )
  const offlineMessage = isOffline && (
    <p role="status" className="border-b px-4 py-2 text-xs text-muted-foreground">
      Offline. Connect to restore or permanently delete notes.
    </p>
  )

  return (
    <main className="flex min-h-0 min-w-0 flex-1 overflow-hidden" aria-label="Trash">
      <NoteListSidebar
        user={user}
        isOffline={isOffline}
        notesDisplayed={notes.length}
        notesTotal={total + pending.length}
        noteListLayout={noteListLayout}
        onChangeNoteListLayout={onChangeNoteListLayout}
        onOpenSettings={onOpenSettings}
        onSignOut={onSignOut}
        className={cn("min-w-0", preview ? "hidden md:flex" : "w-full")}
        aria-label="Trash notes"
        data-testid="trash-sidebar"
        primaryControls={
          <div className="flex w-full min-w-0 items-center justify-between gap-1">
            <h1 className="text-xl font-bold tracking-tight">Trash</h1>
            {!isOffline && !selectionMode && total > 0 && (
              <div className="flex shrink-0 items-center gap-0.5">
                {rows.length > 0 && (
                  <Button type="button" variant="ghost" size="sm" className="h-11 rounded-full px-2.5 md:h-8"
                    disabled={busy} onClick={() => setSelectionMode(true)}>
                    Select
                  </Button>
                )}
                <Button type="button" variant="ghost" size="sm" className="h-11 rounded-full px-2.5 text-destructive hover:text-destructive md:h-8"
                  disabled={busy || loading} onClick={() => void prepareEmptyTrash()}>
                  Empty Trash
                </Button>
              </div>
            )}
          </div>
        }
        controlsHint={<p className="text-xs text-muted-foreground">Notes are deleted after 30 days.</p>}
        selectionControls={selectionMode && (
          <SelectionModeActions
            className="notes-sidebar-selection"
            selectedCount={selected.size}
            onSelectAll={() => setSelected((previous) => new Set([...previous, ...rows.map((row) => row.trash_id)]))}
            onRestore={() => void actOnEntries('restore', [...selected])}
            onDelete={() => setConfirmation({ kind: 'bulk', ids: [...selected] })}
            onCancel={exitSelection}
            deleteLabel="Delete forever"
            selectingAllDisabled={isOffline || rows.every((row) => selected.has(row.trash_id))}
            deletingDisabled={isOffline || selected.size === 0}
            deleting={busy && confirmation?.kind === 'bulk'}
            busy={busy}
          />
        )}
      >
        <div className="flex h-full min-h-0 flex-col">
          {!preview && errorMessage}
          {!preview && offlineMessage}
          <div className="min-h-0 flex-1">
            <PullToRefresh onRefresh={() => refresh()}>
              <NoteList
                notes={notes}
                layout={noteListLayout}
                isLoading={loading}
                selectionMode={selectionMode}
                selectedIds={selected}
                selectedNoteId={preview?.trash_id}
                onToggleSelect={toggleNoteSelection}
                canSelectNote={canSelectNote}
                onSelectNote={(note) => {
                  const entry = entries.get(note.id)
                  if (entry) void openPreview(entry)
                }}
                onLoadMore={loadMore}
                hasMore={hasMore && !isOffline}
                isFetchingNextPage={loading || busy}
                emptyState={error ? <></> : <p className="text-sm">Trash is empty.</p>}
              />
            </PullToRefresh>
          </div>
        </div>
      </NoteListSidebar>

      {preview && (
        <section data-testid="trash-note-reader" aria-label="Deleted note" className="flex h-full min-h-0 min-w-0 flex-1 flex-col overflow-hidden">
          {errorMessage}
          {offlineMessage}
          {preview.pending && <p role="status" className="border-b px-4 py-2 text-xs text-muted-foreground">Pending sync. This note is still on this device.</p>}
          <NoteView
            key={preview.trash_id}
            note={asNote(preview, preview.description)}
            onBack={closePreview}
            actions={!preview.pending && (
              <>
                <Button type="button" size="sm" onClick={() => void actOnEntries('restore', [preview.trash_id])}
                  aria-label="Restore note" title="Restore note" disabled={busy || isOffline}
                  className="h-11 min-w-11 rounded-xl px-0 shadow-none md:h-9 md:min-w-9 lg:px-3">
                  <ArrowCounterClockwise className="h-4 w-4 lg:mr-1.5" aria-hidden="true" />
                  <span className="hidden lg:inline">Restore</span>
                </Button>
                <Button type="button" variant="ghost" size="sm"
                  onClick={() => setConfirmation({ kind: 'single', ids: [preview.trash_id], title: preview.title })}
                  aria-label="Delete note forever" title="Delete note forever" disabled={busy || isOffline}
                  className="h-11 min-w-11 rounded-xl px-0 text-destructive hover:bg-destructive/10 hover:text-destructive md:h-9 md:min-w-9 lg:px-3">
                  <Trash className="h-4 w-4 lg:mr-1.5" aria-hidden="true" />
                  <span className="hidden lg:inline">Delete forever</span>
                </Button>
              </>
            )}
          />
        </section>
      )}

      <BulkDeleteDialog
        action="purge"
        open={confirmation?.kind === 'bulk'}
        count={confirmation?.ids.length ?? 0}
        loading={busy}
        onOpenChange={(open) => {
          if (!open && !working.current) setConfirmation(null)
        }}
        onConfirm={() => void actOnEntries('purge', confirmation?.ids ?? [])}
      />
      <AlertDialog
        open={confirmation?.kind === 'single'}
        onOpenChange={(open) => {
          if (!open && !working.current) setConfirmation(null)
        }}
      >
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete note forever?</AlertDialogTitle>
            <AlertDialogDescription>
              Permanently delete &quot;{confirmation?.title || 'Untitled'}
              &quot;? This cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={busy}
              className="bg-destructive text-destructive-foreground"
              onClick={(event) => {
                event.preventDefault()
                void actOnEntries('purge', confirmation?.ids ?? [])
              }}
            >
              Delete forever
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </main>
  )
}
