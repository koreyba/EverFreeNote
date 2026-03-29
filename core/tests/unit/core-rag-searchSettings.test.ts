import {
  assertValidRagSearchEditableSettings,
  resolveRagSearchEditableSettings,
  resolveRagSearchSettings,
  RAG_SEARCH_EDITABLE_DEFAULTS,
} from "@core/rag/searchSettings"

describe("core/rag/searchSettings", () => {
  it("returns defaults plus read-only settings when no editable overrides exist", () => {
    const settings = resolveRagSearchSettings()

    expect(settings.top_k).toBe(RAG_SEARCH_EDITABLE_DEFAULTS.top_k)
    expect(settings.similarity_threshold).toBe(RAG_SEARCH_EDITABLE_DEFAULTS.similarity_threshold)
    expect(settings.output_dimensionality).toBe(1536)
    expect(settings.task_type_document).toBe("RETRIEVAL_DOCUMENT")
    expect(settings.task_type_query).toBe("RETRIEVAL_QUERY")
    expect(settings.offset_delta_threshold).toBe(300)
  })

  it("falls back to defaults when editable overrides are explicitly undefined", () => {
    const settings = resolveRagSearchEditableSettings({
      top_k: undefined,
      similarity_threshold: undefined,
    })

    expect(settings.top_k).toBe(RAG_SEARCH_EDITABLE_DEFAULTS.top_k)
    expect(settings.similarity_threshold).toBe(RAG_SEARCH_EDITABLE_DEFAULTS.similarity_threshold)
  })

  it("rejects top_k values outside the allowed range", () => {
    expect(() => assertValidRagSearchEditableSettings({ top_k: 0 })).toThrow(
      "top_k must be between 1 and 100"
    )
    expect(() => assertValidRagSearchEditableSettings({ top_k: 101 })).toThrow(
      "top_k must be between 1 and 100"
    )
  })

  it("rejects non-integer top_k values", () => {
    expect(() => assertValidRagSearchEditableSettings({ top_k: 15.5 })).toThrow(
      "top_k must be an integer"
    )
  })

  it("rejects thresholds outside the allowed range", () => {
    expect(() => assertValidRagSearchEditableSettings({ similarity_threshold: -0.01 })).toThrow(
      "similarity_threshold must be between 0 and 1"
    )
    expect(() => assertValidRagSearchEditableSettings({ similarity_threshold: 1.01 })).toThrow(
      "similarity_threshold must be between 0 and 1"
    )
  })

  it("rejects thresholds that do not align to the slider step", () => {
    expect(() => assertValidRagSearchEditableSettings({ similarity_threshold: 0.531 })).toThrow(
      "similarity_threshold must increment by 0.05"
    )
  })

  it("rejects NaN thresholds", () => {
    expect(() => assertValidRagSearchEditableSettings({ similarity_threshold: Number.NaN })).toThrow(
      "similarity_threshold must be a number"
    )
  })

  it("accepts valid settings and returns resolved values", () => {
    expect(
      assertValidRagSearchEditableSettings({
        top_k: 20,
        similarity_threshold: 0.6,
      })
    ).toEqual({
      top_k: 20,
      similarity_threshold: 0.6,
    })
  })
})
