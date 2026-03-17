export const RAG_INDEX_NUMERIC_MIN = 50
export const RAG_INDEX_NUMERIC_MAX = 5000

export const RAG_INDEX_EDITABLE_DEFAULTS = {
  small_note_threshold: 400,
  target_chunk_size: 500,
  min_chunk_size: 200,
  max_chunk_size: 1500,
  overlap: 100,
  use_title: true,
  use_section_headings: true,
  use_tags: true,
} as const

export const RAG_INDEX_READONLY_SETTINGS = {
  output_dimensionality: 1536,
  task_type_document: "RETRIEVAL_DOCUMENT" as const,
  task_type_query: "RETRIEVAL_QUERY" as const,
  split_strategy: "hierarchical" as const,
  fallback_split_order: ["sections", "paragraphs", "sentences", "tokens_or_characters"] as const,
  chunk_accumulation_rule:
    "Accumulate neighboring small paragraphs within the same section until target_chunk_size is reached or max_chunk_size would be exceeded.",
  small_chunk_merge_rule:
    "Merge undersized final chunks with adjacent chunks when possible without violating max_chunk_size.",
  chunk_template: "Section: {section_heading}\nTags: {tag1}, {tag2}, {tag3}\n\n{chunk_content}",
} as const

export type RagIndexingEditableSettings = {
  small_note_threshold: number
  target_chunk_size: number
  min_chunk_size: number
  max_chunk_size: number
  overlap: number
  use_title: boolean
  use_section_headings: boolean
  use_tags: boolean
}

export type RagIndexingSettings = RagIndexingEditableSettings & typeof RAG_INDEX_READONLY_SETTINGS

export const RAG_INDEX_EDITABLE_NUMERIC_KEYS = [
  "small_note_threshold",
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

type RagIndexNumericKey = (typeof RAG_INDEX_EDITABLE_NUMERIC_KEYS)[number]
type RagIndexBooleanKey = (typeof RAG_INDEX_EDITABLE_BOOLEAN_KEYS)[number]

export function resolveRagIndexingEditableSettings(
  input?: Partial<RagIndexingEditableSettings> | null
): RagIndexingEditableSettings {
  return {
    ...RAG_INDEX_EDITABLE_DEFAULTS,
    ...(input ?? {}),
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
    if (value < RAG_INDEX_NUMERIC_MIN || value > RAG_INDEX_NUMERIC_MAX) {
      errors.push(`${key} must be between ${RAG_INDEX_NUMERIC_MIN} and ${RAG_INDEX_NUMERIC_MAX}`)
    }
  }

  for (const key of RAG_INDEX_EDITABLE_BOOLEAN_KEYS) {
    const value = resolved[key]
    if (typeof value !== "boolean") {
      errors.push(`${key} must be a boolean`)
    }
  }

  if (resolved.min_chunk_size > resolved.target_chunk_size) {
    errors.push("min_chunk_size must be less than or equal to target_chunk_size")
  }
  if (resolved.target_chunk_size > resolved.max_chunk_size) {
    errors.push("target_chunk_size must be less than or equal to max_chunk_size")
  }

  return errors
}

export function assertValidRagIndexingEditableSettings(
  input: Partial<RagIndexingEditableSettings> | null | undefined
): RagIndexingEditableSettings {
  const resolved = resolveRagIndexingEditableSettings(input)
  const errors = validateRagIndexingEditableSettings(resolved)
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

  return settings
}

export function getRagReadonlySettings() {
  return RAG_INDEX_READONLY_SETTINGS
}
