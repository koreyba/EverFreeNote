import { parseRagIndexResult } from "@core/rag/indexResult"

describe("parseRagIndexResult", () => {
  it("falls back to unknown for non-object payloads", () => {
    expect(parseRagIndexResult(null)).toEqual({
      outcome: "unknown",
      message: "Indexing returned an empty response.",
      debugChunks: [],
    })
  })

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

  it("keeps the full debug chunk shape returned by the edge function", () => {
    expect(parseRagIndexResult({
      outcome: "indexed",
      chunkCount: 1,
      debugChunks: [{
        chunkIndex: 0,
        charOffset: 12,
        sectionHeading: "Heading",
        title: "Title",
        content: "Chunk content",
        bodyContent: "Body content",
        overlapPrefix: "Overlap",
      }],
    })).toEqual({
      outcome: "indexed",
      chunkCount: 1,
      droppedChunks: 0,
      message: null,
      debugChunks: [{
        chunkIndex: 0,
        charOffset: 12,
        sectionHeading: "Heading",
        title: "Title",
        content: "Chunk content",
        bodyContent: "Body content",
        overlapPrefix: "Overlap",
      }],
    })
  })

  it("drops invalid debug chunks while preserving valid ones", () => {
    expect(parseRagIndexResult({
      outcome: "indexed",
      chunkCount: 1,
      debugChunks: [
        {
          chunkIndex: 0,
          charOffset: 12,
          sectionHeading: "Heading",
          title: "Title",
          content: "Chunk content",
          bodyContent: "Body content",
          overlapPrefix: null,
        },
        {
          chunkIndex: 1,
          charOffset: 18,
          sectionHeading: "Heading",
          title: "Title",
          content: "Chunk content",
        },
      ],
    })).toEqual({
      outcome: "indexed",
      chunkCount: 1,
      droppedChunks: 0,
      message: null,
      debugChunks: [{
        chunkIndex: 0,
        charOffset: 12,
        sectionHeading: "Heading",
        title: "Title",
        content: "Chunk content",
        bodyContent: "Body content",
        overlapPrefix: null,
      }],
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

  it("treats indexed payloads without chunks as unknown", () => {
    expect(parseRagIndexResult({
      outcome: "indexed",
      chunkCount: 0,
      message: "No chunks created",
    })).toEqual({
      outcome: "unknown",
      message: "No chunks created",
      debugChunks: [],
    })
  })
})
