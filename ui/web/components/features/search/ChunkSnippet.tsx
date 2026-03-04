import { cn } from '@ui/web/lib/utils'

interface ChunkSnippetProps {
  content: string
  /** Max characters to display before truncating. */
  maxLength?: number
  className?: string
}

export function ChunkSnippet({ content, maxLength = 200, className }: ChunkSnippetProps) {
  const clampedMax = Math.max(0, maxLength)
  const truncated = content.length > clampedMax
    ? content.slice(0, clampedMax).trimEnd() + '...'
    : content

  return (
    <p className={cn('text-xs text-muted-foreground leading-relaxed', className)}>
      {truncated}
    </p>
  )
}
