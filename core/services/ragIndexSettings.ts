import type { SupabaseClient } from "@supabase/supabase-js"

import type { ApiKeysStatus } from "@core/services/apiKeysSettings"
import type { RagIndexingEditableSettings, RagIndexingSettings } from "@core/rag/indexingSettings"
import { readSettingsErrorMessage } from "@core/services/settingsErrorMessage"

const isRagIndexingSettings = (data: unknown): data is RagIndexingSettings => {
  if (!data || typeof data !== "object") return false
  return (
    typeof (data as { target_chunk_size?: unknown }).target_chunk_size === "number" &&
    typeof (data as { min_chunk_size?: unknown }).min_chunk_size === "number" &&
    typeof (data as { max_chunk_size?: unknown }).max_chunk_size === "number" &&
    typeof (data as { overlap?: unknown }).overlap === "number" &&
    typeof (data as { use_title?: unknown }).use_title === "boolean" &&
    typeof (data as { use_section_headings?: unknown }).use_section_headings === "boolean" &&
    typeof (data as { use_tags?: unknown }).use_tags === "boolean" &&
    typeof (data as { output_dimensionality?: unknown }).output_dimensionality === "number"
  )
}

const readRagIndexingSettings = (data: unknown): RagIndexingSettings | null => {
  if (!data || typeof data !== "object") return null
  const ragIndexing = (data as ApiKeysStatus).ragIndexing
  return isRagIndexingSettings(ragIndexing) ? ragIndexing : null
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
