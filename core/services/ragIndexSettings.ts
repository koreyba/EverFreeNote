import type { SupabaseClient } from "@supabase/supabase-js"

import type { ApiKeysStatus } from "@core/services/apiKeysSettings"
import {
  resolveRagIndexingSettings,
  validateRagIndexingEditableSettings,
  type RagIndexingEditableSettings,
  type RagIndexingSettings,
} from "@core/rag/indexingSettings"
import { readSettingsErrorMessage } from "@core/services/settingsErrorMessage"

const readRagIndexingSettings = (data: unknown): RagIndexingSettings | null => {
  if (!data || typeof data !== "object") return null
  const ragIndexing = (data as ApiKeysStatus).ragIndexing
  if (!ragIndexing || typeof ragIndexing !== "object") return null

  const editableSettings = {
    target_chunk_size: (ragIndexing as { target_chunk_size?: unknown }).target_chunk_size,
    min_chunk_size: (ragIndexing as { min_chunk_size?: unknown }).min_chunk_size,
    max_chunk_size: (ragIndexing as { max_chunk_size?: unknown }).max_chunk_size,
    overlap: (ragIndexing as { overlap?: unknown }).overlap,
    use_title: (ragIndexing as { use_title?: unknown }).use_title,
    use_section_headings: (ragIndexing as { use_section_headings?: unknown }).use_section_headings,
    use_tags: (ragIndexing as { use_tags?: unknown }).use_tags,
    embedding_model: (ragIndexing as { embedding_model?: unknown }).embedding_model,
  } as Partial<RagIndexingEditableSettings>

  if (validateRagIndexingEditableSettings(editableSettings).length > 0) {
    return null
  }

  const resolvedSettings = resolveRagIndexingSettings(editableSettings)
  const rawSettings = ragIndexing as Record<string, unknown>
  const matchesResolvedShape = Object.entries(resolvedSettings).every(
    ([key, value]) => rawSettings[key] === value
  )

  return matchesResolvedShape ? resolvedSettings : null
}

export class RagIndexSettingsService {
  constructor(private supabase: SupabaseClient) {}

  async getStatus(): Promise<RagIndexingSettings> {
    const { data, error } = await this.supabase.functions.invoke("api-keys-status", { body: {} })
    if (error) {
      throw new Error(await readSettingsErrorMessage(error, "Failed to load RAG indexing settings"))
    }
    const ragIndexing = readRagIndexingSettings(data)
    if (!ragIndexing) {
      throw new Error("Unexpected response while loading RAG indexing settings")
    }
    return ragIndexing
  }

  async upsert(input: RagIndexingEditableSettings): Promise<RagIndexingSettings> {
    const { data, error } = await this.supabase.functions.invoke("api-keys-upsert", {
      body: input,
    })
    if (error) {
      throw new Error(await readSettingsErrorMessage(error, "Failed to save RAG indexing settings"))
    }
    const ragIndexing = readRagIndexingSettings(data)
    if (!ragIndexing) {
      throw new Error("Unexpected response while saving RAG indexing settings")
    }
    return ragIndexing
  }
}
