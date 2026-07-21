import { DEFAULT_RAG_EMBEDDING_MODEL } from '@core/rag/embeddingModels'
import { resolveRagSearchSettings } from '@core/rag/searchSettings'
import { RagSearchSettingsService } from '@core/services/ragSearchSettings'

const serviceWithInvoke = (invoke: jest.Mock) => ({ functions: { invoke } }) as never

describe('RagSearchSettingsService additional branches', () => {
  it('returns the resolved status and sends the exact status request payload', async () => {
    const invoke = jest.fn()
    const expected = resolveRagSearchSettings({ top_k: 25, similarity_threshold: 0.6 })
    invoke.mockResolvedValue({ data: { ragSearch: { ...expected } }, error: null })
    const service = new RagSearchSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).resolves.toEqual(expected)
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('api-keys-status', { body: {} })
  })

  it('returns the resolved upsert response and sends the exact input payload', async () => {
    const invoke = jest.fn()
    const input = {
      top_k: 30,
      similarity_threshold: 0.65,
      embedding_model: DEFAULT_RAG_EMBEDDING_MODEL,
    }
    const expected = resolveRagSearchSettings(input)
    invoke.mockResolvedValue({ data: { ragSearch: { ...expected } }, error: null })
    const service = new RagSearchSettingsService(serviceWithInvoke(invoke))

    await expect(service.upsert(input)).resolves.toEqual(expected)
    expect(invoke).toHaveBeenCalledTimes(1)
    expect(invoke).toHaveBeenCalledWith('api-keys-upsert', { body: input })
  })

  it('rejects non-object responses and malformed nested ragSearch data', async () => {
    const invoke = jest.fn()
    const service = new RagSearchSettingsService(serviceWithInvoke(invoke))
    const malformedResponses = [
      42,
      'malformed response',
      { ragSearch: 'malformed settings' },
      { ragSearch: { top_k: 15, similarity_threshold: 0.55, embedding_model: {} } },
    ]

    for (const data of malformedResponses) {
      invoke.mockResolvedValueOnce({ data, error: null })

      await expect(service.getStatus()).rejects.toThrow(
        'Unexpected response while loading RAG retrieval settings',
      )
    }
  })

  it('rejects a valid-looking object when its nested shape does not match resolved settings', async () => {
    const invoke = jest.fn()
    const service = new RagSearchSettingsService(serviceWithInvoke(invoke))
    const resolved = resolveRagSearchSettings()

    invoke.mockResolvedValueOnce({
      data: { ragSearch: { ...resolved, top_k: undefined } },
      error: null,
    })
    invoke.mockResolvedValueOnce({
      data: { ragSearch: { ...resolved, readonly: { max_top_k: 100 } } },
      error: null,
    })

    await expect(service.getStatus()).rejects.toThrow(
      'Unexpected response while loading RAG retrieval settings',
    )
    await expect(service.upsert({ top_k: resolved.top_k })).rejects.toThrow(
      'Unexpected response while saving RAG retrieval settings',
    )
  })

  it('propagates status and upsert endpoint errors with their operation-specific messages', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: new Error('status endpoint failed') })
      .mockResolvedValueOnce({ data: null, error: new Error('upsert endpoint failed') })
    const service = new RagSearchSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).rejects.toThrow('status endpoint failed')
    await expect(service.upsert({ top_k: 20 })).rejects.toThrow('upsert endpoint failed')
    expect(invoke).toHaveBeenNthCalledWith(1, 'api-keys-status', { body: {} })
    expect(invoke).toHaveBeenNthCalledWith(2, 'api-keys-upsert', { body: { top_k: 20 } })
  })

  it('uses operation-specific fallbacks for non-Error endpoint failures', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: { code: 'STATUS_FAILED' } })
      .mockResolvedValueOnce({ data: null, error: { code: 'UPSERT_FAILED' } })
    const service = new RagSearchSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).rejects.toThrow('Failed to load RAG retrieval settings')
    await expect(service.upsert({ similarity_threshold: 0.7 })).rejects.toThrow(
      'Failed to save RAG retrieval settings',
    )
  })
})
