import { consumeChunkedMessage, sendChunkedText } from '@core/utils/editorWebViewBridge'

describe('editorWebViewBridge', () => {
  it('sends a single message for short text', () => {
    const sent: { type: string; payload?: unknown }[] = []

    sendChunkedText((message) => sent.push(message), 'CONTENT_CHANGED', 'short', 10)

    expect(sent).toHaveLength(1)
    expect(sent[0]).toEqual({ type: 'CONTENT_CHANGED', payload: 'short' })
  })

  it('sends chunked messages for long text', () => {
    const sent: { type: string; payload?: unknown }[] = []

    sendChunkedText((message) => sent.push(message), 'CONTENT_CHANGED', 'abcdef', 2)

    expect(sent.length).toBe(5)
    expect(sent[0].type).toBe('CONTENT_CHANGED_CHUNK_START')
    expect(sent[1].type).toBe('CONTENT_CHANGED_CHUNK')
    expect(sent[2].type).toBe('CONTENT_CHANGED_CHUNK')
    expect(sent[3].type).toBe('CONTENT_CHANGED_CHUNK')
    expect(sent[4].type).toBe('CONTENT_CHANGED_CHUNK_END')
  })

  it('reassembles chunked messages into text', () => {
    const store = new Map<string, { total: number; chunks: string[] }>()
    const transferId = 'test-transfer'

    consumeChunkedMessage('CONTENT_RESPONSE_CHUNK_START', { transferId, total: 2 }, store)
    consumeChunkedMessage('CONTENT_RESPONSE_CHUNK', { transferId, index: 0, chunk: 'first' }, store)
    consumeChunkedMessage('CONTENT_RESPONSE_CHUNK', { transferId, index: 1, chunk: 'second' }, store)

    const result = consumeChunkedMessage('CONTENT_RESPONSE_CHUNK_END', { transferId }, store)

    expect(result).toEqual({ baseType: 'CONTENT_RESPONSE', text: 'firstsecond' })
  })

  it('ignores prototype-like transfer ids', () => {
    for (const transferId of ['constructor', '__proto__', 'prototype', 'invalid id']) {
      const store = new Map<string, { total: number; chunks: string[] }>()

      const result = consumeChunkedMessage('CONTENT_RESPONSE_CHUNK_START', { transferId, total: 1 }, store)

      expect(result).toBeNull()
      expect(store.size).toBe(0)
    }
  })

  it('does not finish incomplete chunked messages', () => {
    const store = new Map<string, { total: number; chunks: string[] }>()
    const transferId = 'test-transfer'

    consumeChunkedMessage('CONTENT_RESPONSE_CHUNK_START', { transferId, total: 2 }, store)
    consumeChunkedMessage('CONTENT_RESPONSE_CHUNK', { transferId, index: 1, chunk: 'second' }, store)

    const result = consumeChunkedMessage('CONTENT_RESPONSE_CHUNK_END', { transferId }, store)

    expect(result).toBeNull()
    expect(store.has(transferId)).toBe(true)
  })

  it('ignores malformed lifecycle messages without mutating the buffer', () => {
    const store = new Map<string, { total: number; chunks: string[] }>()

    expect(consumeChunkedMessage('CONTENT_CHANGED', null, store)).toBeNull()
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_START', null, store)).toBeNull()
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_START', { transferId: 'x', total: 0 }, store)).toBeNull()
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_START', { transferId: 'x', total: 1.5 }, store)).toBeNull()
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_START', { transferId: 'x', total: 10_001 }, store)).toBeNull()
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_START', { transferId: 'x', total: 1 }, store)).toBeNull()

    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK', { transferId: 'missing', index: 0, chunk: 'x' }, store)).toBeNull()
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_END', { transferId: 'x' }, store)).toBeNull()
    expect(store.has('x')).toBe(true)
    store.clear()
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_END', { transferId: 'x' }, store)).toBeNull()
    expect(store).toEqual(new Map())
  })

  it('rejects invalid chunk indexes and missing chunk slots', () => {
    const store = new Map<string, { total: number; chunks: string[] }>()
    const transferId = 'valid-transfer'

    consumeChunkedMessage('CONTENT_CHANGED_CHUNK_START', { transferId, total: 2 }, store)
    for (const index of [-1, 2, 0.5]) {
      expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK', { transferId, index, chunk: 'bad' }, store)).toBeNull()
      expect(store.get(transferId)?.chunks).toEqual([undefined, undefined])
    }
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_END', { transferId }, store)).toBeNull()
    expect(store.has(transferId)).toBe(true)

    consumeChunkedMessage('CONTENT_CHANGED_CHUNK', { transferId, index: 0, chunk: 'first' }, store)
    expect(consumeChunkedMessage('CONTENT_CHANGED_CHUNK_END', { transferId }, store)).toBeNull()
    expect(store.has(transferId)).toBe(true)
  })
})
