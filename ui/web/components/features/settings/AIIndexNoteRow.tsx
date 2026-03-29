"use client"

import * as React from "react"
import { Database, Loader2, RefreshCcw, Trash2 } from "lucide-react"
import { toast } from "sonner"

import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import type { AIIndexNoteRow as AIIndexNoteRowData } from "@core/types/aiIndex"
import { useSupabase } from "@ui/web/providers/SupabaseProvider"

type Operation = "indexing" | "deleting" | null

const STATUS_STYLES: Record<AIIndexNoteRowData["status"], string> = {
  indexed: "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300",
  not_indexed: "border-border/70 bg-background/70 text-muted-foreground",
  outdated: "border-amber-500/30 bg-amber-500/10 text-amber-700 dark:text-amber-300",
}

const STATUS_LABELS: Record<AIIndexNoteRowData["status"], string> = {
  indexed: "Indexed",
  not_indexed: "Not indexed",
  outdated: "Outdated",
}

async function extractErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (!(err instanceof Error)) return fallback

  const ctx = (err as Error & { context?: unknown }).context
  if (ctx instanceof Response) {
    try {
      const body = await ctx.json() as { error?: string }
      if (ctx.status === 401) {
        return body?.error
          ? `${body.error}. Your local auth session may belong to a different Supabase stack. Sign out and sign in again, then retry.`
          : "Unauthorized. Your local auth session may belong to a different Supabase stack. Sign out and sign in again, then retry."
      }
      if (body?.error) return body.error
    } catch {
      if (ctx.status === 401) {
        return "Unauthorized. Your local auth session may belong to a different Supabase stack. Sign out and sign in again, then retry."
      }
      return err.message || fallback
    }
  }

  return err.message || fallback
}

function formatTimestamp(value: string | null) {
  if (!value) return "Never"

  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return "Unknown"

  return parsed.toLocaleString()
}

export function AIIndexNoteRow({
  note,
  onMutated,
  onOpenNote,
}: {
  note: AIIndexNoteRowData
  onMutated: () => void
  onOpenNote: (noteId: string) => void
}) {
  const { supabase } = useSupabase()
  const [operation, setOperation] = React.useState<Operation>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = React.useState(false)

  const isIndexed = note.status !== "not_indexed"
  const isBusy = operation !== null
  const actionLabel = isIndexed ? "Reindex" : "Index"
  const actionVerb = isIndexed ? "reindexed" : "indexed"

  const handleIndex = React.useCallback(async () => {
    setOperation("indexing")
    try {
      const { error } = await supabase.functions.invoke("rag-index", {
        body: {
          noteId: note.id,
          action: isIndexed ? "reindex" : "index",
        },
      })
      if (error) throw error

      toast.success(`Note ${actionVerb}`)
      onMutated()
    } catch (error) {
      toast.error(await extractErrorMessage(error, `${actionLabel} failed`))
    } finally {
      setOperation(null)
    }
  }, [actionLabel, actionVerb, isIndexed, note.id, onMutated, supabase.functions])

  const handleDelete = React.useCallback(async () => {
    setOperation("deleting")
    try {
      const { error } = await supabase.functions.invoke("rag-index", {
        body: {
          noteId: note.id,
          action: "delete",
        },
      })
      if (error) throw error

      toast.success("Note removed from AI index")
      onMutated()
    } catch (error) {
      toast.error(await extractErrorMessage(error, "Remove from index failed"))
    } finally {
      setOperation(null)
      setDeleteConfirmOpen(false)
    }
  }, [note.id, onMutated, supabase.functions])

  return (
    <>
      <article className="rounded-2xl border border-border/60 bg-card/80 p-4 shadow-none">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <button
            type="button"
            onClick={() => onOpenNote(note.id)}
            disabled={isBusy}
            className="group min-w-0 flex-1 space-y-3 rounded-2xl text-left transition-colors hover:bg-muted/35 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-wait disabled:opacity-80"
            aria-label={`Open note ${note.title.trim() || "Untitled Note"}`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <h3 className="truncate text-sm font-semibold underline-offset-4 group-hover:underline sm:text-base">
                {note.title.trim() || "Untitled Note"}
              </h3>
              <Badge variant="outline" className={STATUS_STYLES[note.status]}>
                {STATUS_LABELS[note.status]}
              </Badge>
            </div>

            <dl className="grid gap-2 text-xs text-muted-foreground sm:grid-cols-2 sm:gap-3 sm:text-sm">
              <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-2">
                <dt className="font-medium text-foreground">Last indexed at</dt>
                <dd className="mt-1">{formatTimestamp(note.lastIndexedAt)}</dd>
              </div>
              <div className="rounded-xl border border-border/50 bg-background/60 px-3 py-2">
                <dt className="font-medium text-foreground">Last updated</dt>
                <dd className="mt-1">{formatTimestamp(note.updatedAt)}</dd>
              </div>
            </dl>
          </button>

          <div className="flex flex-col gap-2 sm:flex-row lg:shrink-0 lg:flex-col">
            <Button
              variant="outline"
              size="sm"
              onClick={() => void handleIndex()}
              disabled={isBusy}
              className="sm:min-w-[152px]"
            >
              {operation === "indexing" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : isIndexed ? (
                <RefreshCcw className="mr-1.5 h-3.5 w-3.5" />
              ) : (
                <Database className="mr-1.5 h-3.5 w-3.5" />
              )}
              {actionLabel}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setDeleteConfirmOpen(true)}
              disabled={isBusy || !isIndexed}
              className="border-destructive/30 text-destructive hover:bg-destructive/10 hover:text-destructive sm:min-w-[152px]"
            >
              {operation === "deleting" ? (
                <Loader2 className="mr-1.5 h-3.5 w-3.5 animate-spin" />
              ) : (
                <Trash2 className="mr-1.5 h-3.5 w-3.5" />
              )}
              Remove from index
            </Button>
          </div>
        </div>
      </article>

      <AlertDialog open={deleteConfirmOpen} onOpenChange={setDeleteConfirmOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Remove note from AI index?</AlertDialogTitle>
            <AlertDialogDescription>
              This deletes all stored embeddings for the note. You can index it again later from this page.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={operation === "deleting"}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={(event) => {
                event.preventDefault()
                void handleDelete()
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {operation === "deleting" ? "Removing..." : "Remove from index"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
