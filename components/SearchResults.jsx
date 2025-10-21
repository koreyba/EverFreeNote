'use client'

/**
 * SearchResults component
 * Displays FTS search results with highlighting and relevance scores
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, Search, Zap } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'
import DOMPurify from 'isomorphic-dompurify'

/**
 * Sanitize HTML headline to prevent XSS
 * Only allows <mark> tags for highlighting
 * 
 * @param {string} html - HTML string from ts_headline
 * @returns {string} Sanitized HTML
 */
function sanitizeHeadline(html) {
  if (!html) return ''
  
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS: ['mark'],
    ALLOWED_ATTR: []
  })
}

/**
 * Format date to relative time
 * @param {string} dateString - ISO date string
 * @returns {string} Relative time string
 */
function formatRelativeTime(dateString) {
  if (!dateString) return ''
  
  const date = new Date(dateString)
  const now = new Date()
  const diffMs = now - date
  const diffSec = Math.floor(diffMs / 1000)
  const diffMin = Math.floor(diffSec / 60)
  const diffHour = Math.floor(diffMin / 60)
  const diffDay = Math.floor(diffHour / 24)
  
  if (diffDay > 7) {
    return date.toLocaleDateString('ru-RU', { 
      year: 'numeric', 
      month: 'short', 
      day: 'numeric' 
    })
  }
  if (diffDay > 0) return `${diffDay}д назад`
  if (diffHour > 0) return `${diffHour}ч назад`
  if (diffMin > 0) return `${diffMin}мин назад`
  return 'только что'
}

/**
 * Single search result item
 */
function SearchResultItem({ note, showRank = false, method }) {
  const sanitizedHeadline = sanitizeHeadline(note.headline)
  
  return (
    <Card className="hover:shadow-md transition-shadow cursor-pointer">
      <CardHeader className="pb-3">
        <div className="flex items-start justify-between gap-2">
          <CardTitle className="text-lg line-clamp-2">
            {note.title || 'Без названия'}
          </CardTitle>
          <div className="flex gap-1 flex-shrink-0">
            {method === 'fts' && (
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                FTS
              </Badge>
            )}
            {showRank && note.rank > 0 && (
              <Badge variant="secondary" className="text-xs">
                {(note.rank * 100).toFixed(0)}%
              </Badge>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Highlighted content preview */}
        {sanitizedHeadline && (
          <div
            className="text-sm text-muted-foreground line-clamp-3"
            role="text"
            aria-label="Результаты поиска с выделенными совпадениями"
          >
            <div
              dangerouslySetInnerHTML={{ __html: sanitizedHeadline }}
              className="prose prose-sm max-w-none [&_mark]:bg-primary/20 [&_mark]:text-primary [&_mark]:px-0.5 [&_mark]:rounded-sm [&_mark]:font-medium"
            />
          </div>
        )}
        
        {/* Tags */}
        {note.tags && note.tags.length > 0 && (
          <div className="flex flex-wrap gap-1">
            {note.tags.slice(0, 5).map((tag, idx) => (
              <Badge key={idx} variant="outline" className="text-xs">
                {tag}
              </Badge>
            ))}
            {note.tags.length > 5 && (
              <Badge variant="outline" className="text-xs">
                +{note.tags.length - 5}
              </Badge>
            )}
          </div>
        )}
        
        {/* Metadata */}
        <div className="text-xs text-muted-foreground">
          {formatRelativeTime(note.updated_at)}
        </div>
      </CardContent>
    </Card>
  )
}

/**
 * Loading skeleton for search results
 */
function SearchResultsSkeleton({ count = 3 }) {
  return (
    <div className="space-y-4">
      {Array.from({ length: count }).map((_, i) => (
        <Card key={i}>
          <CardHeader className="pb-3">
            <Skeleton className="h-6 w-3/4" />
          </CardHeader>
          <CardContent className="space-y-3">
            <Skeleton className="h-4 w-full" />
            <Skeleton className="h-4 w-5/6" />
            <div className="flex gap-2">
              <Skeleton className="h-5 w-16" />
              <Skeleton className="h-5 w-16" />
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

/**
 * Empty state when no results found
 */
function EmptyResults({ query }) {
  return (
    <div className="flex flex-col items-center justify-center py-12 text-center">
      <Search className="h-12 w-12 text-muted-foreground mb-4" />
      <h3 className="text-lg font-semibold mb-2">Ничего не найдено</h3>
      <p className="text-sm text-muted-foreground max-w-md">
        По запросу &ldquo;{query}&rdquo; не найдено ни одной заметки.
        Попробуйте изменить поисковый запрос.
      </p>
    </div>
  )
}

/**
 * Error state
 */
function ErrorResults({ error }) {
  return (
    <Alert variant="destructive">
      <AlertCircle className="h-4 w-4" />
      <AlertDescription>
        Ошибка поиска: {error?.message || 'Неизвестная ошибка'}
      </AlertDescription>
    </Alert>
  )
}

/**
 * Main SearchResults component
 * 
 * @param {Object} props
 * @param {Object} props.searchResult - Result from useSearchNotes hook
 * @param {Function} props.onNoteClick - Callback when note is clicked
 * @param {boolean} props.showRank - Show relevance scores (for debugging)
 */
export function SearchResults({ 
  searchResult, 
  onNoteClick,
  showRank = false 
}) {
  const { data, isLoading, isError, error } = searchResult
  
  // Loading state
  if (isLoading) {
    return <SearchResultsSkeleton />
  }
  
  // Error state
  if (isError) {
    return <ErrorResults error={error} />
  }
  
  // No data or empty results
  if (!data || !data.results || data.results.length === 0) {
    return <EmptyResults query={data?.query || ''} />
  }
  
  const { results, total, method, executionTime } = data
  
  return (
    <div className="space-y-4">
      {/* Results metadata */}
      <div className="flex items-center justify-between text-sm text-muted-foreground">
        <div>
          Найдено: <span className="font-semibold">{total}</span> {total === 1 ? 'заметка' : 'заметок'}
        </div>
        {executionTime !== undefined && (
          <div className="flex items-center gap-2">
            <span>{executionTime}ms</span>
            {method === 'fts' && (
              <Badge variant="outline" className="text-xs gap-1">
                <Zap className="h-3 w-3" />
                Быстрый поиск
              </Badge>
            )}
          </div>
        )}
      </div>
      
      {/* Results list */}
      <div className="space-y-4">
        {results.map((note) => (
          <div 
            key={note.id}
            onClick={() => onNoteClick?.(note)}
          >
            <SearchResultItem 
              note={note} 
              showRank={showRank}
              method={method}
            />
          </div>
        ))}
      </div>
    </div>
  )
}

export default SearchResults

