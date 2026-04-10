import { getAIIndexActionPresentation } from "@core/constants/aiIndex"
import { parseRagIndexResult } from "@core/rag/indexResult"
import type { AIIndexMutationResult, AIIndexNoteRow } from "@core/types/aiIndex"

export type BulkIndexOutcome = "indexed" | "skipped" | "failed"

export type BulkIndexCounters = {
  successCount: number
  skippedCount: number
  errorCount: number
}

export type BulkIndexInvoke = (
  name: string,
  options: { body: { noteId: string; action: "index" | "reindex" } }
) => Promise<{ data: unknown; error: unknown }>

export function incrementBulkIndexCounters(
  counters: BulkIndexCounters,
  outcome: BulkIndexOutcome
): BulkIndexCounters {
  if (outcome === "indexed") {
    return { ...counters, successCount: counters.successCount + 1 }
  }
  if (outcome === "skipped") {
    return { ...counters, skippedCount: counters.skippedCount + 1 }
  }
  return { ...counters, errorCount: counters.errorCount + 1 }
}

export function formatBulkIndexSummary(successCount: number, skippedCount: number, errorCount: number) {
  const parts = [
    successCount > 0 ? `${successCount} indexed` : null,
    skippedCount > 0 ? `${skippedCount} skipped` : null,
    errorCount > 0 ? `${errorCount} failed` : null,
  ].filter(Boolean)

  return parts.join(" • ")
}

export async function processBulkIndexNote({
  applyMutationResult,
  invoke,
  note,
}: Readonly<{
  applyMutationResult: (result: AIIndexMutationResult) => void
  invoke: BulkIndexInvoke
  note: AIIndexNoteRow
}>): Promise<BulkIndexOutcome> {
  const actionPresentation = getAIIndexActionPresentation(note.status)

  try {
    const { data, error } = await invoke("rag-index", {
      body: {
        noteId: note.id,
        action: actionPresentation.action,
      },
    })
    if (error) throw error

    const result = parseRagIndexResult(data)
    if (result.outcome === "indexed") {
      applyMutationResult({
        noteId: note.id,
        previousStatus: note.status,
        nextStatus: actionPresentation.successStatus,
      })
      return "indexed"
    }

    if (result.outcome === "skipped") {
      if (result.reason === "too_short") {
        applyMutationResult({
          noteId: note.id,
          previousStatus: note.status,
          nextStatus: "not_indexed",
        })
      }
      return "skipped"
    }

    return "failed"
  } catch {
    return "failed"
  }
}
