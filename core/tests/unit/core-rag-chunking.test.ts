import { buildRagIndexChunks } from "@core/rag/chunking"
import { buildRagChunkText, getRagChunkBodyText } from "@core/rag/chunkTemplate"
import { RAG_INDEX_EDITABLE_DEFAULTS, type RagIndexingEditableSettings } from "@core/rag/indexingSettings"

// --- Helpers ---

const p = (text: string) => `<p>${text}</p>`

const cfg = (overrides: Partial<RagIndexingEditableSettings> = {}): RagIndexingEditableSettings => ({
  ...RAG_INDEX_EDITABLE_DEFAULTS,
  ...overrides,
})

/** Solid text of exactly n chars — no spaces or periods (character-level fallback) */
const solid = (n: number) => "x".repeat(n)

// --- Real note fixture ---

const USER_NOTE_HTML = [
  '<p>"То что на предыдущем уровне было субъектом становиться объектом на следующем". (с)</p>',
  "<p></p>",
  '<p>Чувство голода может всецело овладевать вами. Тогда это чувство будет иметь вас, вместо того чтобы быть у вас. В таком случае можно говорить о том, что оно остаеться в качестве "скрытого субъекта" в вашем сознании, в системе идентичности. (с)</p>',
  "<p></p>",
  '<p>Что такое субъект и объект? Объект - то что я могу увидеть, осмыслить, субъект - я, мои части, то что\\кто видит. Как рука не может схватить сама себя, а ручка не может себя нарисовать, нож не может себя порезать, субъект не может познать себя. Субъект может наблюдать и познавать лишь объекты. То что было субъектом (частью меня) должно стать объектом (тем что я смогу наблюдать). То есть субъективная часть это что-то скрытое, то что я не осознаю, часть меня, которую я не могу "увидеть". Если же я начинаю эту часть "видеть", то она уже не являеться скрытым субъектом, она становиться объектом, который я наблюдаю.&nbsp;</p>',
  "<p></p>",
  '<p>Если мною овладевает ярость, она является неосознанной, она являеться моим скрытым субъектом и тогда я - ярость. В такой момент я не осознаю что все мои действия происходят под влиянием ярости. Ярость как бы берет верх управления и у меня нет выбора в том как вести себя. Я отождествлен со своей яростью, она мой скрытый субъект, я - ярость. Что значит растождествиться со своей яростью? Это значит увидеть ее, увидеть ее со стороны, сделать ее объектом наблюдения. Она больше не мой скрытый субъект, она то что я наблюдаю - объект, и тогда я не ярость, ведь я не могу быть тем что я могу наблюдать (как нож не может порезать сам себя).&nbsp;</p>',
].join("")

const USER_SETTINGS = cfg({
  target_chunk_size: 500,
  min_chunk_size: 200,
  max_chunk_size: 1500,
  overlap: 100,
})

// ============================================================

describe("core/rag/chunking — pairwise test suite", () => {
  // ── A: Порог индексации ──────────────────────────────────
  describe("A — Порог индексации", () => {
    it("A1: заметка < min → 0 чанков", () => {
      const chunks = buildRagIndexChunks({
        title: "Note",
        html: p("Short."),
        tags: [],
        settings: cfg(), // min=200, text ~6 chars
      })
      expect(chunks).toHaveLength(0)
    })

    it("A2: заметка = min → 1 чанк", () => {
      const chunks = buildRagIndexChunks({
        title: "Exact",
        html: p(solid(200)),
        tags: ["t1"],
        settings: cfg(),
      })
      expect(chunks).toHaveLength(1)
      expect(chunks[0]!.title).toBe("Exact")
      expect(chunks[0]!.content).toContain("Tags: t1")
    })
  })

  // ── B: Paragraph-first аккумуляция ───────────────────────
  describe("B — Paragraph-first аккумуляция", () => {
    it("B2: 3 мелких абзаца, сумма ≤ target → 1 чанк", () => {
      // 80 + \n\n + 80 + \n\n + 80 = 244. min=150, target=500
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(80)) + p(solid(80)) + p(solid(80)),
        tags: [],
        settings: cfg({ min_chunk_size: 150, target_chunk_size: 500, max_chunk_size: 1500 }),
      })
      expect(chunks).toHaveLength(1)
    })

    it("B3: P1+P2 ≥ min, +P3 > target → 2 чанка (не добавляем даже если ≤ max)", () => {
      // P1+P2 = 80+2+80 = 162 ≥ min=150. +P3: 162+2+400 = 564 > target=500
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(80)) + p(solid(80)) + p(solid(400)),
        tags: [],
        settings: cfg({ min_chunk_size: 150, target_chunk_size: 500, max_chunk_size: 1500 }),
      })
      expect(chunks).toHaveLength(2)
    })
  })

  // ── C: Partial split ─────────────────────────────────────
  describe("C — Partial split", () => {
    it("C1: P1 < min, P2 ≤ max, P1+P2 > max → частичный разрез P2", () => {
      // P1=100 < min=200. P2=1450 ≤ max=1500. Combined=100+2+1450=1552 > max
      // → takePartialText отрезает от P2 ровно столько, сколько нужно до min
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(100)) + p(solid(1450)),
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0 }),
      })
      expect(chunks.length).toBeGreaterThanOrEqual(2)
      const body0 = getRagChunkBodyText(chunks[0]!.content)
      expect(body0.length).toBeGreaterThanOrEqual(200) // reached min via partial
    })
  })

  // ── D: Oversized paragraph + backward merge ──────────────
  describe("D — Oversized paragraph + backward merge", () => {
    it("D4: абзац max+min-2 символов → backward merge → 1 чанк (≤ max+min-1)", () => {
      // solid(1698) → char split [1500, 198]. 198 < min=200 → merge.
      // Merged: 1500 + " " + 198 = 1699 = max+min-1
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(1698)),
        tags: [],
        settings: cfg({ overlap: 0 }),
      })
      expect(chunks).toHaveLength(1)
      const bodyLen = getRagChunkBodyText(chunks[0]!.content).length
      expect(bodyLen).toBeLessThanOrEqual(1500 + 200 - 1)
    })

    it("D5: абзац max+min символов → remainder ≥ min → 2 чанка (без merge)", () => {
      // solid(1700) → char split [1500, 200]. 200 ≥ min=200 → NO merge
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(1700)),
        tags: [],
        settings: cfg({ overlap: 0 }),
      })
      expect(chunks).toHaveLength(2)
    })

    it("D7: oversized из предложений → разрез по границам предложений", () => {
      // 6 sentences × ~296 chars = ~1781 > max=1500
      const sentenceText = Array.from({ length: 6 }, (_, i) =>
        `Sent${i} ${"z".repeat(286)}.`
      ).join(" ")

      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(sentenceText),
        tags: [],
        settings: cfg({ overlap: 0 }),
      })
      expect(chunks.length).toBeGreaterThan(1)
      // Each chunk ends at a sentence boundary (period)
      for (const chunk of chunks) {
        expect(getRagChunkBodyText(chunk.content).trimEnd().endsWith(".")).toBe(true)
      }
    })
  })

  // ── E: Trailing undersized merge ─────────────────────────
  describe("E — Trailing undersized merge", () => {
    it("E1: trailing < min, merge ≤ max → merge происходит", () => {
      // P1=300, P2=400, P3=100. Assembly: [300], [400], [100].
      // mergeUndersizedTail: 100 < min=200, merged=400+2+100=502 ≤ max=1500 → merge
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(300)) + p(solid(400)) + p(solid(100)),
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0 }),
      })
      expect(chunks).toHaveLength(2) // [P1], [P2+P3]
    })

    it("E3: trailing < min, merge > max → остаётся undersized", () => {
      // P1=300, P2=1400, P3=150. Assembly: [300], [1400], [150].
      // mergeUndersizedTail: 150 < min=200, merged=1400+2+150=1552 > max=1500 → NO merge
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(300)) + p(solid(1400)) + p(solid(150)),
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0 }),
      })
      expect(chunks).toHaveLength(3)
      const lastBody = getRagChunkBodyText(chunks[2]!.content)
      expect(lastBody.length).toBeLessThan(200)
    })

    it("E4: trailing из другой секции → merge запрещён", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<h2>A</h2>${p(solid(300))}<h2>B</h2>${p(solid(100))}`,
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0 }),
      })
      expect(chunks).toHaveLength(2)
      expect(chunks[0]!.sectionHeading).toBe("A")
      expect(chunks[1]!.sectionHeading).toBe("B")
    })
  })

  // ── F: Секции и заголовки ────────────────────────────────
  describe("F — Секции и заголовки", () => {
    it("F1: две секции h2 → разрыв чанка на границе секций", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<h2>Alpha</h2>${p(solid(250))}<h2>Beta</h2>${p(solid(250))}`,
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 500, max_chunk_size: 1500, overlap: 0 }),
      })
      expect(chunks).toHaveLength(2)
      expect(chunks[0]!.sectionHeading).toBe("Alpha")
      expect(chunks[1]!.sectionHeading).toBe("Beta")
    })

    it("F2: абзац после heading наследует его sectionHeading", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<h2>Title</h2>${p(solid(250))}${p(solid(250))}`,
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 400, max_chunk_size: 1500, overlap: 0 }),
      })
      // P1+P2 = 250+2+250 = 502 > target=400 → 2 chunks, both inherit heading
      expect(chunks).toHaveLength(2)
      for (const chunk of chunks) {
        expect(chunk.sectionHeading).toBe("Title")
      }
    })

    it("F3: <strong> не создаёт секцию", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<p><strong>Bold text</strong></p>${p(solid(250))}`,
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 500, max_chunk_size: 1500 }),
      })
      for (const chunk of chunks) {
        expect(chunk.sectionHeading).toBeNull()
        expect(chunk.content).not.toContain("Section:")
      }
    })
  })

  // ── G: Overlap ───────────────────────────────────────────
  describe("G — Overlap", () => {
    it("G1: overlap=0 → нет overlap текста", () => {
      // Two paragraphs, each ≥ min, sum > target → 2 chunks
      const p1 = "Alpha " + solid(244) + "." // 251 chars
      const p2 = "Bravo " + solid(244) + "." // 251 chars

      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(p1) + p(p2),
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 250, max_chunk_size: 1500, overlap: 0 }),
      })
      expect(chunks).toHaveLength(2)
      const body1 = getRagChunkBodyText(chunks[1]!.content)
      expect(body1).not.toContain("Alpha")
    })

    it("G2: overlap=100 → предпочитает границу предложения", () => {
      // P1 has sentences; overlap should snap to sentence boundary
      const p1Text = "First " + solid(100) + ". Middle " + solid(80) + ". Ending sentence here."
      // Positions of periods: ~106, ~195, ~217. With overlap=100, snap to "." at ~106
      const p2Text = "Second paragraph " + solid(200) + "."

      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(p1Text) + p(p2Text),
        tags: [],
        settings: cfg({ min_chunk_size: 50, target_chunk_size: 150, max_chunk_size: 1500, overlap: 100 }),
      })
      expect(chunks).toHaveLength(2)
      const body1 = getRagChunkBodyText(chunks[1]!.content)
      // Overlap prefix starts at sentence boundary and contains "Ending sentence here."
      expect(body1).toContain("Ending sentence here.")
    })

    it("G3: overlap > длины предыдущего чанка → берёт весь текст", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(80)) + p(solid(300)),
        tags: [],
        settings: cfg({ min_chunk_size: 50, target_chunk_size: 80, max_chunk_size: 1500, overlap: 200 }),
      })
      expect(chunks).toHaveLength(2)
      const body1 = getRagChunkBodyText(chunks[1]!.content)
      // Entire first chunk text is used as overlap prefix
      expect(body1).toContain(solid(80))
    })

    it("G4: overlap между секциями → не применяется", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<h2>A</h2>${p(solid(250))}<h2>B</h2>${p(solid(250))}`,
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 500, max_chunk_size: 1500, overlap: 100 }),
      })
      expect(chunks).toHaveLength(2)
      const body1 = getRagChunkBodyText(chunks[1]!.content)
      // Section B should NOT have overlap from section A
      expect(body1).toBe(solid(250))
    })
  })

  // ── H: Chunk template ────────────────────────────────────
  describe("H — Chunk template", () => {
    it("H1: section + tags + content → полный шаблон", () => {
      const text = buildRagChunkText({
        sectionHeading: "Intro",
        tags: ["a", "b"],
        chunkContent: "Body text",
        settings: { use_section_headings: true, use_tags: true },
      })
      expect(text).toBe("Section: Intro\nTags: a, b\n\nBody text")
    })

    it("H2: heading=null → строка Section: опущена", () => {
      const text = buildRagChunkText({
        sectionHeading: null,
        tags: ["a"],
        chunkContent: "Body text",
        settings: { use_section_headings: true, use_tags: true },
      })
      expect(text).toBe("Tags: a\n\nBody text")
      expect(text).not.toContain("Section:")
    })

    it("H4: heading есть, use_section_headings=false → Section: скрыта", () => {
      const text = buildRagChunkText({
        sectionHeading: "Heading",
        tags: [],
        chunkContent: "Body",
        settings: { use_section_headings: false, use_tags: true },
      })
      expect(text).not.toContain("Section:")
      expect(text).toBe("Body")
    })

    it("H5: tags есть, use_tags=false → Tags: скрыта", () => {
      const text = buildRagChunkText({
        sectionHeading: null,
        tags: ["x", "y"],
        chunkContent: "Body",
        settings: { use_section_headings: true, use_tags: false },
      })
      expect(text).not.toContain("Tags:")
      expect(text).toBe("Body")
    })

    it("H7: use_title=true → title передаётся", () => {
      const chunks = buildRagIndexChunks({
        title: "My Note",
        html: p(solid(200)),
        tags: [],
        settings: cfg({ use_title: true }),
      })
      expect(chunks[0]!.title).toBe("My Note")
    })

    it("H8: use_title=false → title = null", () => {
      const chunks = buildRagIndexChunks({
        title: "My Note",
        html: p(solid(200)),
        tags: [],
        settings: cfg({ use_title: false }),
      })
      expect(chunks[0]!.title).toBeNull()
    })
  })

  // ── I: Cross-factor pairwise ─────────────────────────────
  describe("I — Cross-factor pairwise", () => {
    it("I1: oversized в секции A + абзац в B + overlap → overlap не пересекает секцию", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<h2>A</h2>${p(solid(2000))}<h2>B</h2>${p(solid(300))}`,
        tags: [],
        settings: cfg({ min_chunk_size: 200, target_chunk_size: 500, max_chunk_size: 1500, overlap: 100 }),
      })
      // Section A splits into oversized chunks; section B is separate
      const sectionBChunk = chunks[chunks.length - 1]!
      expect(sectionBChunk.sectionHeading).toBe("B")
      // Section B must NOT have overlap from section A
      expect(getRagChunkBodyText(sectionBChunk.content)).toBe(solid(300))
    })

    it("I2: узкие настройки (min≈target≈max) → форсируют partial split", () => {
      // P1=80 < min=100. P2=80: combined=80+2+80=162 > max=120 → partial split P2
      const chunks = buildRagIndexChunks({
        title: "t",
        html: p(solid(80)) + p(solid(80)),
        tags: [],
        settings: cfg({ min_chunk_size: 100, target_chunk_size: 110, max_chunk_size: 120, overlap: 0 }),
      })
      expect(chunks.length).toBeGreaterThanOrEqual(2)
      const body0 = getRagChunkBodyText(chunks[0]!.content)
      expect(body0.length).toBeGreaterThanOrEqual(100)
      expect(body0.length).toBeLessThanOrEqual(120)
    })
  })

  // ── J: HTML parsing ──────────────────────────────────────
  describe("J — HTML parsing", () => {
    it("J1: nested <div> с <p> → отдельные блоки", () => {
      // 150+2+150=302 > target=200, P1=150 ≥ min=100 → 2 chunks
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<div><p>${solid(150)}</p><p>${solid(150)}</p></div>`,
        tags: [],
        settings: cfg({ min_chunk_size: 100, target_chunk_size: 200, max_chunk_size: 1500, overlap: 0 }),
      })
      expect(chunks).toHaveLength(2)
    })

    it("J2: <li> элементы → отдельные блоки", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<ul><li>${solid(150)}</li><li>${solid(150)}</li></ul>`,
        tags: [],
        settings: cfg({ min_chunk_size: 100, target_chunk_size: 200, max_chunk_size: 1500, overlap: 0 }),
      })
      expect(chunks).toHaveLength(2)
    })

    it("J4: <ol> нумерованный список → нумерация сохраняется в тексте", () => {
      // Tiptap/ProseMirror wraps list item content in <p> tags
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<ol><li><p>First item</p></li><li><p>Second item</p></li><li><p>Third item</p></li></ol>`,
        tags: [],
        settings: cfg({ min_chunk_size: 20, target_chunk_size: 500, max_chunk_size: 1500 }),
      })
      expect(chunks).toHaveLength(1)
      const body = getRagChunkBodyText(chunks[0]!.content)
      expect(body).toContain("1. First item")
      expect(body).toContain("2. Second item")
      expect(body).toContain("3. Third item")
    })

    it("J5: <ul> маркированный список → маркеры сохраняются в тексте", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: `<ul><li><p>First item</p></li><li><p>Second item</p></li><li><p>Third item</p></li></ul>`,
        tags: [],
        settings: cfg({ min_chunk_size: 20, target_chunk_size: 500, max_chunk_size: 1500 }),
      })
      expect(chunks).toHaveLength(1)
      const body = getRagChunkBodyText(chunks[0]!.content)
      expect(body).toContain("- First item")
      expect(body).toContain("- Second item")
      expect(body).toContain("- Third item")
    })

    it("J3: <br> внутри <p> → один блок (не разделяет на параграфы)", () => {
      const chunks = buildRagIndexChunks({
        title: "t",
        html: "<p>Line one<br>Line two<br>Line three</p>",
        tags: [],
        settings: cfg({ min_chunk_size: 20, target_chunk_size: 500, max_chunk_size: 1500 }),
      })
      expect(chunks).toHaveLength(1)
      const body = getRagChunkBodyText(chunks[0]!.content)
      expect(body).toContain("Line one")
      expect(body).toContain("Line three")
    })
  })

  // ── Regression: реальная заметка ─────────────────────────
  describe("Regression — реальная заметка (4 абзаца, русский текст)", () => {
    it("создаёт несколько чанков, не один", () => {
      const chunks = buildRagIndexChunks({
        title: "тестовый тайтл",
        html: USER_NOTE_HTML,
        tags: ["тег1", "тег2"],
        settings: USER_SETTINGS,
      })
      expect(chunks.length).toBeGreaterThan(1)
    })

    it("объединяет два первых мелких абзаца в один чанк (≥ min)", () => {
      const chunks = buildRagIndexChunks({
        title: "тестовый тайтл",
        html: USER_NOTE_HTML,
        tags: ["тег1", "тег2"],
        settings: USER_SETTINGS,
      })
      const body0 = getRagChunkBodyText(chunks[0]?.content ?? "")
      expect(body0).toContain('"То что на предыдущем уровне')
      expect(body0).toContain("Чувство голода может")
      // Третий абзац — уже в следующем чанке
      expect(body0).not.toContain("Что такое субъект и объект")
    })

    it("не пересекает границы абзацев когда чанк ≥ min", () => {
      const chunks = buildRagIndexChunks({
        title: "тестовый тайтл",
        html: USER_NOTE_HTML,
        tags: ["тег1", "тег2"],
        settings: USER_SETTINGS,
      })
      const body1 = getRagChunkBodyText(chunks[1]?.content ?? "")
      expect(body1).toContain("Что такое субъект и объект")
    })

    it("3 чанка из 4 абзацев: [P1+P2], [P3], [P4]", () => {
      const chunks = buildRagIndexChunks({
        title: "тестовый тайтл",
        html: USER_NOTE_HTML,
        tags: ["тег1", "тег2"],
        settings: USER_SETTINGS,
      })
      // P1~83 + P2~245 = ~330 ≥ min. P3~530 would exceed target → close.
      // P3~530 ≥ min. P4~570 would exceed target → close.
      // P4~570 ≥ min → standalone chunk.
      expect(chunks).toHaveLength(3)
    })
  })
})
