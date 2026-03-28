import type { SupabaseClient } from "@supabase/supabase-js"

import type { RagSearchEditableSettings, RagSearchSettings } from "@core/rag/searchSettings"
import type { ApiKeysStatus } from "@core/services/apiKeysSettings"
import { readSettingsErrorMessage } from "@core/services/settingsErrorMessage"

const isRagSearchSettings = (data: unknown): data is RagSearchSettings => {
  if (!data || typeof data !== "object") return false
  return (
    typeof (data as { top_k?: unknown }).top_k === "number" &&
    typeof (data as { similarity_threshold?: unknown }).similarity_threshold === "number" &&
    typeof (data as { output_dimensionality?: unknown }).output_dimensionality === "number"
  )
}

const readRagSearchSettings = (data: unknown): RagSearchSettings | null => {
  if (!data || typeof data !== "object") return null
  const ragSearch = (data as ApiKeysStatus).ragSearch
  return isRagSearchSettings(ragSearch) ? ragSearch : null
}

export class RagSearchSettingsService {
  constructor(private supabase: SupabaseClient) {}

  async getStatus(): Promise<RagSearchSettings> {
    const { data, error } = await this.supabase.functions.invoke("api-keys-status", { body: {} })
    if (error) {
      throw new Error(await readSettingsErrorMessage(error, "Failed to load RAG retrieval settings"))
    }
    const ragSearch = readRagSearchSettings(data)
    if (!ragSearch) {
      throw new Error("Unexpected response while loading RAG retrieval settings")
    }
    return ragSearch
  }

  async upsert(input: Partial<RagSearchEditableSettings>): Promise<RagSearchSettings> {
    const { data, error } = await this.supabase.functions.invoke("api-keys-upsert", {
      body: input,
    })
    if (error) {
      throw new Error(await readSettingsErrorMessage(error, "Failed to save RAG retrieval settings"))
    }
    const ragSearch = readRagSearchSettings(data)
    if (!ragSearch) {
      throw new Error("Unexpected response while saving RAG retrieval settings")
    }
    return ragSearch
  }
}
