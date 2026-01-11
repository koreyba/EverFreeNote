export const DEFAULT_EDITOR_CHUNK_SIZE = 30_000

export type ChunkStartPayload = { transferId: string; total: number }
export type ChunkPayload = { transferId: string; index: number; chunk: string }
export type ChunkEndPayload = { transferId: string }

export type ChunkedMessage = { type: string; payload?: unknown }

export type ChunkBufferStore = Record<string, { total: number; chunks: string[] }>

const CHUNK_START_SUFFIX = '_CHUNK_START'
const CHUNK_SUFFIX = '_CHUNK'
const CHUNK_END_SUFFIX = '_CHUNK_END'

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

export const consumeChunkedMessage = (
  type: string,
  payload: unknown,
  store: ChunkBufferStore
): { baseType: string; text: string } | null => {
  let baseType: string | null = null

  if (type.endsWith(CHUNK_START_SUFFIX)) {
    baseType = type.slice(0, -CHUNK_START_SUFFIX.length)
  } else if (type.endsWith(CHUNK_SUFFIX)) {
    baseType = type.slice(0, -CHUNK_SUFFIX.length)
  } else if (type.endsWith(CHUNK_END_SUFFIX)) {
    baseType = type.slice(0, -CHUNK_END_SUFFIX.length)
  } else {
    return null
  }

  if (type.endsWith(CHUNK_START_SUFFIX)) {
    const p = payload as Partial<ChunkStartPayload>
    if (!p.transferId || typeof p.total !== 'number') return null
    store[p.transferId] = { total: p.total, chunks: [] }
    return null
  }

  if (type.endsWith(CHUNK_SUFFIX)) {
    const p = payload as Partial<ChunkPayload>
    if (!p.transferId || typeof p.index !== 'number' || typeof p.chunk !== 'string') return null
    const entry = store[p.transferId]
    if (!entry) return null
    entry.chunks[p.index] = p.chunk
    return null
  }

  if (type.endsWith(CHUNK_END_SUFFIX)) {
    const p = payload as Partial<ChunkEndPayload>
    if (!p.transferId) return null
    const entry = store[p.transferId]
    if (!entry) return null
    const text = entry.chunks.join('')
    delete store[p.transferId]
    return { baseType, text }
  }

  return null
}
