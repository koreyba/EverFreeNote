export type RagIndexDebugChunkPayload = {
  chunkIndex: number
  charOffset: number
  sectionHeading: string | null
  title: string | null
  content: string
}

export type RagIndexSkippedReason = "too_short"

export type RagIndexIndexedResult = {
  outcome: "indexed"
  chunkCount: number
  droppedChunks: number
  message: null
  debugChunks: RagIndexDebugChunkPayload[]
}

export type RagIndexDeletedResult = {
  outcome: "deleted"
  message: null
  debugChunks: []
}

export type RagIndexSkippedResult = {
  outcome: "skipped"
  reason: RagIndexSkippedReason | null
  chunkCount: 0
  message: string
  debugChunks: RagIndexDebugChunkPayload[]
}

export type RagIndexUnknownResult = {
  outcome: "unknown"
  message: string
  debugChunks: RagIndexDebugChunkPayload[]
}

export type NormalizedRagIndexResult =
  | RagIndexIndexedResult
  | RagIndexDeletedResult
  | RagIndexSkippedResult
  | RagIndexUnknownResult

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null
}

function parseFiniteNumber(value: unknown): number | null {
  return typeof value === "number" && Number.isFinite(value) ? value : null
}

function normalizeMessage(value: unknown, fallback: string) {
  return typeof value === "string" && value.trim().length > 0 ? value.trim() : fallback
}

export function parseRagIndexDebugChunks(data: unknown): RagIndexDebugChunkPayload[] {
  if (!isRecord(data)) return []

  const value = data.debugChunks
  if (!Array.isArray(value)) return []

  return value.filter((chunk): chunk is RagIndexDebugChunkPayload => {
    if (!isRecord(chunk)) return false
    return typeof chunk.chunkIndex === "number"
      && typeof chunk.charOffset === "number"
      && typeof chunk.content === "string"
      && (typeof chunk.sectionHeading === "string" || chunk.sectionHeading === null)
      && (typeof chunk.title === "string" || chunk.title === null)
  })
}

export function parseRagIndexResult(data: unknown): NormalizedRagIndexResult {
  if (!isRecord(data)) {
    return {
      outcome: "unknown",
      message: "Indexing returned an empty response.",
      debugChunks: [],
    }
  }

  if (data.outcome === "deleted" || data.deleted === true) {
    return { outcome: "deleted", message: null, debugChunks: [] }
  }

  const debugChunks = parseRagIndexDebugChunks(data)
  const rawReason = typeof data.reason === "string"
    ? data.reason
    : typeof data.skipped === "string"
      ? data.skipped
      : null

  if (data.outcome === "skipped" || rawReason !== null) {
    return {
      outcome: "skipped",
      reason: rawReason === "too_short" ? "too_short" : null,
      chunkCount: 0,
      message: normalizeMessage(data.message, "Indexing was skipped."),
      debugChunks,
    }
  }

  const chunkCount = parseFiniteNumber(data.chunkCount)
  if ((data.outcome === "indexed" || chunkCount !== null) && (chunkCount ?? 0) > 0) {
    return {
      outcome: "indexed",
      chunkCount: chunkCount ?? 0,
      droppedChunks: Math.max(0, parseFiniteNumber(data.droppedChunks) ?? 0),
      message: null,
      debugChunks,
    }
  }

  if (chunkCount === 0) {
    return {
      outcome: "unknown",
      message: normalizeMessage(data.message, "Indexing completed without creating any chunks."),
      debugChunks,
    }
  }

  return {
    outcome: "unknown",
    message: normalizeMessage(data.message, "Indexing returned an unexpected response."),
    debugChunks,
  }
}
