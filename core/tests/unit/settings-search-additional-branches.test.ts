import { resolveRagIndexingSettings } from "@core/rag/indexingSettings"
import { resolveRagSearchSettings } from "@core/rag/searchSettings"
import { SearchService } from "@core/services/search"
import { RagIndexSettingsService } from "@core/services/ragIndexSettings"
import { RagSearchSettingsService } from "@core/services/ragSearchSettings"
import { readSettingsErrorMessage, SETTINGS_SERVICE_UNAVAILABLE_MESSAGE } from "@core/services/settingsErrorMessage"
import { WordPressSettingsService } from "@core/services/wordpressSettings"

const serviceWithInvoke = (invoke: jest.Mock) => ({ functions: { invoke } }) as never

describe("additional settings and search branches", () => {
  describe("WordPressSettingsService", () => {
    it("sends status and upsert requests with their respective payloads", async () => {
      const invoke = jest.fn()
        .mockResolvedValueOnce({ data: { configured: false, integration: null }, error: null })
        .mockResolvedValueOnce({ data: { configured: true, integration: null }, error: null })
      const service = new WordPressSettingsService(serviceWithInvoke(invoke))
      const input = {
        siteUrl: "https://example.test",
        wpUsername: "editor",
        applicationPassword: "app-password",
        enabled: true,
      }

      await expect(service.getStatus()).resolves.toEqual({ configured: false, integration: null })
      await expect(service.upsert(input)).resolves.toEqual({ configured: true, integration: null })

      expect(invoke).toHaveBeenNthCalledWith(1, "wordpress-settings-status", { body: {} })
      expect(invoke).toHaveBeenNthCalledWith(2, "wordpress-settings-upsert", { body: input })
    })

    it("preserves Error messages and uses fallbacks for non-Error failures", async () => {
      const invoke = jest.fn()
        .mockResolvedValueOnce({ data: null, error: new Error("settings endpoint failed") })
        .mockResolvedValueOnce({ data: null, error: { message: "ignored without context" } })
        .mockResolvedValueOnce({ data: null, error: new Error("save endpoint failed") })
        .mockResolvedValueOnce({ data: null, error: {} })
      const service = new WordPressSettingsService(serviceWithInvoke(invoke))

      await expect(service.getStatus()).rejects.toThrow("settings endpoint failed")
      await expect(service.getStatus()).rejects.toThrow("Failed to load WordPress settings")
      await expect(service.upsert({ siteUrl: "https://example.test", wpUsername: "editor", enabled: false }))
        .rejects.toThrow("save endpoint failed")
      await expect(service.upsert({ siteUrl: "https://example.test", wpUsername: "editor", enabled: false }))
        .rejects.toThrow("Failed to save WordPress settings")
    })
  })

  describe("RAG settings services", () => {
    it("rejects invalid indexing payloads, including readonly array mismatches", async () => {
      const invoke = jest.fn()
      const service = new RagIndexSettingsService(serviceWithInvoke(invoke))
      const valid = resolveRagIndexingSettings()
      const invalidPayloads = [
        null,
        { ragIndexing: null },
        { ragIndexing: { ...valid, min_chunk_size: 6000 } },
        { ragIndexing: { ...valid, fallback_split_order: ["tokens_or_characters"] } },
        { ragIndexing: { ...valid, unexpected: true } },
      ]

      for (const data of invalidPayloads) {
        invoke.mockResolvedValueOnce({ data, error: null })
        await expect(service.getStatus()).rejects.toThrow("Unexpected response while loading RAG indexing settings")
      }
    })

    it("rejects invalid search payloads and maps context errors", async () => {
      const invoke = jest.fn()
      const service = new RagSearchSettingsService(serviceWithInvoke(invoke))
      const valid = resolveRagSearchSettings()

      for (const data of [
        null,
        { ragSearch: null },
        { ragSearch: { ...valid, top_k: 0 } },
        { ragSearch: { ...valid, slider_step: 0.1 } },
        { ragSearch: { ...valid, unexpected: true } },
      ]) {
        invoke.mockResolvedValueOnce({ data, error: null })
        await expect(service.upsert(valid)).rejects.toThrow("Unexpected response while saving RAG retrieval settings")
      }

      invoke.mockResolvedValueOnce({
        data: null,
        error: { context: { status: 504, json: jest.fn().mockResolvedValue({}) } },
      })
      await expect(service.getStatus()).rejects.toThrow(SETTINGS_SERVICE_UNAVAILABLE_MESSAGE)
    })
  })

  describe("settings error messages", () => {
    it("recognizes each unavailable HTTP status and network payload message", async () => {
      for (const status of [502, 504]) {
        await expect(readSettingsErrorMessage({ context: { status, json: jest.fn().mockResolvedValue({}) } }, "fallback"))
          .resolves.toBe(SETTINGS_SERVICE_UNAVAILABLE_MESSAGE)
      }

      await expect(readSettingsErrorMessage({ context: { status: 400, json: jest.fn().mockResolvedValue({ msg: "fetch failed" }) } }, "fallback"))
        .resolves.toBe(SETTINGS_SERVICE_UNAVAILABLE_MESSAGE)
      await expect(readSettingsErrorMessage({ context: { status: 400, json: jest.fn().mockResolvedValue({ message: "action required" }) } }, "fallback"))
        .resolves.toBe("action required")
    })
  })

  describe("SearchService", () => {
    it("uses inferred totals and normalizes missing description/headline/content", async () => {
      const rpc = jest.fn().mockResolvedValue({
        data: [{ id: "note-1", title: "Title", rank: 0.7, headline: null, content: null }],
        error: null,
      })
      const supabase = { rpc, from: jest.fn() } as never
      const result = await new SearchService(supabase).searchNotes("user-1", "hello", { offset: 4 })

      expect(result).toEqual({
        results: [{
          id: "note-1",
          title: "Title",
          user_id: "user-1",
          description: "",
          rank: 0.7,
          headline: null,
          content: null,
        }],
        total: 5,
        method: "fts",
      })
      expect(rpc).toHaveBeenCalledWith("search_notes_fts", expect.objectContaining({
        result_offset: 4,
        filter_tag: null,
      }))
    })

    it("falls back with null data and reports non-Error database failures", async () => {
      const rpc = jest.fn().mockResolvedValue({ data: null, error: null })
      const order = jest.fn().mockResolvedValue({ data: null, error: { code: "DB_FAILURE" } })
      const query = {
        select: jest.fn().mockReturnThis(),
        eq: jest.fn().mockReturnThis(),
        or: jest.fn().mockReturnThis(),
        range: jest.fn().mockReturnThis(),
        order,
      }
      const supabase = { rpc, from: jest.fn().mockReturnValue(query) } as never

      const result = await new SearchService(supabase).searchNotes("user-1", "hello\"world")

      expect(result).toEqual({ results: [], total: 0, method: "fallback", error: "Unknown error occurred" })
      expect(query.or).toHaveBeenCalledWith('title.ilike."%helloworld%",description.ilike."%helloworld%"')
    })
  })
})
