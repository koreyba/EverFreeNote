import type { RagIndexingEditableSettings } from "./indexingSettings.ts"
import { buildRagChunkText, buildRagEmbeddingTitle } from "./chunkTemplate.ts"

type RawBlock = {
  sectionHeading: string | null
  text: string
}

type IndexedBlock = RawBlock & {
  charOffset: number
}

type TextSegment = {
  sectionHeading: string | null
  text: string
  charOffset: number
}

type CandidateChunk = {
  sectionHeading: string | null
  text: string
  charOffset: number
}

export type BuildRagChunksInput = {
  title: string | null | undefined
  html: string | null | undefined
  tags: string[] | null | undefined
  settings: RagIndexingEditableSettings
}

export type RagIndexChunk = {
  charOffset: number
  content: string
  title: string | null
  sectionHeading: string | null
}

const BLOCK_BREAK_PATTERN = /<\/?(?:p|div|li|blockquote|pre|ul|ol|section|article|main)\b[^>]*>/gi

function normalizeWhitespace(value: string): string {
  return value
    .replaceAll(/&nbsp;/gi, " ")
    .replaceAll(/\u00a0/g, " ")
    .replaceAll(/\s+/g, " ")
    .trim()
}

function stripTags(value: string): string {
  return normalizeWhitespace(value.replaceAll(/<[^>]*>/g, " "))
}

function splitPlainTextParagraphs(value: string): string[] {
  return value
    .split(/\n{2,}/)
    .map((paragraph) => normalizeWhitespace(paragraph))
    .filter(Boolean)
}

function buildBlocksFromPlainText(value: string): RawBlock[] {
  return splitPlainTextParagraphs(value).map((text) => ({ sectionHeading: null, text }))
}

function hasDomParser(): boolean {
  return typeof DOMParser !== "undefined"
}

function extractElementText(node: Node): string {
  if (node.nodeType === Node.TEXT_NODE) {
    return node.textContent ?? ""
  }

  if (node.nodeType !== Node.ELEMENT_NODE) {
    return ""
  }

  const element = node as Element
  const tagName = element.tagName.toLowerCase()

  if (tagName === "br") return "\n"

  let result = ""
  for (const child of Array.from(element.childNodes)) {
    result += extractElementText(child)
  }
  return result
}

const SEMANTIC_CONTAINERS = new Set(["section", "article", "main"])
const BLOCK_ELEMENTS = new Set(["p", "div", "li", "blockquote", "pre"])
const NESTED_BLOCK_TAGS = new Set(["div", "p", "li", "blockquote", "pre"])

function isHeadingTag(tagName: string): boolean {
  return tagName.length === 2 && tagName.startsWith("h") && tagName >= "h1" && tagName <= "h6"
}

function divHasNestedBlocks(element: Element): boolean {
  return Array.from(element.children).some((child) => {
    const tag = child.tagName.toLowerCase()
    return NESTED_BLOCK_TAGS.has(tag) || isHeadingTag(tag)
  })
}

function collectBlocksFromDom(rootHtml: string): RawBlock[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(rootHtml, "text/html")
  const blocks: RawBlock[] = []
  let currentHeading: string | null = null

  const pushBlock = (text: string) => {
    if (text) blocks.push({ sectionHeading: currentHeading, text })
  }

  const handleList = (element: Element, prefix: (idx: number) => string) => {
    let idx = 1
    for (const child of Array.from(element.childNodes)) {
      if (child.nodeType !== Node.ELEMENT_NODE) continue
      if ((child as Element).tagName.toLowerCase() === "li") {
        const text = normalizeWhitespace(extractElementText(child))
        pushBlock(text ? `${prefix(idx)}${text}` : "")
        idx++
      } else {
        walk(child)
      }
    }
  }

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        pushBlock(normalizeWhitespace(child.textContent ?? ""))
        continue
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue

      const element = child as Element
      const tagName = element.tagName.toLowerCase()

      if (isHeadingTag(tagName)) {
        currentHeading = normalizeWhitespace(element.textContent ?? "")
      } else if (tagName === "ol") {
        handleList(element, (idx) => `${idx}. `)
      } else if (tagName === "ul") {
        handleList(element, () => "- ")
      } else if (SEMANTIC_CONTAINERS.has(tagName)) {
        walk(element)
      } else if (tagName === "div" && divHasNestedBlocks(element)) {
        walk(element)
      } else if (BLOCK_ELEMENTS.has(tagName)) {
        pushBlock(normalizeWhitespace(extractElementText(element)))
      } else {
        walk(element)
      }
    }
  }

  walk(doc.body)
  return blocks.filter((block) => block.text.length > 0)
}

function splitAndStripParagraphs(text: string, sectionHeading: string | null): RawBlock[] {
  // Split by paragraph breaks first (created by BLOCK_BREAK_PATTERN replacement),
  // then strip remaining tags from each paragraph individually.
  // This preserves paragraph boundaries that normalizeWhitespace would otherwise collapse.
  return text
    .split(/\n{2,}/)
    .map((paragraph) => stripTags(paragraph))
    .filter(Boolean)
    .map((cleaned) => ({ sectionHeading, text: cleaned }))
}

function prefixListItems(html: string): string {
  // Ordered lists: prepend "1. ", "2. ", etc.
  let result = html.replaceAll(/<ol\b[^>]*>([\s\S]*?)<\/ol>/gi, (_match, inner: string) => {
    let idx = 1
    const numbered = inner.replaceAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_liMatch: string, liContent: string) => {
      const stripped = liContent.replaceAll(/<\/?p\b[^>]*>/gi, "")
      return `<li>${idx++}. ${stripped}</li>`
    })
    return `<ol>${numbered}</ol>`
  })

  // Unordered lists: prepend "- "
  result = result.replaceAll(/<ul\b[^>]*>([\s\S]*?)<\/ul>/gi, (_match, inner: string) => {
    const bulleted = inner.replaceAll(/<li\b[^>]*>([\s\S]*?)<\/li>/gi, (_liMatch: string, liContent: string) => {
      const stripped = liContent.replaceAll(/<\/?p\b[^>]*>/gi, "")
      return `<li>- ${stripped}</li>`
    })
    return `<ul>${bulleted}</ul>`
  })

  return result
}

function collectBlocksWithRegex(html: string): RawBlock[] {
  const normalizedHtml = prefixListItems(html)
    .replaceAll(/<br\s*\/?>/gi, "\n")
    .replaceAll(BLOCK_BREAK_PATTERN, "\n\n")

  const rawBlocks: RawBlock[] = []
  let currentHeading: string | null = null

  const headingRegex = /<h([1-6])\b[^>]*>([\s\S]*?)<\/h\1>/gi
  let lastIndex = 0
  let match: RegExpExecArray | null

  while ((match = headingRegex.exec(normalizedHtml)) !== null) {
    const beforeHeading = normalizedHtml.slice(lastIndex, match.index)
    rawBlocks.push(...splitAndStripParagraphs(beforeHeading, currentHeading))
    currentHeading = stripTags(match[2] ?? "")
    lastIndex = headingRegex.lastIndex
  }

  const remaining = normalizedHtml.slice(lastIndex)
  rawBlocks.push(...splitAndStripParagraphs(remaining, currentHeading))

  return rawBlocks.filter((block) => block.text.length > 0)
}

function extractBlocksFromHtml(html: string): IndexedBlock[] {
  const source = html?.trim() ?? ""
  if (!source) return []

  const rawBlocks = hasDomParser() ? collectBlocksFromDom(source) : collectBlocksWithRegex(source)
  const fallbackBlocks = rawBlocks.length > 0 ? rawBlocks : buildBlocksFromPlainText(stripTags(source))

  let charOffset = 0
  return fallbackBlocks.map((block) => {
    const indexedBlock: IndexedBlock = {
      ...block,
      charOffset,
    }
    charOffset += block.text.length + 2
    return indexedBlock
  })
}

function splitIntoSentenceSegments(block: IndexedBlock): TextSegment[] {
  const matches = Array.from(block.text.matchAll(/[^.!?]+(?:[.!?]+|$)/g))
  if (matches.length <= 1) {
    return [{ sectionHeading: block.sectionHeading, text: block.text, charOffset: block.charOffset }]
  }

  return matches
    .map((match) => ({
      sectionHeading: block.sectionHeading,
      text: normalizeWhitespace(match[0] ?? ""),
      charOffset: block.charOffset + (match.index ?? 0),
    }))
    .filter((segment) => segment.text.length > 0)
}

function splitByCharacterFallback(segment: TextSegment, maxChunkSize: number): TextSegment[] {
  const normalized = normalizeWhitespace(segment.text)
  if (normalized.length <= maxChunkSize) {
    return [{ ...segment, text: normalized }]
  }

  const parts: TextSegment[] = []
  let offset = 0
  while (offset < normalized.length) {
    let end = Math.min(offset + maxChunkSize, normalized.length)
    if (end < normalized.length) {
      const whitespaceIndex = normalized.lastIndexOf(" ", end)
      if (whitespaceIndex > offset) {
        end = whitespaceIndex
      }
    }

    const piece = normalized.slice(offset, end).trim()
    if (piece) {
      parts.push({
        sectionHeading: segment.sectionHeading,
        text: piece,
        charOffset: segment.charOffset + offset,
      })
    }

    offset = end
    while (offset < normalized.length && normalized[offset] === " ") {
      offset += 1
    }
  }

  return parts
}

function takePartialText(text: string, minChars: number): { taken: string; remainder: string; consumedChars: number } {
  if (minChars >= text.length) {
    return { taken: text, remainder: "", consumedChars: text.length }
  }

  const sentenceEnd = text.indexOf(".", minChars)
  if (sentenceEnd !== -1 && sentenceEnd < text.length) {
    const splitAt = sentenceEnd + 1
    return {
      taken: text.slice(0, splitAt).trim(),
      remainder: text.slice(splitAt).trim(),
      consumedChars: splitAt,
    }
  }

  const spaceIndex = text.indexOf(" ", minChars)
  if (spaceIndex !== -1) {
    return {
      taken: text.slice(0, spaceIndex).trim(),
      remainder: text.slice(spaceIndex).trim(),
      consumedChars: spaceIndex,
    }
  }

  return {
    taken: text.slice(0, minChars).trim(),
    remainder: text.slice(minChars).trim(),
    consumedChars: minChars,
  }
}

function splitOversizedParagraph(
  block: IndexedBlock,
  maxSize: number,
  minSize: number
): CandidateChunk[] {
  const sentenceSegments = splitIntoSentenceSegments(block)
  const pieces: TextSegment[] = []
  for (const sentence of sentenceSegments) {
    if (sentence.text.length <= maxSize) {
      pieces.push(sentence)
    } else {
      pieces.push(...splitByCharacterFallback(sentence, maxSize))
    }
  }

  const chunks: CandidateChunk[] = []
  let current: CandidateChunk | null = null

  for (const piece of pieces) {
    if (!current) {
      current = { sectionHeading: piece.sectionHeading, text: piece.text, charOffset: piece.charOffset }
      continue
    }

    const combined = [current.text, piece.text].join(" ")
    if (combined.length <= maxSize) {
      current = { ...current, text: combined }
    } else {
      chunks.push(current)
      current = { sectionHeading: piece.sectionHeading, text: piece.text, charOffset: piece.charOffset }
    }
  }

  if (current) chunks.push(current)

  // Backward merge: if the last piece is undersized, merge it into the previous piece.
  // This may produce a chunk slightly above maxSize — a conscious compromise to avoid
  // breaking the next paragraph boundary or leaving a tiny orphan chunk.
  if (chunks.length >= 2) {
    const last = chunks.at(-1)
    const prev = chunks.at(-2)
    if (last && prev && last.text.length < minSize) {
      chunks.splice(-2, 2, { ...prev, text: [prev.text, last.text].join(" ") })
    }
  }

  return chunks
}

function joinChunkParts(parts: string[]): string {
  return parts.filter(Boolean).join("\n\n").trim()
}

function accumulateBelowMin(
  current: CandidateChunk,
  block: IndexedBlock,
  combinedText: string,
  candidates: CandidateChunk[],
  settings: Pick<RagIndexingEditableSettings, "min_chunk_size" | "max_chunk_size">
): CandidateChunk | null {
  if (combinedText.length <= settings.max_chunk_size) {
    return { sectionHeading: current.sectionHeading, text: combinedText, charOffset: current.charOffset }
  }

  const separatorLen = 2 // "\n\n"
  const needed = settings.min_chunk_size - current.text.length - separatorLen
  if (needed <= 0) {
    candidates.push(current)
    return { sectionHeading: block.sectionHeading, text: block.text, charOffset: block.charOffset }
  }

  const partial = takePartialText(block.text, needed)
  candidates.push({
    sectionHeading: current.sectionHeading,
    text: joinChunkParts([current.text, partial.taken]),
    charOffset: current.charOffset,
  })

  if (partial.remainder) {
    return {
      sectionHeading: block.sectionHeading,
      text: partial.remainder,
      charOffset: block.charOffset + partial.consumedChars,
    }
  }

  return null
}

function mergeBlockIntoCurrent(
  current: CandidateChunk,
  block: IndexedBlock,
  candidates: CandidateChunk[],
  settings: Pick<RagIndexingEditableSettings, "min_chunk_size" | "target_chunk_size" | "max_chunk_size">
): CandidateChunk | null {
  const combinedText = joinChunkParts([current.text, block.text])

  if (current.text.length < settings.min_chunk_size) {
    return accumulateBelowMin(current, block, combinedText, candidates, settings)
  }

  // At or above min — can close, but check if next paragraph fits within target
  if (combinedText.length <= settings.target_chunk_size) {
    return { sectionHeading: current.sectionHeading, text: combinedText, charOffset: current.charOffset }
  }

  // Would exceed target — close current, start new chunk
  candidates.push(current)
  return { sectionHeading: block.sectionHeading, text: block.text, charOffset: block.charOffset }
}

function assembleParagraphFirst(
  blocks: IndexedBlock[],
  settings: Pick<RagIndexingEditableSettings, "min_chunk_size" | "target_chunk_size" | "max_chunk_size">
): CandidateChunk[] {
  const candidates: CandidateChunk[] = []
  let current: CandidateChunk | null = null

  for (const block of blocks) {
    // Section boundary — close current chunk
    if (current && current.sectionHeading !== block.sectionHeading) {
      candidates.push(current)
      current = null
    }

    // Oversized paragraph (> max_chunk_size): split internally with max_chunk_size (minimal cuts)
    if (block.text.length > settings.max_chunk_size) {
      if (current) {
        candidates.push(current)
        current = null
      }
      candidates.push(...splitOversizedParagraph(block, settings.max_chunk_size, settings.min_chunk_size))
      continue
    }

    // Start new chunk
    if (!current) {
      current = { sectionHeading: block.sectionHeading, text: block.text, charOffset: block.charOffset }
      continue
    }

    current = mergeBlockIntoCurrent(current, block, candidates, settings)
  }

  if (current) {
    candidates.push(current)
  }

  return candidates
}

function mergeUndersizedTail(
  chunks: CandidateChunk[],
  settings: Pick<RagIndexingEditableSettings, "min_chunk_size" | "max_chunk_size">
): CandidateChunk[] {
  if (chunks.length < 2) return chunks

  const last = chunks.at(-1)
  const prev = chunks.at(-2)
  if (!last || !prev) return chunks

  if (last.text.length >= settings.min_chunk_size) return chunks
  if (prev.sectionHeading !== last.sectionHeading) return chunks

  const merged = joinChunkParts([prev.text, last.text])
  if (merged.length <= settings.max_chunk_size) {
    return [
      ...chunks.slice(0, -2),
      { ...prev, text: merged },
    ]
  }

  return chunks
}

function buildOverlapPrefix(source: string, overlap: number): string {
  if (overlap <= 0 || source.length === 0) return ""
  const requestedStart = Math.max(0, source.length - overlap)
  const sentenceBoundary = source.lastIndexOf(".", requestedStart - 1)

  if (sentenceBoundary === -1) {
    return source.slice(requestedStart).trim()
  }

  const sentenceStart = sentenceBoundary + 1
  return source.slice(sentenceStart).trim()
}

function applyFinalOverlap(chunks: CandidateChunk[], overlap: number): CandidateChunk[] {
  if (overlap <= 0) return chunks

  return chunks.map((chunk, index) => {
    if (index === 0) return chunk
    const previous = chunks[index - 1]
    if (previous?.sectionHeading !== chunk.sectionHeading) {
      return chunk
    }
    const overlapPrefix = buildOverlapPrefix(previous.text, overlap)
    if (!overlapPrefix) return chunk

    return {
      ...chunk,
      text: joinChunkParts([overlapPrefix, chunk.text]),
    }
  })
}

export function buildRagIndexChunks({
  title,
  html,
  tags,
  settings,
}: BuildRagChunksInput): RagIndexChunk[] {
  const normalizedTags = Array.isArray(tags) ? tags.filter((tag): tag is string => typeof tag === "string") : []
  const blocks = extractBlocksFromHtml(html ?? "")
  const noteBodyLength = joinChunkParts(blocks.map((block) => block.text)).length

  // Notes shorter than min_chunk_size are not indexed
  if (noteBodyLength < settings.min_chunk_size) {
    return []
  }

  const baseChunks = mergeUndersizedTail(
    assembleParagraphFirst(blocks, settings),
    settings
  )

  const finalChunks = applyFinalOverlap(baseChunks, settings.overlap)
  const embeddingTitle = buildRagEmbeddingTitle(title, settings)

  return finalChunks
    .map((chunk) => ({
      charOffset: chunk.charOffset,
      content: buildRagChunkText({
        sectionHeading: chunk.sectionHeading,
        tags: normalizedTags,
        chunkContent: chunk.text,
        settings,
      }),
      title: embeddingTitle,
      sectionHeading: chunk.sectionHeading,
    }))
    .filter((chunk) => chunk.content.length > 0)
}
