export interface Chunk {
  content: string
  charOffset: number
}

export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim()
}

export function chunkText(text: string, chunkSize = 1500, overlap = 200): Chunk[] {
  if (!text.trim()) return []

  const chunks: Chunk[] = []
  let offset = 0

  while (offset < text.length) {
    const content = text.slice(offset, offset + chunkSize)
    chunks.push({ content, charOffset: offset })
    if (content.length < chunkSize) break
    offset += chunkSize - overlap
  }

  return chunks
}

export function prepareNoteText(title: string, html: string): string {
  const plainBody = stripHtml(html)
  return title.trim() ? `${title.trim()} ${plainBody}` : plainBody
}
