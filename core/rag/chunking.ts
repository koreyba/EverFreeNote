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
    rawBlocks.push(...buildBlocksFromPlainText(stripTags(beforeHeading)).map((block) => ({
      sectionHeading: currentHeading,
      text: block.text,
    })))
    currentHeading = stripTags(match[2] ?? "")
    lastIndex = headingRegex.lastIndex
  }

  const remaining = normalizedHtml.slice(lastIndex)
  rawBlocks.push(...buildBlocksFromPlainText(stripTags(remaining)).map((block) => ({
    sectionHeading: currentHeading,
    text: block.text,
  })))

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

function splitOversizedBlock(block: IndexedBlock, maxChunkSize: number): TextSegment[] {
  if (block.text.length <= maxChunkSize) {
    return [{ sectionHeading: block.sectionHeading, text: block.text, charOffset: block.charOffset }]
  }

  const sentenceSegments = splitIntoSentenceSegments(block)
  const expanded: TextSegment[] = []
  for (const sentence of sentenceSegments) {
    if (sentence.text.length <= maxChunkSize) {
      expanded.push(sentence)
      continue
    }
    expanded.push(...splitByCharacterFallback(sentence, maxChunkSize))
  }

  return expanded
}

function joinChunkParts(parts: string[]): string {
  return parts.filter(Boolean).join("\n\n").trim()
}

function accumulateSegments(
  segments: TextSegment[],
  settings: Pick<RagIndexingEditableSettings, "min_chunk_size" | "target_chunk_size" | "max_chunk_size">
): CandidateChunk[] {
  const candidates: CandidateChunk[] = []
  let current: CandidateChunk | null = null

  for (const segment of segments) {
    if (!current) {
      current = { sectionHeading: segment.sectionHeading, text: segment.text, charOffset: segment.charOffset }
      continue
    }

    const sameSection = current.sectionHeading === segment.sectionHeading
    const combinedText = joinChunkParts([current.text, segment.text])

    if (
      sameSection &&
      (
        combinedText.length <= settings.target_chunk_size ||
        (current.text.length < settings.min_chunk_size && combinedText.length <= settings.max_chunk_size)
      )
    ) {
      current = {
        sectionHeading: current.sectionHeading,
        text: combinedText,
        charOffset: current.charOffset,
      }
      continue
    }

    candidates.push(current)
    current = { sectionHeading: segment.sectionHeading, text: segment.text, charOffset: segment.charOffset }
  }

  if (current) {
    candidates.push(current)
  }

  return candidates
}

function mergeSmallChunks(
  chunks: CandidateChunk[],
  settings: Pick<RagIndexingEditableSettings, "min_chunk_size" | "max_chunk_size">
): CandidateChunk[] {
  const merged: CandidateChunk[] = []

  for (let index = 0; index < chunks.length; index += 1) {
    const chunk = chunks[index]
    if (!chunk) continue

    if (chunk.text.length >= settings.min_chunk_size) {
      merged.push(chunk)
      continue
    }

    const previous = merged[merged.length - 1]
    if (
      previous &&
      previous.sectionHeading === chunk.sectionHeading &&
      joinChunkParts([previous.text, chunk.text]).length <= settings.max_chunk_size
    ) {
      merged[merged.length - 1] = {
        sectionHeading: previous.sectionHeading,
        text: joinChunkParts([previous.text, chunk.text]),
        charOffset: previous.charOffset,
      }
      continue
    }

    const next = chunks[index + 1]
    if (
      next &&
      next.sectionHeading === chunk.sectionHeading &&
      joinChunkParts([chunk.text, next.text]).length <= settings.max_chunk_size
    ) {
      chunks[index + 1] = {
        sectionHeading: next.sectionHeading,
        text: joinChunkParts([chunk.text, next.text]),
        charOffset: chunk.charOffset,
      }
      continue
    }

    merged.push(chunk)
  }

  return merged
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

function buildWholeNoteChunk(
  blocks: IndexedBlock[],
  html: string,
  settings: RagIndexingEditableSettings
): CandidateChunk[] {
  const contentFromBlocks = joinChunkParts(blocks.map((block) => block.text))
  const fallbackContent = stripTags(html)
  const text = contentFromBlocks || fallbackContent
  if (!text) return []

  const firstSection = blocks[0]?.sectionHeading ?? null
  const hasSingleSection = blocks.every((block) => block.sectionHeading === firstSection)

  return [
    {
      sectionHeading: hasSingleSection ? firstSection : null,
      text,
      charOffset: blocks[0]?.charOffset ?? 0,
    },
  ]
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
  const baseChunks =
    noteBodyLength > 0 && noteBodyLength <= settings.small_note_threshold
      ? buildWholeNoteChunk(blocks, html ?? "", settings)
      : mergeSmallChunks(
          accumulateSegments(
            blocks.flatMap((block) => splitOversizedBlock(block, settings.max_chunk_size)),
            settings
          ),
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
