"use client"

import { useState } from 'react'
import { Database, Trash2, Loader2 } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { toast } from 'sonner'
import { useSupabase } from '@ui/web/providers/SupabaseProvider'
import { useRagStatus } from '@ui/web/hooks/useRagStatus'

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
}

type Operation = 'indexing' | 'deleting' | null

export function RagIndexPanel({ noteId }: RagIndexPanelProps) {
  const { supabase } = useSupabase()
  const { chunkCount, indexedAt, isLoading } = useRagStatus(noteId)
  const [operation, setOperation] = useState<Operation>(null)

  const isIndexed = chunkCount > 0
  const isBusy = operation !== null

  const handleIndex = async () => {
    setOperation('indexing')
    try {
      const { data, error } = await supabase.functions.invoke('rag-index', {
        body: { noteId, action: 'index' },
      })
      if (error) throw error
      toast.success(`Indexed into ${(data as { chunkCount: number }).chunkCount} chunks`)
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
    } catch (err) {
      toast.error(await extractErrorMessage(err, 'Delete failed'))
    } finally {
      setOperation(null)
    }
  }

  const statusText = () => {
    if (isLoading) return '...'
    if (operation === 'indexing') return 'Indexing...'
    if (operation === 'deleting') return 'Removing...'
    if (isIndexed) {
      const time = indexedAt ? new Date(indexedAt).toLocaleTimeString() : ''
      return `${chunkCount} chunks${time ? ` · ${time}` : ''}`
    }
    return 'Not indexed'
  }

  return (
    <div className="flex items-center gap-2">
      <Button
        variant="outline"
        size="sm"
        onClick={handleIndex}
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
        onClick={handleDelete}
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
  )
}
