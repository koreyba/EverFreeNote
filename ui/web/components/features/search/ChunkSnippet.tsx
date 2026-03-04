interface ChunkSnippetProps {
  content: string
  /** Max characters to display before truncating. */
  maxLength?: number
}

export function ChunkSnippet({ content, maxLength = 200 }: ChunkSnippetProps) {
  const truncated = content.length > maxLength
    ? content.slice(0, maxLength).trimEnd() + '…'
    : content

  return (
    <p className="text-xs text-muted-foreground leading-relaxed">
      {truncated}
    </p>
  )
}
