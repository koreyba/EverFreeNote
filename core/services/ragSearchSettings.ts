import type { SupabaseClient } from "@supabase/supabase-js"

import {
  resolveRagSearchSettings,
  validateRagSearchEditableSettings,
  type RagSearchEditableSettings,
  type RagSearchSettings,
} from "@core/rag/searchSettings"
import type { ApiKeysStatus } from "@core/services/apiKeysSettings"
import { readSettingsErrorMessage } from "@core/services/settingsErrorMessage"

const readRagSearchSettings = (data: unknown): RagSearchSettings | null => {
  if (!data || typeof data !== "object") return null
  const ragSearch = (data as ApiKeysStatus).ragSearch
  if (!ragSearch || typeof ragSearch !== "object") return null

  const editableSettings = {
    top_k: (ragSearch as { top_k?: unknown }).top_k,
    similarity_threshold: (ragSearch as { similarity_threshold?: unknown }).similarity_threshold,
  } as Partial<RagSearchEditableSettings>

  if (validateRagSearchEditableSettings(editableSettings).length > 0) {
    return null
  }

  const resolvedSettings = resolveRagSearchSettings(editableSettings)
  const rawSettings = ragSearch as Record<string, unknown>
  const matchesResolvedShape = Object.entries(resolvedSettings).every(
    ([key, value]) => rawSettings[key] === value
  )

  return matchesResolvedShape ? resolvedSettings : null
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
