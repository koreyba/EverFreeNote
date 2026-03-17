import {
  assertValidRagIndexingEditableSettings,
  resolveRagIndexingSettings,
  RAG_INDEX_EDITABLE_DEFAULTS,
} from "@core/rag/indexingSettings"

describe("core/rag/indexingSettings", () => {
  it("returns defaults plus read-only settings when no editable overrides exist", () => {
    const settings = resolveRagIndexingSettings()

    expect(settings.target_chunk_size).toBe(RAG_INDEX_EDITABLE_DEFAULTS.target_chunk_size)
    expect(settings.output_dimensionality).toBe(1536)
    expect(settings.task_type_document).toBe("RETRIEVAL_DOCUMENT")
    expect(settings.task_type_query).toBe("RETRIEVAL_QUERY")
  })

  it("rejects numeric values outside the allowed range", () => {
    expect(() => assertValidRagIndexingEditableSettings({ overlap: 5001 })).toThrow(
      "overlap must be between 50 and 5000"
    )
  })

  it("rejects invalid ordering for chunk sizes", () => {
    expect(() =>
      assertValidRagIndexingEditableSettings({
        min_chunk_size: 300,
        target_chunk_size: 200,
        max_chunk_size: 400,
      })
    ).toThrow("min_chunk_size must be less than or equal to target_chunk_size")

    expect(() =>
      assertValidRagIndexingEditableSettings({
        min_chunk_size: 100,
        target_chunk_size: 500,
        max_chunk_size: 400,
      })
    ).toThrow("target_chunk_size must be less than or equal to max_chunk_size")
  })

  it("rejects non-boolean flags", () => {
    expect(() =>
      assertValidRagIndexingEditableSettings({
        use_title: "yes" as unknown as boolean,
      })
    ).toThrow("use_title must be a boolean")
  })
})
