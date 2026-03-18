import type { RagIndexingEditableSettings } from "./indexingSettings.ts"

export type RagChunkTemplateInput = {
  sectionHeading: string | null
  tags: string[]
  chunkContent: string
  settings: Pick<RagIndexingEditableSettings, "use_section_headings" | "use_tags">
}

const normalizeInlineText = (value: string) => value.replace(/\s+/g, " ").trim()

const isChunkMetadataLine = (line: string | undefined): boolean =>
  line?.startsWith("Section: ") || line?.startsWith("Tags: ") || false

export function getRagChunkBodyText(content: string): string {
  const normalized = content.trim()
  if (!normalized) return ""

  const lines = normalized.split("\n")
  let end = lines.length

  while (end > 0 && isChunkMetadataLine(lines[end - 1])) {
    end -= 1
  }

  if (end === lines.length) {
    return normalized
  }

  if (end === 0 || lines[end - 1] !== "") {
    return normalized
  }

  return lines.slice(0, end - 1).join("\n").trim()
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

  lines.push(normalizedContent)

  const metaLines: string[] = []

  if (settings.use_section_headings && sectionHeading) {
    const normalizedHeading = normalizeInlineText(sectionHeading)
    if (normalizedHeading) {
      metaLines.push(`Section: ${normalizedHeading}`)
    }
  }

  if (settings.use_tags && tags.length > 0) {
    const normalizedTags = tags.map(normalizeInlineText).filter(Boolean)
    if (normalizedTags.length > 0) {
      metaLines.push(`Tags: ${normalizedTags.join(", ")}`)
    }
  }

  if (metaLines.length > 0) {
    lines.push("")
    lines.push(...metaLines)
  }

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
