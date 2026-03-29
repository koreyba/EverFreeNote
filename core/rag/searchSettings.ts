import { getRagReadonlySettings } from "@core/rag/indexingSettings.ts"

const RAG_READONLY_INDEXING_SETTINGS = getRagReadonlySettings()

export const RAG_SEARCH_TOP_K_MIN = 1
export const RAG_SEARCH_TOP_K_MAX = 100
export const RAG_SEARCH_THRESHOLD_MIN = 0
export const RAG_SEARCH_THRESHOLD_MAX = 1
export const RAG_SEARCH_THRESHOLD_STEP = 0.05

export const RAG_SEARCH_EDITABLE_DEFAULTS = {
  top_k: 15,
  similarity_threshold: 0.55,
} as const

export const RAG_SEARCH_READONLY_SETTINGS = {
  output_dimensionality: RAG_READONLY_INDEXING_SETTINGS.output_dimensionality,
  task_type_document: RAG_READONLY_INDEXING_SETTINGS.task_type_document,
  task_type_query: RAG_READONLY_INDEXING_SETTINGS.task_type_query,
  load_more_overfetch: 1 as const,
  max_top_k: RAG_SEARCH_TOP_K_MAX,
  offset_delta_threshold: 300,
  slider_step: RAG_SEARCH_THRESHOLD_STEP,
} as const

export type RagSearchEditableSettings = {
  top_k: number
  similarity_threshold: number
}

export type RagSearchSettings = RagSearchEditableSettings & typeof RAG_SEARCH_READONLY_SETTINGS

export const RAG_SEARCH_EDITABLE_KEYS = [
  "top_k",
  "similarity_threshold",
] as const

type RagSearchEditableKey = (typeof RAG_SEARCH_EDITABLE_KEYS)[number]

export function resolveRagSearchEditableSettings(
  input?: Partial<RagSearchEditableSettings> | null
): RagSearchEditableSettings {
  return {
    top_k: input?.top_k ?? RAG_SEARCH_EDITABLE_DEFAULTS.top_k,
    similarity_threshold: input?.similarity_threshold ?? RAG_SEARCH_EDITABLE_DEFAULTS.similarity_threshold,
  }
}

export function resolveRagSearchSettings(
  input?: Partial<RagSearchEditableSettings> | null
): RagSearchSettings {
  return {
    ...resolveRagSearchEditableSettings(input),
    ...RAG_SEARCH_READONLY_SETTINGS,
  }
}

export function validateRagSearchEditableSettings(
  input: Partial<RagSearchEditableSettings> | null | undefined
): string[] {
  const errors: string[] = []
  const resolved = resolveRagSearchEditableSettings(input)

  if (!Number.isInteger(resolved.top_k)) {
    errors.push("top_k must be an integer")
  } else if (resolved.top_k < RAG_SEARCH_TOP_K_MIN || resolved.top_k > RAG_SEARCH_TOP_K_MAX) {
    errors.push(`top_k must be between ${RAG_SEARCH_TOP_K_MIN} and ${RAG_SEARCH_TOP_K_MAX}`)
  }

  if (typeof resolved.similarity_threshold !== "number" || Number.isNaN(resolved.similarity_threshold)) {
    errors.push("similarity_threshold must be a number")
  } else if (
    resolved.similarity_threshold < RAG_SEARCH_THRESHOLD_MIN ||
    resolved.similarity_threshold > RAG_SEARCH_THRESHOLD_MAX
  ) {
    errors.push(
      `similarity_threshold must be between ${RAG_SEARCH_THRESHOLD_MIN} and ${RAG_SEARCH_THRESHOLD_MAX}`
    )
  } else {
    const stepCount =
      (resolved.similarity_threshold - RAG_SEARCH_THRESHOLD_MIN) / RAG_SEARCH_THRESHOLD_STEP
    if (Math.abs(stepCount - Math.round(stepCount)) > Number.EPSILON * 10) {
      errors.push(`similarity_threshold must increment by ${RAG_SEARCH_THRESHOLD_STEP}`)
    }
  }

  return errors
}

export function assertValidRagSearchEditableSettings(
  input: Partial<RagSearchEditableSettings> | null | undefined
): RagSearchEditableSettings {
  const resolved = resolveRagSearchEditableSettings(input)
  const errors = validateRagSearchEditableSettings(resolved)
  if (errors.length > 0) {
    throw new Error(errors.join(". "))
  }
  return resolved
}

export function coerceRagSearchEditableSettings(
  input: Record<string, unknown>
): Partial<RagSearchEditableSettings> {
  const settings: Partial<RagSearchEditableSettings> = {}

  for (const key of RAG_SEARCH_EDITABLE_KEYS) {
    if (input[key] === undefined) continue
    settings[key] = input[key] as RagSearchEditableSettings[RagSearchEditableKey]
  }

  return settings
}

export function getRagSearchReadonlySettings() {
  return RAG_SEARCH_READONLY_SETTINGS
}
