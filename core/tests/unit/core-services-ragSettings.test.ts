import { resolveRagIndexingSettings } from "@core/rag/indexingSettings"
import { resolveRagSearchSettings } from "@core/rag/searchSettings"
import { RagIndexSettingsService } from "@core/services/ragIndexSettings"
import { RagSearchSettingsService } from "@core/services/ragSearchSettings"

describe("core/services/rag settings", () => {
  it("accepts indexing settings payloads that omit embedding_model", async () => {
    const statusPayload = structuredClone(resolveRagIndexingSettings(null)) as Record<string, unknown>
    delete statusPayload.embedding_model

    const invoke = jest.fn().mockResolvedValue({
      data: { ragIndexing: statusPayload },
      error: null,
    })
    const service = new RagIndexSettingsService({ functions: { invoke } } as never)

    await expect(service.getStatus()).resolves.toEqual(resolveRagIndexingSettings(null))
  })

  it("accepts search settings payloads that omit embedding_model", async () => {
    const statusPayload = {
      ...resolveRagSearchSettings(null),
    } as Record<string, unknown>
    delete statusPayload.embedding_model

    const invoke = jest.fn().mockResolvedValue({
      data: { ragSearch: statusPayload },
      error: null,
    })
    const service = new RagSearchSettingsService({ functions: { invoke } } as never)

    await expect(service.getStatus()).resolves.toEqual(resolveRagSearchSettings(null))
  })
})
