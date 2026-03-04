interface ChunkSnippetProps {
  content: string
  /** Max characters to display before truncating. */
  maxLength?: number
}

export function ChunkSnippet({ content, maxLength = 200 }: ChunkSnippetProps) {
  const clampedMax = Math.max(0, maxLength)
  const truncated = content.length > clampedMax
    ? content.slice(0, clampedMax).trimEnd() + '…'
    : content

  return (
    <p className="text-xs text-muted-foreground leading-relaxed">
      {truncated}
    </p>
  )
}
