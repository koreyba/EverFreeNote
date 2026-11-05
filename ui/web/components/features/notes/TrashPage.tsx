'use client'

import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  NoteService,
  type TrashEntry,
  type TrashSummary,
} from '@core/services/notes'
import type { MutationQueueItem } from '@core/types/offline'
import { compactQueue } from '@core/utils/compactQueue'
import { SanitizationService } from '@core/services/sanitizer'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { Button } from '@/components/ui/button'
import { Checkbox } from '@/components/ui/checkbox'
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
import { RenderedNoteContent } from '@/components/RenderedNoteContent'
import { NOTE_CONTENT_CLASS } from '@core/constants/typography'
import { clearTrashCache, trashCacheKey } from '@ui/web/lib/trashCache'

export type TrashPageProps = {
  isOffline: boolean
  loadPending: () => Promise<MutationQueueItem[]>
  onChanged: () => void | Promise<void>
  refreshToken?: number
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

export function TrashPage({
  isOffline,
  loadPending,
  onChanged,
  refreshToken = 0,
}: TrashPageProps) {
  const { supabase, user, getSessionSnapshot } = useSupabase()
  const owner = user?.id ?? ''
  const service = useMemo(() => new NoteService(supabase), [supabase])
  const [initialCache] = useState(() => readCache(owner))
  const cache = useRef(initialCache)
  const refreshSequence = useRef(0)
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
  const [notice, setNotice] = useState<string | null>(null)
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
      if (!owner) return
      const started = getSessionSnapshot?.()
      const sequence = ++refreshSequence.current
      const isLatest = () =>
        currentSession(started) && sequence === refreshSequence.current
      setLoading(true)
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
            : [...cache.current.notes, ...result.notes].filter(
                (row, index, all) =>
                  all.findIndex((other) => other.trash_id === row.trash_id) ===
                  index,
              )
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
        if (isLatest()) setError(message(error))
      } finally {
        if (isLatest()) setLoading(false)
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
    setNotice(null)
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
        setNotice(
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
        else {
          setNotice('Trash is empty.')
          await refresh()
        }
      }
    } catch (error) {
      if (currentSession(started)) setError(message(error))
    } finally {
      working.current = false
      if (currentSession(started)) setBusy(false)
    }
  }
  const html = useMemo(
    () => SanitizationService.sanitizeForReading(preview?.description ?? ''),
    [preview?.description],
  )

  return (
    <main
      className="flex min-h-0 min-w-0 flex-1 flex-col overflow-hidden pb-16 md:pb-0"
      aria-label="Trash"
    >
      <header className="flex flex-wrap items-center justify-between gap-3 border-b p-4">
        <div>
          <h1 className="text-xl font-semibold">Trash</h1>
          <p className="text-sm text-muted-foreground">
            Notes are kept for 30 days, then automatically deleted.
          </p>
        </div>
        <div className="flex gap-2">
          <Button
            variant="outline"
            disabled={busy || isOffline || !rows.length}
            onClick={() => {
              setSelectionMode(!selectionMode)
              setSelected(new Set())
            }}
          >
            {selectionMode ? 'Cancel selection' : 'Select Notes'}
          </Button>
          <Button
            variant="destructive"
            disabled={busy || isOffline || !total || loading}
            onClick={() => void prepareEmptyTrash()}
          >
            Empty Trash
          </Button>
        </div>
      </header>
      {isOffline && (
        <p role="status" className="px-4 py-2 text-sm">
          Offline. Connect to restore or permanently delete notes. Showing
          cached and pending notes.
        </p>
      )}
      {error && (
        <p role="alert" className="px-4 py-2 text-sm text-destructive">
          {error}
        </p>
      )}
      {notice && (
        <p role="status" className="px-4 py-2 text-sm">
          {notice}
        </p>
      )}
      {selectionMode && (
        <div className="flex flex-wrap items-center gap-2 border-b p-3">
          <span className="text-sm">{selected.size} selected</span>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() =>
              setSelected(new Set(rows.map((row) => row.trash_id)))
            }
          >
            Select all
          </Button>
          <Button
            variant="outline"
            disabled={busy}
            onClick={() => setSelected(new Set())}
          >
            Unselect all
          </Button>
          <Button
            variant="outline"
            disabled={busy || isOffline || !selected.size}
            onClick={() => void actOnEntries('restore', [...selected])}
          >
            Restore selected
          </Button>
          <Button
            variant="destructive"
            disabled={busy || isOffline || !selected.size}
            onClick={() =>
              setConfirmation({ kind: 'bulk', ids: [...selected] })
            }
          >
            Delete selected forever
          </Button>
        </div>
      )}
      <div className="flex min-h-0 flex-1 flex-col md:flex-row">
        <section
          className={`min-h-0 flex-1 overflow-auto p-4 ${preview ? 'hidden md:block' : ''}`}
          aria-label="Deleted notes"
        >
          {loading && <p role="status">Loading Trash…</p>}
          {!loading && !rows.length && !pending.length && (
            <p className="text-muted-foreground">Trash is empty.</p>
          )}
          {[...pending, ...rows].map((row) => (
            <article
              key={row.trash_id}
              className="mb-2 flex flex-wrap items-center gap-3 rounded-lg border p-3"
            >
              {selectionMode && !('pending' in row) && (
                <Checkbox
                  aria-label={`Select ${row.title || 'Untitled'}`}
                  checked={selected.has(row.trash_id)}
                  disabled={busy || isOffline}
                  onCheckedChange={(checked) =>
                    setSelected((previous) => {
                      const next = new Set(previous)
                      if (checked) next.add(row.trash_id)
                      else next.delete(row.trash_id)
                      return next
                    })
                  }
                />
              )}
              <div className="min-w-0 flex-1">
                <button
                  className="max-w-full truncate text-left font-medium hover:underline"
                  onClick={() => void openPreview(row)}
                >
                  {row.title || 'Untitled'}
                </button>
                <p className="text-xs text-muted-foreground">
                  {'pending' in row
                    ? 'Pending sync — retained on this device'
                    : `Deleted ${new Date(row.deleted_at).toLocaleDateString()} · eligible for deletion ${new Date(Date.parse(row.deleted_at) + 720 * 3600000).toLocaleDateString()}`}
                </p>
              </div>
              {!('pending' in row) && (
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    aria-label={`Restore ${row.title || 'Untitled'}`}
                    disabled={busy || isOffline}
                    onClick={() => void actOnEntries('restore', [row.trash_id])}
                  >
                    Restore
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    aria-label={`Delete ${row.title || 'Untitled'} forever`}
                    disabled={busy || isOffline}
                    onClick={() =>
                      setConfirmation({
                        kind: 'single',
                        ids: [row.trash_id],
                        title: row.title,
                      })
                    }
                  >
                    Delete forever
                  </Button>
                </div>
              )}
            </article>
          ))}
          {hasMore && !isOffline && (
            <Button
              variant="outline"
              disabled={busy || loading}
              onClick={() => void refresh(page + 1)}
            >
              Load more
            </Button>
          )}
        </section>
        {preview && (
          <section
            aria-label="Trash note preview"
            className="min-h-0 flex-1 overflow-auto border-l p-4"
          >
            <Button
              variant="ghost"
              onClick={() => {
                previewSequence.current++
                setPreview(null)
              }}
            >
              Back to Trash
            </Button>
            <h2 className="my-4 text-xl font-semibold">
              {preview.title || 'Untitled'}
            </h2>
            <RenderedNoteContent html={html} className={NOTE_CONTENT_CLASS} />
          </section>
        )}
      </div>
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
