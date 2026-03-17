import type { RagIndexingEditableSettings } from "@core/rag/indexingSettings"

export type RagChunkTemplateInput = {
  sectionHeading: string | null
  tags: string[]
  chunkContent: string
  settings: Pick<RagIndexingEditableSettings, "use_section_headings" | "use_tags">
}

const normalizeInlineText = (value: string) => value.replace(/\s+/g, " ").trim()

export function getRagChunkBodyText(content: string): string {
  const normalized = content.trim()
  if (!normalized) return ""

  const lines = normalized.split("\n")
  let cursor = 0

  if (lines[cursor]?.startsWith("Section: ")) {
    cursor += 1
  }
  if (lines[cursor]?.startsWith("Tags: ")) {
    cursor += 1
  }

  if (cursor > 0 && lines[cursor] === "") {
    return lines.slice(cursor + 1).join("\n").trim()
  }

  return normalized
}

export function getRagChunkBodyLength(content: string): number {
  return getRagChunkBodyText(content).length
}

export function buildRagChunkText({
  sectionHeading,
  tags,
  chunkContent,
  settings,
}: RagChunkTemplateInput): string {
  const lines: string[] = []
  const normalizedContent = chunkContent.trim()

  if (!normalizedContent) return ""

  if (settings.use_section_headings && sectionHeading) {
    const normalizedHeading = normalizeInlineText(sectionHeading)
    if (normalizedHeading) {
      lines.push(`Section: ${normalizedHeading}`)
    }
  }

  if (settings.use_tags && tags.length > 0) {
    const normalizedTags = tags.map(normalizeInlineText).filter(Boolean)
    if (normalizedTags.length > 0) {
      lines.push(`Tags: ${normalizedTags.join(", ")}`)
    }
  }

  if (lines.length > 0) {
    lines.push("")
  }

  lines.push(normalizedContent)
  return lines.join("\n")
}

export function buildRagEmbeddingTitle(
  title: string | null | undefined,
  settings: Pick<RagIndexingEditableSettings, "use_title">
): string | null {
  if (!settings.use_title) return null
  const normalizedTitle = normalizeInlineText(title ?? "")
  return normalizedTitle || null
}
