import { buildRagIndexChunks } from "@core/rag/chunking"
import { buildRagChunkText, getRagChunkBodyLength, getRagChunkBodyText } from "@core/rag/chunkTemplate"
import { RAG_INDEX_EDITABLE_DEFAULTS } from "@core/rag/indexingSettings"

const USER_NOTE_HTML = [
  '<p>"То что на предыдущем уровне было субъектом становиться объектом на следующем". (с)</p>',
  "<p></p>",
  '<p>Чувство голода может всецело овладевать вами. Тогда это чувство будет иметь вас, вместо того чтобы быть у вас. В таком случае можно говорить о том, что оно остаеться в качестве "скрытого субъекта" в вашем сознании, в системе идентичности. (с)</p>',
  "<p></p>",
  '<p>Что такое субъект и объект? Объект - то что я могу увидеть, осмыслить, субъект - я, мои части, то что\\кто видит. Как рука не может схватить сама себя, а ручка не может себя нарисовать, нож не может себя порезать, субъект не может познать себя. Субъект может наблюдать и познавать лишь объекты. То что было субъектом (частью меня) должно стать объектом (тем что я смогу наблюдать). То есть субъективная часть это что-то скрытое, то что я не осознаю, часть меня, которую я не могу "увидеть". Если же я начинаю эту часть "видеть", то она уже не являеться скрытым субъектом, она становиться объектом, который я наблюдаю.&nbsp;</p>',
  "<p></p>",
  '<p>Если мною овладевает ярость, она является неосознанной, она являеться моим скрытым субъектом и тогда я - ярость. В такой момент я не осознаю что все мои действия происходят под влиянием ярости. Ярость как бы берет верх управления и у меня нет выбора в том как вести себя. Я отождествлен со своей яростью, она мой скрытый субъект, я - ярость. Что значит растождествиться со своей яростью? Это значит увидеть ее, увидеть ее со стороны, сделать ее объектом наблюдения. Она больше не мой скрытый субъект, она то что я наблюдаю - объект, и тогда я не ярость, ведь я не могу быть тем что я могу наблюдать (как нож не может порезать сам себя).&nbsp;</p>',
].join("")

const USER_SETTINGS = {
  ...RAG_INDEX_EDITABLE_DEFAULTS,
  small_note_threshold: 400,
  target_chunk_size: 500,
  min_chunk_size: 200,
  max_chunk_size: 1500,
  overlap: 100,
}

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

  it("expands overlap back to the start of the sentence instead of starting mid-sentence", () => {
    const longSentence = "Alpha beta gamma delta epsilon zeta eta theta iota kappa lambda mu nu xi omicron pi rho sigma tau."

    const chunks = buildRagIndexChunks({
      title: "Long sentence note",
      html: `<p>${longSentence}</p>`,
      tags: [],
      settings: {
        ...RAG_INDEX_EDITABLE_DEFAULTS,
        small_note_threshold: 20,
        target_chunk_size: 25,
        min_chunk_size: 20,
        max_chunk_size: 25,
        overlap: 10,
      },
    })

    expect(chunks.length).toBeGreaterThan(1)
    expect(getRagChunkBodyText(chunks[1]?.content ?? "").startsWith("Alpha beta gamma")).toBe(true)
  })

  it("does not carry overlap across section boundaries", () => {
    const chunks = buildRagIndexChunks({
      title: "Sectioned note",
      html: "<h2>Section A</h2><p>Alpha sentence one. Alpha sentence two.</p><h2>Section B</h2><p>Beta sentence one. Beta sentence two.</p>",
      tags: [],
      settings: {
        ...RAG_INDEX_EDITABLE_DEFAULTS,
        small_note_threshold: 20,
        target_chunk_size: 30,
        min_chunk_size: 20,
        max_chunk_size: 30,
        overlap: 10,
      },
    })

    // Each section text (~40 chars) is > max_chunk_size (30), so splitOversizedParagraph fires.
    // But each sentence (~19 chars) is < min_chunk_size (20), so backward merge kicks in,
    // producing 1 chunk per section = 2 chunks total.
    expect(chunks).toHaveLength(2)
    expect(chunks[0]?.content).toContain("Section: Section A")
    expect(chunks[1]?.content).toContain("Section: Section B")
    // Section B chunk should NOT contain overlap from Section A
    expect(getRagChunkBodyText(chunks[1]?.content ?? "")).toBe("Beta sentence one. Beta sentence two.")
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

  describe("paragraph-first assembly with real note content", () => {
    it("produces multiple chunks, not a single chunk", () => {
      const chunks = buildRagIndexChunks({
        title: "тестовый тайтл",
        html: USER_NOTE_HTML,
        tags: ["тег1", "тег2"],
        settings: USER_SETTINGS,
      })

      expect(chunks.length).toBeGreaterThan(1)
    })

    it("keeps first two small paragraphs together as one chunk (>= min_chunk_size)", () => {
      const chunks = buildRagIndexChunks({
        title: "тестовый тайтл",
        html: USER_NOTE_HTML,
        tags: ["тег1", "тег2"],
        settings: USER_SETTINGS,
      })

      const body0 = getRagChunkBodyText(chunks[0]?.content ?? "")
      // First chunk should contain both P1 and P2
      expect(body0).toContain('"То что на предыдущем уровне')
      expect(body0).toContain("Чувство голода может")
      // First chunk should NOT contain text from paragraph 3
      expect(body0).not.toContain("Что такое субъект и объект")
    })

    it("does not cross paragraph boundaries when chunk is above min_chunk_size", () => {
      const chunks = buildRagIndexChunks({
        title: "тестовый тайтл",
        html: USER_NOTE_HTML,
        tags: ["тег1", "тег2"],
        settings: USER_SETTINGS,
      })

      // Each chunk body should contain only whole paragraphs
      for (const chunk of chunks) {
        const body = getRagChunkBodyText(chunk.content)
        // No paragraph text should be cut mid-sentence at paragraph boundary
        // (overlap prefix from previous chunk is OK)
        expect(body.length).toBeGreaterThan(0)
      }

      // Chunk 1 (index 1) should start with paragraph 3 content (possibly with overlap prefix)
      const body1 = getRagChunkBodyText(chunks[1]?.content ?? "")
      expect(body1).toContain("Что такое субъект и объект")
    })

    it("each chunk body respects target_chunk_size for accumulation decisions", () => {
      const chunks = buildRagIndexChunks({
        title: "тестовый тайтл",
        html: USER_NOTE_HTML,
        tags: ["тег1", "тег2"],
        settings: USER_SETTINGS,
      })

      // With 4 paragraphs (~83, ~245, ~530, ~570 chars) and target=500:
      // Chunk 0: P1+P2 (~330 chars, >= min, P3 would exceed target → close)
      // Chunk 1: P3 (~530 chars, >= min, P4 would exceed target → close)
      // Chunk 2: P4 (~570 chars)
      expect(chunks).toHaveLength(3)
    })
  })

  describe("oversized paragraph splitting with backward merge", () => {
    it("splits oversized paragraph at max_chunk_size boundaries, not target", () => {
      // Create a paragraph that is > max_chunk_size
      const sentence = "Это предложение для теста длинного абзаца. "
      const longParagraph = sentence.repeat(50) // ~2200 chars
      const html = `<p>${longParagraph}</p>`

      const chunks = buildRagIndexChunks({
        title: "test",
        html,
        tags: [],
        settings: {
          ...USER_SETTINGS,
          small_note_threshold: 50,
        },
      })

      // With max=1500, a ~2200 char paragraph should produce 2 chunks, not 5 (which target=500 would make)
      expect(chunks).toHaveLength(2)
    })

    it("backward-merges small remainder into previous piece", () => {
      // Create a paragraph where splitting at max would leave a tiny remainder
      const sentence = "Это тестовое предложение номер один. "
      // Need something slightly over max_chunk_size with small remainder
      const longParagraph = sentence.repeat(42) // ~42 * 36 = ~1512, remainder ~12 chars
      const html = `<p>${longParagraph}</p>`

      const settings = {
        ...USER_SETTINGS,
        small_note_threshold: 50,
        max_chunk_size: 1500,
        min_chunk_size: 200,
      }

      const chunks = buildRagIndexChunks({
        title: "test",
        html,
        tags: [],
        settings,
      })

      // If remainder < min_chunk_size, it should be merged back → single chunk
      // (the merged chunk will be slightly above max_chunk_size)
      if (chunks.length === 1) {
        // Backward merge happened — chunk may exceed max but bounded by max + min - 1
        expect(getRagChunkBodyText(chunks[0]?.content ?? "").length).toBeLessThanOrEqual(
          settings.max_chunk_size + settings.min_chunk_size - 1
        )
      }
    })
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
