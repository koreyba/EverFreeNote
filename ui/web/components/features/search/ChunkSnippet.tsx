import { cn } from '@ui/web/lib/utils'

interface ChunkSnippetProps {
  content: string
  /** Max characters to display before truncating. */
  maxLength?: number
  className?: string
  highlightQuery?: string
}

function escapeRegExp(input: string): string {
  return input.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

function buildHighlightPattern(query: string): RegExp | null {
  const terms = query
    .trim()
    .split(/\s+/)
    .filter(Boolean)

  if (terms.length === 0) return null

  const uniqueTerms = Array.from(new Set(terms))
    .sort((a, b) => b.length - a.length)
    .map(escapeRegExp)

  if (uniqueTerms.length === 0) return null
  return new RegExp(`(${uniqueTerms.join('|')})`, 'gi')
}

export function ChunkSnippet({ content, maxLength = 200, className, highlightQuery = '' }: ChunkSnippetProps) {
  const clampedMax = Math.max(0, maxLength)
  const truncated = content.length > clampedMax
    ? content.slice(0, clampedMax).trimEnd() + '...'
    : content
  const highlightPattern = buildHighlightPattern(highlightQuery)
  const parts = highlightPattern ? truncated.split(highlightPattern) : [truncated]

  return (
    <p className={cn('text-xs text-muted-foreground leading-relaxed', className)}>
      {parts.map((part, index) => {
        const isMatch = Boolean(highlightPattern) && index % 2 === 1
        if (!isMatch) return <span key={index}>{part}</span>

        return (
          <mark
            key={index}
            className="rounded-sm bg-primary/25 px-0.5 text-foreground"
          >
            {part}
          </mark>
        )
      })}
    </p>
  )
}
