import {
  assertValidRagIndexingEditableSettings,
  coerceRagIndexingEditableSettings,
  getRagReadonlySettings,
  pickRagIndexingEditableSettings,
  RAG_INDEX_EDITABLE_DEFAULTS,
  RAG_INDEX_READONLY_SETTINGS,
  resolveRagIndexingEditableSettings,
  resolveRagIndexingSettings,
  validateRagIndexingEditableSettings,
} from '@core/rag/indexingSettings'
import { RAG_EMBEDDING_MODEL_PRESETS } from '@core/rag/embeddingModels'

describe('RAG indexing settings additional behavior', () => {
  it('returns exact defaults and merges editable overrides with readonly settings', () => {
    expect(resolveRagIndexingEditableSettings(null)).toEqual(RAG_INDEX_EDITABLE_DEFAULTS)
    expect(resolveRagIndexingSettings()).toEqual({
      ...RAG_INDEX_EDITABLE_DEFAULTS,
      ...RAG_INDEX_READONLY_SETTINGS,
    })

    const overrides = {
      target_chunk_size: 700,
      min_chunk_size: 250,
      max_chunk_size: 1200,
      overlap: 50,
      use_title: false,
      use_section_headings: false,
      use_tags: true,
      embedding_model: RAG_EMBEDDING_MODEL_PRESETS[1].value,
    }
    expect(resolveRagIndexingSettings(overrides)).toEqual({
      ...overrides,
      ...RAG_INDEX_READONLY_SETTINGS,
    })
  })

  it('keeps only editable keys during coercion and preserves supplied values without casting', () => {
    const input = {
      target_chunk_size: '700',
      min_chunk_size: 250,
      max_chunk_size: 1200,
      overlap: 50,
      use_title: false,
      use_section_headings: 'false',
      use_tags: true,
      embedding_model: RAG_EMBEDDING_MODEL_PRESETS[1].value,
      readonly_key: 1536,
    }

    expect(coerceRagIndexingEditableSettings(input)).toEqual({
      target_chunk_size: '700',
      min_chunk_size: 250,
      max_chunk_size: 1200,
      overlap: 50,
      use_title: false,
      use_section_headings: 'false',
      use_tags: true,
      embedding_model: RAG_EMBEDDING_MODEL_PRESETS[1].value,
    })
    expect(coerceRagIndexingEditableSettings({
      target_chunk_size: undefined,
      use_title: undefined,
      embedding_model: undefined,
    })).toEqual({})
  })

  it('returns the exact resolved values from successful assert and pick operations', () => {
    const input = {
      target_chunk_size: 700,
      min_chunk_size: 250,
      max_chunk_size: 1200,
      overlap: 50,
      use_title: false,
      use_section_headings: false,
      use_tags: true,
      embedding_model: RAG_EMBEDDING_MODEL_PRESETS[1].value,
    }

    expect(assertValidRagIndexingEditableSettings(input)).toEqual(input)
    expect(pickRagIndexingEditableSettings(input)).toEqual(input)
    expect(getRagReadonlySettings()).toEqual(RAG_INDEX_READONLY_SETTINGS)
  })

  it('reports exact validation messages for invalid numeric, boolean, model and ordering values', () => {
    expect(validateRagIndexingEditableSettings({
      target_chunk_size: 49.5,
      min_chunk_size: 6000,
      max_chunk_size: 49,
      overlap: -1,
      use_title: 'yes' as never,
      use_section_headings: 1 as never,
      use_tags: null as never,
      embedding_model: 'models/unknown' as never,
    })).toEqual([
      'target_chunk_size must be an integer',
      'min_chunk_size must be between 50 and 5000',
      'max_chunk_size must be between 50 and 5000',
      'overlap must be between 0 and 5000',
      'use_title must be a boolean',
      'use_section_headings must be a boolean',
      'use_tags must be a boolean',
      'embedding_model must be one of the supported Gemini embedding presets',
      'min_chunk_size must be less than or equal to target_chunk_size',
      'target_chunk_size must be less than or equal to max_chunk_size',
    ])
  })

  it('accepts inclusive numeric boundaries and rejects overlap at the minimum chunk size', () => {
    expect(validateRagIndexingEditableSettings({
      target_chunk_size: 5000,
      min_chunk_size: 50,
      max_chunk_size: 5000,
      overlap: 0,
    })).toEqual([])

    expect(validateRagIndexingEditableSettings({
      target_chunk_size: 500,
      min_chunk_size: 200,
      max_chunk_size: 1500,
      overlap: 200,
    })).toEqual(['overlap must be less than min_chunk_size'])
  })
})
