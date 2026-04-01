import { parseRagIndexResult } from "@core/rag/indexResult"

describe("parseRagIndexResult", () => {
  it("normalizes successful index payloads", () => {
    expect(parseRagIndexResult({
      outcome: "indexed",
      chunkCount: 3,
      droppedChunks: 1,
    })).toEqual({
      outcome: "indexed",
      chunkCount: 3,
      droppedChunks: 1,
      message: null,
      debugChunks: [],
    })
  })

  it("normalizes skipped too-short payloads", () => {
    expect(parseRagIndexResult({
      outcome: "skipped",
      reason: "too_short",
      chunkCount: 0,
      message: "Note is too short for indexing",
    })).toEqual({
      outcome: "skipped",
      reason: "too_short",
      chunkCount: 0,
      message: "Note is too short for indexing",
      debugChunks: [],
    })
  })

  it("supports legacy skipped payloads", () => {
    expect(parseRagIndexResult({
      chunkCount: 0,
      skipped: "too_short",
      message: "Too short",
    })).toEqual({
      outcome: "skipped",
      reason: "too_short",
      chunkCount: 0,
      message: "Too short",
      debugChunks: [],
    })
  })

  it("supports delete payloads", () => {
    expect(parseRagIndexResult({ deleted: true })).toEqual({
      outcome: "deleted",
      message: null,
      debugChunks: [],
    })
  })

  it("treats zero chunks without skipped reason as unknown", () => {
    expect(parseRagIndexResult({ chunkCount: 0, message: "No chunks" })).toEqual({
      outcome: "unknown",
      message: "No chunks",
      debugChunks: [],
    })
  })
})
