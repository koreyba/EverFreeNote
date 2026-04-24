export const RAG_EMBEDDING_MODEL_PRESETS = [
  {
    value: "models/gemini-embedding-001",
    label: "Gemini Embedding 1",
    description: "Current stable text embedding model.",
  },
  {
    value: "models/gemini-embedding-2-preview",
    label: "Gemini Embedding 2",
    description: "Public preview multimodal embedding model.",
  },
] as const

export type RagEmbeddingModelPreset = (typeof RAG_EMBEDDING_MODEL_PRESETS)[number]["value"]

export const DEFAULT_RAG_EMBEDDING_MODEL: RagEmbeddingModelPreset = RAG_EMBEDDING_MODEL_PRESETS[0].value

export function isRagEmbeddingModelPreset(value: unknown): value is RagEmbeddingModelPreset {
  return RAG_EMBEDDING_MODEL_PRESETS.some((preset) => preset.value === value)
}

export function resolveRagEmbeddingModel(value?: unknown): RagEmbeddingModelPreset {
  return isRagEmbeddingModelPreset(value) ? value : DEFAULT_RAG_EMBEDDING_MODEL
}

export function getRagEmbeddingModelLabel(value: RagEmbeddingModelPreset): string {
  return RAG_EMBEDDING_MODEL_PRESETS.find((preset) => preset.value === value)?.label ?? value
}
