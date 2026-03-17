"use client"

import { useState } from 'react'
import { Database, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import {
  DropdownMenuItem,
  DropdownMenuLabel,
} from '@/components/ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog'
import { toast } from 'sonner'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { useRagStatus } from '@ui/web/hooks/useRagStatus'
import { logRagIndexDebugChunks, type RagIndexDebugChunk } from '@core/rag/debugLog'

async function extractErrorMessage(err: unknown, fallback: string): Promise<string> {
  if (!(err instanceof Error)) return fallback
  // FunctionsHttpError wraps the actual Response in `context`
  const ctx = (err as Error & { context?: unknown }).context
  if (ctx instanceof Response) {
    try {
      const body = await ctx.json() as { error?: string }
      if (body?.error) return body.error
    } catch { /* fall through */ }
  }
  return err.message || fallback
}

interface RagIndexPanelProps {
  noteId: string
  variant?: 'inline' | 'menu'
  /** Called after the delete-index dialog closes (confirm or cancel), so the parent can close the dropdown */
  onMenuClose?: () => void
}

type Operation = 'indexing' | 'deleting' | null

function parseDebugChunks(data: unknown): RagIndexDebugChunk[] {
  if (!data || typeof data !== 'object') return []
  const value = (data as { debugChunks?: unknown }).debugChunks
  if (!Array.isArray(value)) return []
  return value.filter((chunk): chunk is RagIndexDebugChunk => {
    if (!chunk || typeof chunk !== 'object') return false
    const candidate = chunk as Partial<RagIndexDebugChunk>
    return typeof candidate.chunkIndex === 'number'
      && typeof candidate.charOffset === 'number'
      && typeof candidate.content === 'string'
      && (typeof candidate.sectionHeading === 'string' || candidate.sectionHeading === null)
      && (typeof candidate.title === 'string' || candidate.title === null)
  })
}

function parseChunkCount(data: unknown): number | null {
  if (!data || typeof data !== 'object') return null
  const value = (data as { chunkCount?: unknown }).chunkCount
  return typeof value === 'number' && Number.isFinite(value) ? value : null
}

export function RagIndexPanel({ noteId, variant = 'inline', onMenuClose }: RagIndexPanelProps) {
  const { supabase } = useSupabase()
  const { chunkCount, indexedAt, isLoading, refresh } = useRagStatus(noteId)
  const [operation, setOperation] = useState<Operation>(null)
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const isIndexed = chunkCount > 0
  const isBusy = operation !== null

  const handleIndex = async () => {
    setOperation('indexing')
    try {
      const { data, error } = await supabase.functions.invoke('rag-index', {
        body: { noteId, action: isIndexed ? 'reindex' : 'index', debugChunks: true },
      })
      if (error) throw error
      const debugChunks = parseDebugChunks(data)
      if (debugChunks.length > 0) {
        logRagIndexDebugChunks(noteId, debugChunks)
      }
      const count = parseChunkCount(data)
      if (count === null) {
        console.warn('[rag-index] Unexpected response payload for index action', data)
        toast.success('Indexed successfully')
      } else {
        toast.success(`Indexed into ${count} chunks`)
      }
      refresh()
    } catch (err) {
      toast.error(await extractErrorMessage(err, 'Indexing failed'))
    } finally {
      setOperation(null)
    }
  }

  const handleDelete = async () => {
    setOperation('deleting')
    try {
      const { error } = await supabase.functions.invoke('rag-index', {
        body: { noteId, action: 'delete' },
      })
      if (error) throw error
      toast.success('RAG index removed')
      refresh()
    } catch (err) {
      toast.error(await extractErrorMessage(err, 'Delete failed'))
    } finally {
      setOperation(null)
    }
  }

  const statusText = () => {
    if (operation === 'indexing') return 'Indexing...'
    if (operation === 'deleting') return 'Removing...'
    if (isLoading) return '...'
    if (isIndexed) {
      const time = indexedAt ? new Date(indexedAt).toLocaleTimeString() : ''
      return `${chunkCount} chunks${time ? ` - ${time}` : ''}`
    }
    return 'Not indexed'
  }

  const confirmDialog = (
    <AlertDialog
      open={deleteConfirmOpen}
      onOpenChange={(open) => {
        setDeleteConfirmOpen(open)
        // After dialog closes (confirm or cancel), let the parent close the dropdown too
        if (!open) onMenuClose?.()
      }}
    >
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Remove from AI index?</AlertDialogTitle>
          <AlertDialogDescription>
            This will remove all embeddings for this note. You can re-index it at any time.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel>Cancel</AlertDialogCancel>
          <AlertDialogAction
            data-cy="note-delete-index-confirm"
            onClick={() => { setDeleteConfirmOpen(false); void handleDelete() }}
            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
          >
            Remove
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )

  if (variant === 'menu') {
    return (
      <>
        <DropdownMenuLabel className="px-2 py-1 text-xs font-normal text-muted-foreground">
          AI index: {statusText()}
        </DropdownMenuLabel>
        {/*
          onSelect preventDefault keeps the dropdown mounted for the duration of the
          indexing request so operation state survives. onMenuClose is called in finally
          to close the menu once the request settles, preventing concurrent requests.
        */}
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); void handleIndex().finally(() => onMenuClose?.()) }}
          disabled={isBusy}
          title={isIndexed ? 'Re-index this note' : 'Index this note for AI search'}
        >
          {operation === 'indexing' ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Database />
          )}
          {isIndexed ? 'Re-index' : 'Index note'}
        </DropdownMenuItem>
        {/*
          onSelect preventDefault keeps the dropdown mounted while the AlertDialog is open.
          Without this, DropdownMenuContent unmounts before the dialog can render,
          losing the deleteConfirmOpen state.
        */}
        <DropdownMenuItem
          onSelect={(e) => { e.preventDefault(); setDeleteConfirmOpen(true) }}
          disabled={isBusy || !isIndexed}
          data-cy="note-delete-index-button"
          className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/20"
          title="Remove this note from the AI index"
        >
          {operation === 'deleting' ? (
            <Loader2 className="animate-spin" />
          ) : (
            <Trash2 />
          )}
          Delete index
        </DropdownMenuItem>
        {confirmDialog}
      </>
    )
  }

  return (
    <>
      <div className="flex items-center gap-2">
        <Button
          variant="outline"
          size="sm"
          onClick={() => void handleIndex()}
          disabled={isBusy}
          title={isIndexed ? 'Re-index this note' : 'Index this note for AI search'}
        >
          {operation === 'indexing' ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Database className="w-3.5 h-3.5 mr-1.5" />
          )}
          {isIndexed ? 'Re-index' : 'RAG Index'}
        </Button>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setDeleteConfirmOpen(true)}
          disabled={isBusy || !isIndexed}
          data-cy="note-delete-index-button"
          className="text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/20"
          title="Remove this note from the AI index"
        >
          {operation === 'deleting' ? (
            <Loader2 className="w-3.5 h-3.5 mr-1.5 animate-spin" />
          ) : (
            <Trash2 className="w-3.5 h-3.5 mr-1.5" />
          )}
          Delete Index
        </Button>
        <span className="text-xs text-muted-foreground min-w-[80px]">
          {statusText()}
        </span>
      </div>

      {confirmDialog}
    </>
  )
}
