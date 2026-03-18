export type RagIndexDebugChunk = {
  chunkIndex: number
  charOffset: number
  sectionHeading: string | null
  title: string | null
  content: string
}

function previewContent(content: string, maxLength = 120): string {
  if (content.length <= maxLength) return content
  return `${content.slice(0, maxLength)}...`
}

export function logRagIndexDebugChunks(noteId: string, chunks: RagIndexDebugChunk[]): void {
  if (chunks.length === 0) {
    console.info(`[rag-index] No chunks were produced for note ${noteId}`)
    return
  }

  const openGroup = typeof console.groupCollapsed === "function"
    ? console.groupCollapsed.bind(console)
    : console.info.bind(console)
  const closeGroup = typeof console.groupEnd === "function"
    ? console.groupEnd.bind(console)
    : () => undefined

  openGroup(`[rag-index][debug] ${chunks.length} chunks for note ${noteId}`)
  for (const chunk of chunks) {
    console.log(`[chunk ${chunk.chunkIndex}]`)
    console.log({
      chunkIndex: chunk.chunkIndex,
      charOffset: chunk.charOffset,
      sectionHeading: chunk.sectionHeading,
      title: chunk.title,
      contentLength: chunk.content.length,
      preview: previewContent(chunk.content),
    })
    console.log("content preview:", chunk.content.length > 0 ? previewContent(chunk.content) : "<empty>")
  }
  closeGroup()
}
