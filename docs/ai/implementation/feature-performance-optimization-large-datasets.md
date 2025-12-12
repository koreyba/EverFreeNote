---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide: Performance Optimization for Large Datasets

## Development Setup
**How do we get started?**

### Prerequisites
- Node.js 18+ installed
- Supabase CLI installed
- Project dependencies installed (`npm install`)
- Development server running (`npm run dev`)

### New Dependencies to Install
```bash
npm install @tanstack/react-query react-window idb
```

### Environment Configuration
No new environment variables needed. Existing `.env.local` sufficient.

## Code Structure
**How is the code organized?**

### New Files to Create
```
hooks/
  ├── useNotesQuery.ts          # Paginated notes fetching
  ├── useCacheManager.ts        # IndexedDB cache management
  └── useNoteUpdate.ts          # Optimistic note updates

components/
  ├── NotesList\.tsx             # Virtual scrolling list
  ├── NoteListItem\.tsx          # Optimized list item
  ├── NoteListSkeleton\.tsx      # Loading skeleton
  └── SyncIndicator\.tsx         # Save status indicator

lib/
  ├── cache/
  │   └── indexedDB.ts          # IndexedDB wrapper
  └── analytics/
      ├── performance.ts        # Performance logging
      └── errors.ts             # Error tracking

supabase/
  └── migrations/
      └── YYYYMMDD_add_performance_indexes.sql
```

### Files to Modify
```
app/
  ├── layout.tsx                 # Add QueryClientProvider
  └── page.tsx                   # Refactor to use new hooks

components/
  └── NoteEditor\.tsx            # Add optimistic updates
```

## Implementation Notes
**Key technical details to remember:**

### Core Features

#### 1. Database Indexes
**File:** `supabase/migrations/YYYYMMDD_add_performance_indexes.sql`

```sql
-- Index for main query (user + updated_at)
CREATE INDEX IF NOT EXISTS idx_notes_user_updated 
ON notes(user_id, updated_at DESC) 
WHERE user_id IS NOT NULL;

-- Full-text search index
CREATE INDEX IF NOT EXISTS idx_notes_fts 
ON notes USING GIN (
  to_tsvector('english', coalesce(title, '') || ' ' || coalesce(description, ''))
);

-- Tag filtering index
CREATE INDEX IF NOT EXISTS idx_notes_tags 
ON notes USING GIN (tags);

-- Analyze table after creating indexes
ANALYZE notes;
```

**Apply migration:**
```bash
supabase db push
```

#### 2. Paginated Fetching Hook
**File:** `hooks/useNotesQuery.ts`

```javascript
import { useInfiniteQuery } from '@tanstack/react-query'
import { createClient } from '@ui/web/adapters/supabaseClient'

const PAGE_SIZE = 20

export function useNotesQuery({ searchQuery = '', selectedTag = null }) {
  const supabase = createClient()
  
  return useInfiniteQuery({
    queryKey: ['notes', searchQuery, selectedTag],
    queryFn: async ({ pageParam = 0 }) => {
      let query = supabase
        .from('notes')
        .select('id, title, description, tags, created_at, updated_at', { count: 'exact' })
        .order('updated_at', { ascending: false })
        .range(pageParam, pageParam + PAGE_SIZE - 1)
      
      // Apply search filter
      if (searchQuery) {
        query = query.textSearch('title,description', searchQuery, {
          type: 'websearch',
          config: 'english'
        })
      }
      
      // Apply tag filter
      if (selectedTag) {
        query = query.contains('tags', [selectedTag])
      }
      
      const { data, error, count } = await query
      
      if (error) throw error
      
      return {
        notes: data,
        nextCursor: data.length === PAGE_SIZE ? pageParam + PAGE_SIZE : undefined,
        totalCount: count
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextCursor,
    staleTime: 1000 * 60 * 5, // 5 minutes
  })
}
```

#### 3. Virtual Scrolling Component
**File:** `components/NotesList\.tsx`

```javascript
import { FixedSizeList } from 'react-window'
import { NoteListItem } from './NoteListItem'
import { NoteListSkeleton } from './NoteListSkeleton'

export function NotesList({ 
  notes, 
  selectedNoteId, 
  onNoteClick,
  hasMore,
  loadMore,
  isLoading 
}) {
  const itemCount = hasMore ? notes.length + 1 : notes.length
  
  const Row = ({ index, style }) => {
    if (index >= notes.length) {
      // Loading more indicator
      return (
        <div style={style}>
          <NoteListSkeleton />
        </div>
      )
    }
    
    const note = notes[index]
    return (
      <div style={style}>
        <NoteListItem
          note={note}
          isSelected={note.id === selectedNoteId}
          onClick={onNoteClick}
        />
      </div>
    )
  }
  
  const handleItemsRendered = ({ visibleStopIndex }) => {
    // Load more when near the end
    if (visibleStopIndex >= notes.length - 5 && hasMore && !isLoading) {
      loadMore()
    }
  }
  
  return (
    <FixedSizeList
      height={600}
      itemCount={itemCount}
      itemSize={80}
      width="100%"
      onItemsRendered={handleItemsRendered}
    >
      {Row}
    </FixedSizeList>
  )
}
```

#### 4. Optimized List Item
**File:** `components/NoteListItem\.tsx`

```javascript
import React from 'react'
import { Badge } from '@/components/ui/badge'

export const NoteListItem = React.memo(({ note, isSelected, onClick }) => {
  return (
    <div
      className={`p-3 cursor-pointer hover:bg-accent transition-colors ${
        isSelected ? 'bg-accent' : ''
      }`}
      onClick={() => onClick(note.id)}
    >
      <h3 className="font-medium truncate">{note.title || 'Untitled'}</h3>
      <p className="text-sm text-muted-foreground truncate">
        {note.description?.substring(0, 100) || 'No content'}
      </p>
      <div className="flex gap-1 mt-1">
        {note.tags?.slice(0, 3).map(tag => (
          <Badge key={tag} variant="secondary" className="text-xs">
            {tag}
          </Badge>
        ))}
      </div>
    </div>
  )
}, (prev, next) => {
  // Only re-render if these props change
  return (
    prev.note.id === next.note.id &&
    prev.note.updated_at === next.note.updated_at &&
    prev.isSelected === next.isSelected
  )
})

NoteListItem.displayName = 'NoteListItem'
```

#### 5. IndexedDB Cache
**File:** `lib/cache/indexedDB.ts`

```javascript
import { openDB } from 'idb'

const DB_NAME = 'everfreenote-cache'
const STORE_NAME = 'cache'
const DB_VERSION = 1

class CacheManager {
  constructor() {
    this.db = null
  }
  
  async init() {
    if (this.db) return this.db
    
    try {
      this.db = await openDB(DB_NAME, DB_VERSION, {
        upgrade(db) {
          if (!db.objectStoreNames.contains(STORE_NAME)) {
            db.createObjectStore(STORE_NAME)
          }
        },
      })
      return this.db
    } catch (error) {
      console.error('Failed to initialize IndexedDB:', error)
      return null
    }
  }
  
  async get(key) {
    const db = await this.init()
    if (!db) return null
    
    try {
      const entry = await db.get(STORE_NAME, key)
      if (!entry) return null
      
      // Check if expired
      if (entry.expiresAt && entry.expiresAt < Date.now()) {
        await this.delete(key)
        return null
      }
      
      return entry.data
    } catch (error) {
      console.error('Cache get error:', error)
      return null
    }
  }
  
  async set(key, data, ttl = 1000 * 60 * 5) {
    const db = await this.init()
    if (!db) return false
    
    try {
      await db.put(STORE_NAME, {
        data,
        timestamp: Date.now(),
        expiresAt: Date.now() + ttl
      }, key)
      return true
    } catch (error) {
      console.error('Cache set error:', error)
      return false
    }
  }
  
  async delete(key) {
    const db = await this.init()
    if (!db) return false
    
    try {
      await db.delete(STORE_NAME, key)
      return true
    } catch (error) {
      console.error('Cache delete error:', error)
      return false
    }
  }
  
  async clear() {
    const db = await this.init()
    if (!db) return false
    
    try {
      await db.clear(STORE_NAME)
      return true
    } catch (error) {
      console.error('Cache clear error:', error)
      return false
    }
  }
}

export const cacheManager = new CacheManager()
```

#### 6. React Query Setup
**File:** `app/layout.tsx`

```javascript
'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { useState } from 'react'

export default function RootLayout({ children }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 1000 * 60 * 5, // 5 minutes
        cacheTime: 1000 * 60 * 30, // 30 minutes
        refetchOnWindowFocus: false,
        retry: 3,
      },
    },
  }))
  
  return (
    <html lang="en" suppressHydrationWarning>
      <body suppressHydrationWarning>
        <QueryClientProvider client={queryClient}>
          {/* existing providers */}
          {children}
        </QueryClientProvider>
      </body>
    </html>
  )
}
```

### Patterns & Best Practices

#### Debouncing
```javascript
import { useMemo } from 'react'
import debounce from 'lodash/debounce'

// In component
const debouncedSearch = useMemo(
  () => debounce((value) => {
    setSearchQuery(value)
  }, 300),
  []
)
```

#### Optimistic Updates
```javascript
const { mutate } = useMutation({
  mutationFn: updateNote,
  onMutate: async (newNote) => {
    // Cancel outgoing refetches
    await queryClient.cancelQueries(['notes'])
    
    // Snapshot previous value
    const previousNotes = queryClient.getQueryData(['notes'])
    
    // Optimistically update
    queryClient.setQueryData(['notes'], (old) => {
      // Update logic here
    })
    
    // Return context with snapshot
    return { previousNotes }
  },
  onError: (err, newNote, context) => {
    // Rollback on error
    queryClient.setQueryData(['notes'], context.previousNotes)
  },
  onSettled: () => {
    // Refetch after mutation
    queryClient.invalidateQueries(['notes'])
  },
})
```

#### Memoization
```javascript
// Memoize expensive computations
const sortedNotes = useMemo(() => {
  return notes.sort((a, b) => 
    new Date(b.updated_at) - new Date(a.updated_at)
  )
}, [notes])

// Memoize callbacks
const handleNoteClick = useCallback((noteId) => {
  setSelectedNote(noteId)
}, [])
```

## Integration Points
**How do pieces connect?**

### React Query + Supabase
- React Query manages cache and refetching
- Supabase handles data fetching
- Queries invalidated on mutations

### Virtual Scrolling + Infinite Query
- react-window renders visible items
- useInfiniteQuery loads pages on scroll
- Seamless integration via `onItemsRendered`

### IndexedDB + React Query
- IndexedDB provides persistent cache
- React Query handles in-memory cache
- Two-level caching strategy

## Error Handling
**How do we handle failures?**

### Query Errors
```javascript
const { data, error, isError } = useNotesQuery()

if (isError) {
  return (
    <div className="p-4 text-center">
      <p className="text-destructive">Failed to load notes</p>
      <Button onClick={() => refetch()}>Retry</Button>
    </div>
  )
}
```

### Mutation Errors
```javascript
const { mutate } = useMutation({
  onError: (error) => {
    toast.error(`Failed to save: ${error.message}`)
    // Rollback optimistic update
  }
})
```

### Cache Errors
```javascript
try {
  await cacheManager.set(key, data)
} catch (error) {
  console.error('Cache error:', error)
  // Continue without cache (graceful degradation)
}
```

## Performance Considerations
**How do we keep it fast?**

### Query Optimization
- Use `.select()` to fetch only needed fields
- Add `.limit()` to all queries
- Use indexes for filtering/sorting
- Avoid N+1 queries

### Rendering Optimization
- Use `React.memo` for list items
- Implement custom comparison functions
- Avoid inline function definitions
- Use `useCallback` for event handlers

### Memory Management
- Clear cache periodically
- Limit query cache size
- Unsubscribe from queries on unmount
- Use weak references where possible

## Security Notes
**What security measures are in place?**

### No Changes to Security Model
- All queries still user-scoped via RLS
- No new authentication needed
- Cache is origin-isolated

### Cache Security
- No sensitive data in cache keys
- Cache cleared on logout
- IndexedDB is same-origin only


