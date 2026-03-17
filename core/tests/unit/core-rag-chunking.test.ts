import { buildRagIndexChunks } from "@core/rag/chunking"
import { buildRagChunkText, getRagChunkBodyLength, getRagChunkBodyText } from "@core/rag/chunkTemplate"
import { RAG_INDEX_EDITABLE_DEFAULTS } from "@core/rag/indexingSettings"

describe("core/rag/chunking", () => {
  it("keeps a small note as a single chunk", () => {
    const chunks = buildRagIndexChunks({
      title: "Weekly plan",
      html: "<p>Short body text.</p>",
      tags: ["work"],
      settings: RAG_INDEX_EDITABLE_DEFAULTS,
    })

    expect(chunks).toHaveLength(1)
    expect(chunks[0]?.content).toContain("Tags: work")
    expect(chunks[0]?.content).toContain("Short body text.")
    expect(chunks[0]?.title).toBe("Weekly plan")
  })

  it("splits large paragraphs and adds overlap to later chunks", () => {
    const repeated = "Sentence one. Sentence two. Sentence three. Sentence four. Sentence five."
    const html = `<h2>Section A</h2><p>${repeated} ${repeated} ${repeated}</p>`

    const chunks = buildRagIndexChunks({
      title: "Long note",
      html,
      tags: ["alpha", "beta"],
      settings: {
        ...RAG_INDEX_EDITABLE_DEFAULTS,
        small_note_threshold: 50,
        target_chunk_size: 80,
        min_chunk_size: 50,
        max_chunk_size: 90,
        overlap: 50,
      },
    })

    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks[0]?.content).toContain("Section: Section A")
    expect(chunks[1]?.content).toContain("Sentence")
    expect(chunks[1]?.charOffset).toBeGreaterThan(chunks[0]?.charOffset ?? 0)
  })

  it("omits empty optional lines from the chunk template", () => {
    const text = buildRagChunkText({
      sectionHeading: null,
      tags: [],
      chunkContent: "Body only",
      settings: {
        use_section_headings: true,
        use_tags: true,
      },
    })

    expect(text).toBe("Body only")
  })

  it("extracts the note body from templated chunk content", () => {
    const text = buildRagChunkText({
      sectionHeading: "Section A",
      tags: ["alpha", "beta"],
      chunkContent: "Body only",
      settings: {
        use_section_headings: true,
        use_tags: true,
      },
    })

    expect(getRagChunkBodyText(text)).toBe("Body only")
    expect(getRagChunkBodyLength(text)).toBe("Body only".length)
  })

  it("does not create sections from non-heading formatting alone", () => {
    const chunks = buildRagIndexChunks({
      title: "Formatting note",
      html: "<p><strong>Looks like a heading</strong></p><p>Paragraph text.</p>",
      tags: [],
      settings: {
        ...RAG_INDEX_EDITABLE_DEFAULTS,
        small_note_threshold: 50,
        target_chunk_size: 30,
        min_chunk_size: 20,
        max_chunk_size: 30,
        overlap: 10,
      },
    })

    expect(chunks[0]?.content).not.toContain("Section:")
  })
})
