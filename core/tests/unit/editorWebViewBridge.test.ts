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
    const store: Record<string, { total: number; chunks: string[] }> = {}
    const transferId = 'test-transfer'

    consumeChunkedMessage('CONTENT_RESPONSE_CHUNK_START', { transferId, total: 2 }, store)
    consumeChunkedMessage('CONTENT_RESPONSE_CHUNK', { transferId, index: 0, chunk: 'first' }, store)
    consumeChunkedMessage('CONTENT_RESPONSE_CHUNK', { transferId, index: 1, chunk: 'second' }, store)

    const result = consumeChunkedMessage('CONTENT_RESPONSE_CHUNK_END', { transferId }, store)

    expect(result).toEqual({ baseType: 'CONTENT_RESPONSE', text: 'firstsecond' })
  })
})
