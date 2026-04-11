import {
  DEFAULT_RAG_EMBEDDING_MODEL,
  isRagEmbeddingModelPreset,
  resolveRagEmbeddingModel,
  type RagEmbeddingModelPreset,
} from "./embeddingModels.ts"

export const RAG_INDEX_NUMERIC_MIN = 50
export const RAG_INDEX_NUMERIC_MAX = 5000

export const RAG_INDEX_EDITABLE_DEFAULTS = {
  target_chunk_size: 500,
  min_chunk_size: 200,
  max_chunk_size: 1500,
  overlap: 100,
  use_title: true,
  use_section_headings: true,
  use_tags: true,
  embedding_model: DEFAULT_RAG_EMBEDDING_MODEL,
} as const

export const RAG_INDEX_READONLY_SETTINGS = {
  output_dimensionality: 1536,
  task_type_document: "RETRIEVAL_DOCUMENT" as const,
  task_type_query: "RETRIEVAL_QUERY" as const,
  split_strategy: "hierarchical" as const,
  fallback_split_order: ["sections", "paragraphs", "sentences", "tokens_or_characters"] as const,
  chunk_accumulation_rule:
    "Paragraph-first: accumulate whole paragraphs until min_chunk_size is reached, then optionally extend toward target_chunk_size only if the next whole paragraph fits without exceeding it. Oversized paragraphs are split at max_chunk_size boundaries; if the remainder is below min_chunk_size it is merged back into the previous piece. Notes shorter than min_chunk_size are not indexed.",
  small_chunk_merge_rule:
    "Merge undersized final chunks with adjacent chunks when possible without violating max_chunk_size.",
  chunk_template: "{chunk_content}\n\nSection: {section_heading}\nTags: {tag1}, {tag2}, {tag3}",
} as const

export type RagIndexingEditableSettings = {
  target_chunk_size: number
  min_chunk_size: number
  max_chunk_size: number
  overlap: number
  use_title: boolean
  use_section_headings: boolean
  use_tags: boolean
  embedding_model: RagEmbeddingModelPreset
}

export type RagIndexingSettings = RagIndexingEditableSettings & typeof RAG_INDEX_READONLY_SETTINGS

export const RAG_INDEX_OVERLAP_MIN = 0

export const RAG_INDEX_EDITABLE_NUMERIC_KEYS = [
  "target_chunk_size",
  "min_chunk_size",
  "max_chunk_size",
  "overlap",
] as const

export const RAG_INDEX_EDITABLE_BOOLEAN_KEYS = [
  "use_title",
  "use_section_headings",
  "use_tags",
] as const

export const RAG_INDEX_EDITABLE_MODEL_KEYS = [
  "embedding_model",
] as const

type RagIndexNumericKey = (typeof RAG_INDEX_EDITABLE_NUMERIC_KEYS)[number]
type RagIndexBooleanKey = (typeof RAG_INDEX_EDITABLE_BOOLEAN_KEYS)[number]
type RagIndexModelKey = (typeof RAG_INDEX_EDITABLE_MODEL_KEYS)[number]

export function resolveRagIndexingEditableSettings(
  input?: Partial<RagIndexingEditableSettings> | null
): RagIndexingEditableSettings {
  const mergedInput = input ? { ...input } : undefined

  return {
    ...RAG_INDEX_EDITABLE_DEFAULTS,
    ...mergedInput,
    embedding_model: resolveRagEmbeddingModel(input?.embedding_model),
  }
}

export function resolveRagIndexingSettings(
  input?: Partial<RagIndexingEditableSettings> | null
): RagIndexingSettings {
  return {
    ...resolveRagIndexingEditableSettings(input),
    ...RAG_INDEX_READONLY_SETTINGS,
  }
}

export function validateRagIndexingEditableSettings(
  input: Partial<RagIndexingEditableSettings> | null | undefined
): string[] {
  const errors: string[] = []
  const resolved = resolveRagIndexingEditableSettings(input)

  for (const key of RAG_INDEX_EDITABLE_NUMERIC_KEYS) {
    const value = resolved[key]
    if (!Number.isInteger(value)) {
      errors.push(`${key} must be an integer`)
      continue
    }
    const min = key === "overlap" ? RAG_INDEX_OVERLAP_MIN : RAG_INDEX_NUMERIC_MIN
    if (value < min || value > RAG_INDEX_NUMERIC_MAX) {
      errors.push(`${key} must be between ${min} and ${RAG_INDEX_NUMERIC_MAX}`)
    }
  }

  for (const key of RAG_INDEX_EDITABLE_BOOLEAN_KEYS) {
    const value = resolved[key]
    if (typeof value !== "boolean") {
      errors.push(`${key} must be a boolean`)
    }
  }

  if (input?.embedding_model !== undefined && !isRagEmbeddingModelPreset(input.embedding_model)) {
    errors.push("embedding_model must be one of the supported Gemini embedding presets")
  }

  if (resolved.min_chunk_size > resolved.target_chunk_size) {
    errors.push("min_chunk_size must be less than or equal to target_chunk_size")
  }
  if (resolved.target_chunk_size > resolved.max_chunk_size) {
    errors.push("target_chunk_size must be less than or equal to max_chunk_size")
  }
  if (resolved.overlap >= resolved.min_chunk_size) {
    errors.push("overlap must be less than min_chunk_size")
  }

  return errors
}

export function assertValidRagIndexingEditableSettings(
  input: Partial<RagIndexingEditableSettings> | null | undefined
): RagIndexingEditableSettings {
  const resolved = resolveRagIndexingEditableSettings(input)
  const errors = validateRagIndexingEditableSettings(input)
  if (errors.length > 0) {
    throw new Error(errors.join(". "))
  }
  return resolved
}

export function pickRagIndexingEditableSettings(
  input: Partial<RagIndexingEditableSettings> | null | undefined
): RagIndexingEditableSettings {
  return assertValidRagIndexingEditableSettings(input)
}

export function coerceRagIndexingEditableSettings(
  input: Record<string, unknown>
): Partial<RagIndexingEditableSettings> {
  const settings: Partial<RagIndexingEditableSettings> = {}

  for (const key of RAG_INDEX_EDITABLE_NUMERIC_KEYS) {
    const value = input[key]
    if (value === undefined) continue
    settings[key] = value as RagIndexingEditableSettings[RagIndexNumericKey]
  }

  for (const key of RAG_INDEX_EDITABLE_BOOLEAN_KEYS) {
    const value = input[key]
    if (value === undefined) continue
    settings[key] = value as RagIndexingEditableSettings[RagIndexBooleanKey]
  }

  for (const key of RAG_INDEX_EDITABLE_MODEL_KEYS) {
    const value = input[key]
    if (value === undefined) continue
    settings[key] = value as RagIndexingEditableSettings[RagIndexModelKey]
  }

  return settings
}

export function getRagReadonlySettings() {
  return RAG_INDEX_READONLY_SETTINGS
}
