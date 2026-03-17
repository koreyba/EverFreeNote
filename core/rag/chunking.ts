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

const HEADING_TAG_PATTERN = /<\/?h[1-6]\b[^>]*>/i
const BLOCK_BREAK_PATTERN = /<\/?(?:p|div|li|blockquote|pre|ul|ol|section|article|main)\b[^>]*>/gi

function normalizeWhitespace(value: string): string {
  return value
    .replace(/&nbsp;/gi, " ")
    .replace(/\u00a0/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

function stripTags(value: string): string {
  return normalizeWhitespace(value.replace(/<[^>]*>/g, " "))
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

function collectBlocksFromDom(rootHtml: string): RawBlock[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(rootHtml, "text/html")
  const blocks: RawBlock[] = []
  let currentHeading: string | null = null

  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.TEXT_NODE) {
        const text = normalizeWhitespace(child.textContent ?? "")
        if (text) blocks.push({ sectionHeading: currentHeading, text })
        continue
      }

      if (child.nodeType !== Node.ELEMENT_NODE) continue

      const element = child as Element
      const tagName = element.tagName.toLowerCase()

      if (/^h[1-6]$/.test(tagName)) {
        currentHeading = normalizeWhitespace(element.textContent ?? "")
        continue
      }

      if (tagName === "ul" || tagName === "ol" || tagName === "section" || tagName === "article" || tagName === "main") {
        walk(element)
        continue
      }

      if (tagName === "div") {
        const hasNestedBlocks = Array.from(element.children).some((childElement) => {
          const childTag = childElement.tagName.toLowerCase()
          return childTag === "div" || childTag === "p" || childTag === "li" || childTag === "blockquote" || childTag === "pre" || /^h[1-6]$/.test(childTag)
        })

        if (hasNestedBlocks) {
          walk(element)
          continue
        }
      }

      if (tagName === "p" || tagName === "div" || tagName === "li" || tagName === "blockquote" || tagName === "pre") {
        const text = normalizeWhitespace(extractElementText(element))
        if (text) blocks.push({ sectionHeading: currentHeading, text })
        continue
      }

      walk(element)
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

function collectBlocksWithRegex(html: string): RawBlock[] {
  const normalizedHtml = html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(BLOCK_BREAK_PATTERN, "\n\n")

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

function takePartialText(text: string, minChars: number): { taken: string; remainder: string } {
  if (minChars >= text.length) {
    return { taken: text, remainder: "" }
  }

  const sentenceEnd = text.indexOf(".", minChars)
  if (sentenceEnd !== -1 && sentenceEnd < text.length) {
    return {
      taken: text.slice(0, sentenceEnd + 1).trim(),
      remainder: text.slice(sentenceEnd + 1).trim(),
    }
  }

  const spaceIndex = text.indexOf(" ", minChars)
  if (spaceIndex !== -1) {
    return {
      taken: text.slice(0, spaceIndex).trim(),
      remainder: text.slice(spaceIndex).trim(),
    }
  }

  return {
    taken: text.slice(0, minChars).trim(),
    remainder: text.slice(minChars).trim(),
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
    const last = chunks[chunks.length - 1]!
    if (last.text.length < minSize) {
      const prev = chunks[chunks.length - 2]!
      chunks.splice(-2, 2, { ...prev, text: [prev.text, last.text].join(" ") })
    }
  }

  return chunks
}

function joinChunkParts(parts: string[]): string {
  return parts.filter(Boolean).join("\n\n").trim()
}

function assembleParagraphFirst(
  blocks: IndexedBlock[],
  settings: Pick<RagIndexingEditableSettings, "min_chunk_size" | "target_chunk_size" | "max_chunk_size">
): CandidateChunk[] {
  const candidates: CandidateChunk[] = []
  let current: CandidateChunk | null = null

  for (let i = 0; i < blocks.length; i++) {
    const block = blocks[i]
    if (!block) continue

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

    // current is guaranteed non-null here (guarded by the !current check above)
    const combinedText = joinChunkParts([current!.text, block.text])

    if (current!.text.length < settings.min_chunk_size) {
      // Below min — must add more to reach min_chunk_size
      if (combinedText.length <= settings.max_chunk_size) {
        // Whole paragraph fits within max — add it whole
        current = { sectionHeading: current!.sectionHeading, text: combinedText, charOffset: current!.charOffset }
      } else {
        // Whole paragraph doesn't fit in max — split partially to reach min
        const separatorLen = 2 // "\n\n"
        const needed = settings.min_chunk_size - current!.text.length - separatorLen
        if (needed > 0) {
          const partial = takePartialText(block.text, needed)
          current = { sectionHeading: current!.sectionHeading, text: joinChunkParts([current!.text, partial.taken]), charOffset: current!.charOffset }
          candidates.push(current)
          current = null
          if (partial.remainder) {
            current = {
              sectionHeading: block.sectionHeading,
              text: partial.remainder,
              charOffset: block.charOffset + partial.taken.length,
            }
          }
        } else {
          // Current is already at min with just the separator
          candidates.push(current!)
          current = { sectionHeading: block.sectionHeading, text: block.text, charOffset: block.charOffset }
        }
      }
      continue
    }

    // At or above min — can close, but check if next paragraph fits within target
    if (combinedText.length <= settings.target_chunk_size) {
      // Adding this paragraph keeps within target — add it
      current = { sectionHeading: current!.sectionHeading, text: combinedText, charOffset: current!.charOffset }
    } else {
      // Would exceed target — close current, start new chunk
      candidates.push(current!)
      current = { sectionHeading: block.sectionHeading, text: block.text, charOffset: block.charOffset }
    }
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

  const last = chunks[chunks.length - 1]!
  if (last.text.length >= settings.min_chunk_size) return chunks

  const prev = chunks[chunks.length - 2]!
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
    return source.trim()
  }

  const sentenceStart = sentenceBoundary + 1
  return source.slice(sentenceStart).trim()
}

function applyFinalOverlap(chunks: CandidateChunk[], overlap: number): CandidateChunk[] {
  if (overlap <= 0) return chunks

  return chunks.map((chunk, index) => {
    if (index === 0) return chunk
    const previous = chunks[index - 1]
    if (!previous || previous.sectionHeading !== chunk.sectionHeading) {
      return chunk
    }
    const overlapPrefix = buildOverlapPrefix(previous?.text ?? "", overlap)
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
