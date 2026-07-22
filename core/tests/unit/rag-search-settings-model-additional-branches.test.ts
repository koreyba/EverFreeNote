import {
  assertValidRagSearchEditableSettings,
  coerceRagSearchEditableSettings,
  getRagSearchReadonlySettings,
  RAG_SEARCH_EDITABLE_DEFAULTS,
  RAG_SEARCH_READONLY_SETTINGS,
  resolveRagSearchEditableSettings,
  resolveRagSearchSettings,
  validateRagSearchEditableSettings,
} from '../../rag/searchSettings'
import {
  DEFAULT_RAG_EMBEDDING_MODEL,
  RAG_EMBEDDING_MODEL_PRESETS,
} from '../../rag/embeddingModels'

describe('RAG search settings model additional branches', () => {
  it('resolves null input and preserves zero-valued editable settings', () => {
    expect(resolveRagSearchEditableSettings(null)).toEqual(RAG_SEARCH_EDITABLE_DEFAULTS)
    expect(resolveRagSearchSettings(null)).toEqual({
      ...RAG_SEARCH_EDITABLE_DEFAULTS,
      ...RAG_SEARCH_READONLY_SETTINGS,
    })
    expect(resolveRagSearchEditableSettings({
      top_k: 0,
      similarity_threshold: 0,
      embedding_model: RAG_EMBEDDING_MODEL_PRESETS[1].value,
    })).toEqual({
      top_k: 0,
      similarity_threshold: 0,
      embedding_model: RAG_EMBEDDING_MODEL_PRESETS[1].value,
    })
  })

  it('falls back to the default model for unsupported model values', () => {
    expect(resolveRagSearchEditableSettings({ embedding_model: 'models/unknown' as never }).embedding_model)
      .toBe(DEFAULT_RAG_EMBEDDING_MODEL)
    expect(resolveRagSearchEditableSettings({ embedding_model: null as never }).embedding_model)
      .toBe(DEFAULT_RAG_EMBEDDING_MODEL)
    expect(validateRagSearchEditableSettings({ embedding_model: undefined })).toEqual([])
    expect(validateRagSearchEditableSettings({ embedding_model: 'models/unknown' as never }))
      .toEqual(['embedding_model must be one of the supported Gemini embedding presets'])
  })

  it('accepts inclusive numeric boundaries and rejects invalid numeric variants', () => {
    expect(validateRagSearchEditableSettings({ top_k: 1, similarity_threshold: 0 })).toEqual([])
    expect(validateRagSearchEditableSettings({ top_k: 100, similarity_threshold: 1 })).toEqual([])
    expect(validateRagSearchEditableSettings({ top_k: 1.5, similarity_threshold: 0.55 }))
      .toEqual(['top_k must be an integer'])
    expect(validateRagSearchEditableSettings({ top_k: 15, similarity_threshold: 0.57 }))
      .toEqual(['similarity_threshold must increment by 0.05'])
    expect(validateRagSearchEditableSettings({ top_k: '15' as never, similarity_threshold: '0.5' as never }))
      .toEqual(['top_k must be an integer', 'similarity_threshold must be a number'])
    expect(validateRagSearchEditableSettings({ top_k: Number.POSITIVE_INFINITY, similarity_threshold: Number.NaN }))
      .toEqual(['top_k must be an integer', 'similarity_threshold must be a number'])
  })

  it('coerces only supported keys and preserves array/enum-shaped values for validation', () => {
    const input = {
      top_k: [15],
      similarity_threshold: { value: 0.5 },
      embedding_model: [RAG_EMBEDDING_MODEL_PRESETS[0].value],
      ignored: 'not editable',
    } as never

    expect(coerceRagSearchEditableSettings(input)).toEqual({
      top_k: [15],
      similarity_threshold: { value: 0.5 },
      embedding_model: [RAG_EMBEDDING_MODEL_PRESETS[0].value],
    })
    expect(validateRagSearchEditableSettings(input)).toEqual([
      'top_k must be an integer',
      'similarity_threshold must be a number',
      'embedding_model must be one of the supported Gemini embedding presets',
    ])
  })

  it('asserts valid partial settings after applying defaults and reports combined errors', () => {
    expect(assertValidRagSearchEditableSettings({ similarity_threshold: 0.65 })).toEqual({
      top_k: RAG_SEARCH_EDITABLE_DEFAULTS.top_k,
      similarity_threshold: 0.65,
      embedding_model: DEFAULT_RAG_EMBEDDING_MODEL,
    })
    expect(() => assertValidRagSearchEditableSettings({ top_k: 0, similarity_threshold: 0.57 }))
      .toThrow('top_k must be between 1 and 100. similarity_threshold must increment by 0.05')
  })

  it('exposes the complete readonly model without editable mutations', () => {
    const readonly = getRagSearchReadonlySettings()

    expect(readonly).toEqual(RAG_SEARCH_READONLY_SETTINGS)
    expect(readonly).toMatchObject({
      max_top_k: 100,
      load_more_overfetch: 1,
      offset_delta_threshold: 300,
      slider_step: 0.05,
    })
    expect(readonly).not.toHaveProperty('top_k')
    expect(readonly).not.toHaveProperty('similarity_threshold')
    expect(readonly).not.toHaveProperty('embedding_model')
  })
})
