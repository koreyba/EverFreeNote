export const DEFAULT_EDITOR_CHUNK_SIZE = 30_000

export type ChunkStartPayload = { transferId: string; total: number }
export type ChunkPayload = { transferId: string; index: number; chunk: string }
export type ChunkEndPayload = { transferId: string }

export type ChunkedMessage = { type: string; payload?: unknown }

export type ChunkBufferEntry = { total: number; chunks: string[] }
export type ChunkBufferStore = Map<string, ChunkBufferEntry>

const CHUNK_START_SUFFIX = '_CHUNK_START'
const CHUNK_SUFFIX = '_CHUNK'
const CHUNK_END_SUFFIX = '_CHUNK_END'
const RESERVED_TRANSFER_IDS = new Set(['__proto__', 'prototype', 'constructor'])

export const sendChunkedText = (
  send: (message: ChunkedMessage) => void,
  type: string,
  text: string,
  chunkSize = DEFAULT_EDITOR_CHUNK_SIZE
) => {
  if (text.length <= chunkSize) {
    send({ type, payload: text })
    return
  }

  const transferId = `${type}_${Date.now()}_${Math.random().toString(16).slice(2)}`
  const total = Math.ceil(text.length / chunkSize)
  send({ type: `${type}${CHUNK_START_SUFFIX}`, payload: { transferId, total } satisfies ChunkStartPayload })
  for (let index = 0; index < total; index++) {
    const start = index * chunkSize
    const chunk = text.slice(start, start + chunkSize)
    send({ type: `${type}${CHUNK_SUFFIX}`, payload: { transferId, index, chunk } satisfies ChunkPayload })
  }
  send({ type: `${type}${CHUNK_END_SUFFIX}`, payload: { transferId } satisfies ChunkEndPayload })
}

const isValidTransferId = (id: unknown): id is string =>
  typeof id === 'string' &&
  id.length > 0 &&
  id.length <= 200 &&
  !RESERVED_TRANSFER_IDS.has(id) &&
  !/[^a-zA-Z0-9_\-.]/.test(id)

const parseBaseType = (type: string): { baseType: string; phase: 'START' | 'CHUNK' | 'END' } | null => {
  if (type.endsWith(CHUNK_START_SUFFIX)) {
    return { baseType: type.slice(0, -CHUNK_START_SUFFIX.length), phase: 'START' }
  }
  if (type.endsWith(CHUNK_SUFFIX)) {
    return { baseType: type.slice(0, -CHUNK_SUFFIX.length), phase: 'CHUNK' }
  }
  if (type.endsWith(CHUNK_END_SUFFIX)) {
    return { baseType: type.slice(0, -CHUNK_END_SUFFIX.length), phase: 'END' }
  }
  return null
}

const handleChunkStart = (payload: unknown, store: ChunkBufferStore): void => {
  if (!payload || typeof payload !== 'object') return
  const p = payload as Partial<ChunkStartPayload>
  if (!isValidTransferId(p.transferId) || typeof p.total !== 'number') return
  if (p.total < 1 || p.total > 10_000 || !Number.isInteger(p.total)) return
  store.set(p.transferId, { total: p.total, chunks: [] })
}

const handleChunkPayload = (payload: unknown, store: ChunkBufferStore): void => {
  if (!payload || typeof payload !== 'object') return
  const p = payload as Partial<ChunkPayload>
  if (!isValidTransferId(p.transferId) || typeof p.index !== 'number' || typeof p.chunk !== 'string') return
  const entry = store.get(p.transferId)
  if (!entry) return
  if (!Number.isInteger(p.index) || p.index < 0 || p.index >= entry.total) return
  entry.chunks[p.index] = p.chunk
}

const handleChunkEnd = (
  payload: unknown,
  store: ChunkBufferStore,
  baseType: string
): { baseType: string; text: string } | null => {
  if (!payload || typeof payload !== 'object') return null
  const p = payload as Partial<ChunkEndPayload>
  if (!isValidTransferId(p.transferId)) return null
  const entry = store.get(p.transferId)
  if (!entry || entry.chunks.length !== entry.total) return null

  for (let index = 0; index < entry.total; index++) {
    if (typeof entry.chunks[index] !== 'string') return null
  }

  const text = entry.chunks.join('')
  store.delete(p.transferId)
  return { baseType, text }
}

export const consumeChunkedMessage = (
  type: string,
  payload: unknown,
  store: ChunkBufferStore
): { baseType: string; text: string } | null => {
  const parsed = parseBaseType(type)
  if (!parsed) return null

  if (parsed.phase === 'START') {
    handleChunkStart(payload, store)
    return null
  }
  if (parsed.phase === 'CHUNK') {
    handleChunkPayload(payload, store)
    return null
  }
  return handleChunkEnd(payload, store, parsed.baseType)
}
