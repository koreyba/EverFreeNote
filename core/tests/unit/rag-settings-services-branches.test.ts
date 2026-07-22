import {
  assertValidRagIndexingEditableSettings,
  coerceRagIndexingEditableSettings,
  getRagReadonlySettings,
  pickRagIndexingEditableSettings,
  resolveRagIndexingEditableSettings,
  validateRagIndexingEditableSettings,
} from '../../rag/indexingSettings'
import {
  assertValidRagSearchEditableSettings,
  coerceRagSearchEditableSettings,
  getRagSearchReadonlySettings,
  resolveRagSearchEditableSettings,
  validateRagSearchEditableSettings,
} from '../../rag/searchSettings'
import {
  DEFAULT_RAG_EMBEDDING_MODEL,
  getRagEmbeddingModelLabel,
  isRagEmbeddingModelPreset,
  resolveRagEmbeddingModel,
} from '../../rag/embeddingModels'
import { ApiKeysSettingsService } from '../../services/apiKeysSettings'
import { RagIndexSettingsService } from '../../services/ragIndexSettings'
import { RagSearchSettingsService } from '../../services/ragSearchSettings'

describe('RAG settings branches', () => {
  it('resolves, validates, picks and coerces indexing settings', () => {
    expect(resolveRagIndexingEditableSettings({ target_chunk_size: 700, embedding_model: DEFAULT_RAG_EMBEDDING_MODEL }).target_chunk_size).toBe(700)
    expect(pickRagIndexingEditableSettings({ min_chunk_size: 200 })).toMatchObject({ min_chunk_size: 200 })
    expect(coerceRagIndexingEditableSettings({ target_chunk_size: 1, use_title: false, embedding_model: DEFAULT_RAG_EMBEDDING_MODEL, ignored: true })).toEqual({
      target_chunk_size: 1, use_title: false, embedding_model: DEFAULT_RAG_EMBEDDING_MODEL,
    })
    expect(validateRagIndexingEditableSettings({ target_chunk_size: 1.5, overlap: -1, use_tags: 'no' as never })).toEqual(expect.arrayContaining([
      'target_chunk_size must be an integer', 'overlap must be between 0 and 5000', 'use_tags must be a boolean',
    ]))
    expect(getRagReadonlySettings().split_strategy).toBe('hierarchical')
    expect(() => assertValidRagIndexingEditableSettings({ min_chunk_size: 1, target_chunk_size: 2, max_chunk_size: 3, overlap: 0 })).toThrow()
  })

  it('resolves, validates and coerces search settings', () => {
    expect(resolveRagSearchEditableSettings({ top_k: 20, similarity_threshold: 0.6 }).top_k).toBe(20)
    expect(coerceRagSearchEditableSettings({ top_k: 20, similarity_threshold: 0.6, embedding_model: DEFAULT_RAG_EMBEDDING_MODEL, ignored: true })).toEqual({
      top_k: 20, similarity_threshold: 0.6, embedding_model: DEFAULT_RAG_EMBEDDING_MODEL,
    })
    expect(validateRagSearchEditableSettings({ top_k: 1.5, similarity_threshold: 0.5 })).toContain('top_k must be an integer')
    expect(assertValidRagSearchEditableSettings({ top_k: 20, similarity_threshold: 0.6 })).toMatchObject({ top_k: 20 })
    expect(getRagSearchReadonlySettings().max_top_k).toBe(100)
  })

  it('resolves embedding model presets and labels', () => {
    expect(isRagEmbeddingModelPreset(DEFAULT_RAG_EMBEDDING_MODEL)).toBe(true)
    expect(isRagEmbeddingModelPreset('other')).toBe(false)
    expect(resolveRagEmbeddingModel('other')).toBe(DEFAULT_RAG_EMBEDDING_MODEL)
    expect(getRagEmbeddingModelLabel(DEFAULT_RAG_EMBEDDING_MODEL)).toBe('Gemini Embedding 1')
  })
})

describe('RAG and API key settings services', () => {
  it('loads and updates valid settings and rejects malformed responses', async () => {
    const invoke = jest.fn()
    const indexService = new RagIndexSettingsService({ functions: { invoke } } as never)
    const searchService = new RagSearchSettingsService({ functions: { invoke } } as never)
    const index = resolveRagIndexingEditableSettings()
    const search = resolveRagSearchEditableSettings()
    invoke.mockResolvedValueOnce({ data: { ragIndexing: { ...index } }, error: null })
    await expect(indexService.getStatus()).resolves.toMatchObject(index)
    invoke.mockResolvedValueOnce({ data: { ragSearch: { ...search } }, error: null })
    await expect(searchService.getStatus()).resolves.toMatchObject(search)
    invoke.mockResolvedValueOnce({ data: { ragIndexing: { ...index } }, error: null })
    await expect(indexService.upsert(index)).resolves.toMatchObject(index)
    invoke.mockResolvedValueOnce({ data: { ragSearch: { ...search } }, error: null })
    await expect(searchService.upsert(search)).resolves.toMatchObject(search)
    invoke.mockResolvedValueOnce({ data: {}, error: null })
    await expect(indexService.getStatus()).rejects.toThrow('Unexpected response')
    invoke.mockResolvedValueOnce({ data: {}, error: null })
    await expect(searchService.upsert(search)).rejects.toThrow('Unexpected response')
  })

  it('maps settings service errors and validates API key responses', async () => {
    const invoke = jest.fn().mockResolvedValue({ data: null, error: new Error('failed') })
    const indexService = new RagIndexSettingsService({ functions: { invoke } } as never)
    const searchService = new RagSearchSettingsService({ functions: { invoke } } as never)
    const keysService = new ApiKeysSettingsService({ functions: { invoke } } as never)
    await expect(indexService.getStatus()).rejects.toThrow('failed')
    await expect(searchService.upsert({})).rejects.toThrow('failed')
    await expect(keysService.getStatus()).rejects.toThrow('failed')
    invoke.mockResolvedValueOnce({ data: { gemini: { configured: true } }, error: null })
    await expect(keysService.upsert('secret')).resolves.toEqual({ gemini: { configured: true } })
    invoke.mockResolvedValueOnce({ data: { gemini: { configured: false } }, error: null })
    await expect(keysService.removeGeminiApiKey()).resolves.toEqual({ gemini: { configured: false } })
    invoke.mockResolvedValueOnce({ data: {}, error: null })
    await expect(keysService.getStatus()).rejects.toThrow('Unexpected response')
  })

  it('rejects missing, invalid and shape-mismatched RAG search payloads', async () => {
    const invoke = jest.fn()
    const service = new RagSearchSettingsService({ functions: { invoke } } as never)
    for (const data of [null, {}, { ragSearch: null }, { ragSearch: { top_k: 0 } }, { ragSearch: { top_k: 15, similarity_threshold: 0.55, embedding_model: DEFAULT_RAG_EMBEDDING_MODEL, extra: true } }]) {
      invoke.mockResolvedValueOnce({ data, error: null })
      await expect(service.getStatus()).rejects.toThrow('Unexpected response')
    }
  })
})
