import { resolveRagIndexingEditableSettings, resolveRagIndexingSettings } from '@core/rag/indexingSettings'
import { RagIndexSettingsService } from '@core/services/ragIndexSettings'

const serviceWithInvoke = (invoke: jest.Mock) => ({ functions: { invoke } }) as never

describe('RagIndexSettingsService additional branch behavior', () => {
  it('loads and upserts resolved settings with exact endpoint payloads', async () => {
    const validSettings = resolveRagIndexingSettings()
    const input = resolveRagIndexingEditableSettings({ target_chunk_size: 700, use_tags: false })
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { ragIndexing: { ...validSettings } }, error: null })
      .mockResolvedValueOnce({ data: { ragIndexing: { ...validSettings, use_tags: false } }, error: null })
    const service = new RagIndexSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).resolves.toEqual(validSettings)
    await expect(service.upsert(input)).resolves.toEqual({ ...validSettings, use_tags: false })

    expect(invoke).toHaveBeenNthCalledWith(1, 'api-keys-status', { body: {} })
    expect(invoke).toHaveBeenNthCalledWith(2, 'api-keys-upsert', { body: input })
  })

  it('accepts equal readonly arrays but rejects an array or scalar shape mismatch', async () => {
    const validSettings = resolveRagIndexingSettings()
    const invoke = jest.fn()
    const service = new RagIndexSettingsService(serviceWithInvoke(invoke))

    invoke.mockResolvedValueOnce({
      data: {
        ragIndexing: {
          ...validSettings,
          fallback_split_order: [...validSettings.fallback_split_order],
        },
      },
      error: null,
    })
    await expect(service.getStatus()).resolves.toEqual(validSettings)

    invoke.mockResolvedValueOnce({
      data: {
        ragIndexing: {
          ...validSettings,
          fallback_split_order: ['sections', 'paragraphs'],
        },
      },
      error: null,
    })
    await expect(service.getStatus()).rejects.toThrow('Unexpected response while loading RAG indexing settings')

    invoke.mockResolvedValueOnce({
      data: { ragIndexing: { ...validSettings, output_dimensionality: 999 } },
      error: null,
    })
    await expect(service.upsert(resolveRagIndexingEditableSettings())).rejects.toThrow(
      'Unexpected response while saving RAG indexing settings',
    )
  })

  it('rejects malformed nested data and invalid editable values', async () => {
    const validSettings = resolveRagIndexingSettings()
    const invoke = jest.fn()
    const service = new RagIndexSettingsService(serviceWithInvoke(invoke))
    const malformedResponses: unknown[] = [
      null,
      {},
      { ragIndexing: null },
      { ragIndexing: 'not-an-object' },
      { ragIndexing: 42 },
      { ragIndexing: { target_chunk_size: '700' } },
      { ragIndexing: { ...validSettings, unexpected: true } },
    ]

    for (const data of malformedResponses) {
      invoke.mockResolvedValueOnce({ data, error: null })
      await expect(service.getStatus()).rejects.toThrow('Unexpected response while loading RAG indexing settings')
    }
  })

  it('maps getStatus and upsert endpoint errors to thrown messages', async () => {
    const statusError = new Error('status request failed')
    const upsertError = new Error('upsert request failed')
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: null, error: statusError })
      .mockResolvedValueOnce({ data: null, error: upsertError })
    const service = new RagIndexSettingsService(serviceWithInvoke(invoke))
    const input = resolveRagIndexingEditableSettings()

    await expect(service.getStatus()).rejects.toThrow('status request failed')
    await expect(service.upsert(input)).rejects.toThrow('upsert request failed')
    expect(invoke).toHaveBeenNthCalledWith(1, 'api-keys-status', { body: {} })
    expect(invoke).toHaveBeenNthCalledWith(2, 'api-keys-upsert', { body: input })
  })

  it('rejects malformed success responses from both status and upsert', async () => {
    const invoke = jest.fn()
      .mockResolvedValueOnce({ data: { ragIndexing: null }, error: null })
      .mockResolvedValueOnce({ data: { ragIndexing: { use_title: true } }, error: null })
    const service = new RagIndexSettingsService(serviceWithInvoke(invoke))

    await expect(service.getStatus()).rejects.toThrow('Unexpected response while loading RAG indexing settings')
    await expect(service.upsert(resolveRagIndexingEditableSettings())).rejects.toThrow(
      'Unexpected response while saving RAG indexing settings',
    )
  })
})
