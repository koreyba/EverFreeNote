import {
  DEFAULT_RAG_EMBEDDING_MODEL,
  getRagEmbeddingModelLabel,
  isRagEmbeddingModelPreset,
  RAG_EMBEDDING_MODEL_PRESETS,
  resolveRagEmbeddingModel,
} from '@core/rag/embeddingModels'

describe('RAG embedding model lookup', () => {
  it('exposes the exact supported preset values and metadata', () => {
    expect(RAG_EMBEDDING_MODEL_PRESETS).toEqual([
      {
        value: 'models/gemini-embedding-001',
        label: 'Gemini Embedding 1',
        description: 'Current stable text embedding model.',
      },
      {
        value: 'models/gemini-embedding-2-preview',
        label: 'Gemini Embedding 2',
        description: 'Public preview multimodal embedding model.',
      },
    ])
    expect(DEFAULT_RAG_EMBEDDING_MODEL).toBe('models/gemini-embedding-001')
  })

  it('recognizes both supported models and returns their exact labels', () => {
    for (const preset of RAG_EMBEDDING_MODEL_PRESETS) {
      expect(isRagEmbeddingModelPreset(preset.value)).toBe(true)
      expect(resolveRagEmbeddingModel(preset.value)).toBe(preset.value)
      expect(getRagEmbeddingModelLabel(preset.value)).toBe(preset.label)
    }
  })

  it('rejects unknown lookup values, resolves them to the default, and falls back to the raw label', () => {
    const unknownValues: unknown[] = [
      undefined,
      null,
      '',
      'models/unknown',
      42,
      { value: 'models/gemini-embedding-001' },
    ]

    for (const value of unknownValues) {
      expect(isRagEmbeddingModelPreset(value)).toBe(false)
      expect(resolveRagEmbeddingModel(value)).toBe(DEFAULT_RAG_EMBEDDING_MODEL)
    }

    expect(getRagEmbeddingModelLabel('models/provider-specific' as never)).toBe('models/provider-specific')
  })
})
