---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
feature: full-text-search-optimization
---

# Implementation Guide: Full-Text Search Optimization

## Development Setup
**How do we get started?**

**Prerequisites:**
- ✅ PostgreSQL 14+ с FTS индексами (уже настроено)
- ✅ Node.js 18+ и npm
- ✅ Supabase project с credentials

**Environment setup:**
```bash
# Проверить что FTS индексы существуют
npm run supabase:db:status

# Сгенерировать test data если нужно
node scripts/generate-test-notes.ts --count 10000

# Запустить dev server
npm run dev
```

**Configuration:**
- Supabase credentials в `.env.local`
- FTS language configs в `lib/supabase/search.ts`
- Query limits: max 1000 символов, min 3 символа для prefix matching

## Code Structure
**How is the code organized?**

**New/Modified files:**
```
supabase/migrations/
  └── 20251021_add_fts_search_function.sql  # NEW: RPC function

lib/supabase/
  ├── search.ts              # NEW: FTS search functions
  └── client.ts              # Existing: Supabase client

app/api/notes/
  └── search/
      └── route.ts           # MODIFIED: Use FTS

hooks/
  └── useNotesQuery.ts       # MODIFIED: Add search hook

components/
  ├── SearchResults\.tsx      # NEW/MODIFIED: Display highlighted results
  └── VirtualNoteList\.tsx    # MODIFIED: Integrate search

tests/
  ├── unit/
  │   └── search\.test\.ts     # NEW: Unit tests for FTS
  └── e2e/
      └── search.cy.js       # NEW: E2E tests for search
```

## Implementation Notes
**Key technical details to remember:**

### Core Feature 1: FTS Search Function

**File**: `lib/supabase/search.ts`

```javascript
/**
 * Search notes using PostgreSQL Full-Text Search
 * @param {string} query - Search query
 * @param {string} userId - User ID for RLS
 * @param {Object} options - Search options
 * @param {string} options.language - Language code (ru, en, uk)
 * @param {number} options.minRank - Minimum ts_rank threshold
 * @param {number} options.limit - Results limit
 * @param {number} options.offset - Pagination offset
 * @returns {Promise<{results: Array, total: number, executionTime: number}>}
 */
export async function searchNotesFTS(query, userId, options = {}) {
  const startTime = Date.now();
  
  const {
    language = 'ru',
    minRank = 0.1,
    limit = 20,
    offset = 0
  } = options;
  
  // Map language code to PostgreSQL FTS config
  const ftsLanguage = FTS_LANGUAGES[language] || 'russian';
  
  // Build ts_query with sanitization
  const tsQuery = buildTsQuery(query, ftsLanguage);
  
  // Execute FTS query
  const { data, error, count } = await supabase
    .rpc('search_notes_fts', {
      search_query: tsQuery,
      search_language: ftsLanguage,
      min_rank: minRank,
      result_limit: limit,
      result_offset: offset,
      search_user_id: userId
    });
  
  if (error) throw error;
  
  const executionTime = Date.now() - startTime;
  
  return {
    results: data || [],
    total: count || 0,
    executionTime
  };
}
```

**Key points:**
- Sanitize input через `buildTsQuery()`
- Language mapping: ru/en/uk → russian/english
- Использовать RPC function для complex query
- Track execution time для мониторинга

### Core Feature 2: Database RPC Function

**File**: `supabase/migrations/20251021_add_fts_search_function.sql`

```sql
-- Create RPC function for FTS search with highlighting
CREATE OR REPLACE FUNCTION search_notes_fts(
  search_query text,
  search_language regconfig,
  min_rank float DEFAULT 0.1,
  result_limit int DEFAULT 20,
  result_offset int DEFAULT 0,
  search_user_id uuid DEFAULT NULL
)
RETURNS TABLE (
  id uuid,
  title text,
  content text,
  tags text[],
  rank real,
  headline text,
  created_at timestamptz,
  updated_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT 
    n.id,
    n.title,
    n.content,
    n.tags,
    ts_rank(
      to_tsvector(search_language, 
        coalesce(n.title, '') || ' ' || 
        coalesce(n.content, '') || ' ' || 
        coalesce(array_to_string(n.tags, ' '), '')
      ),
      to_tsquery(search_language, search_query)
    )::real as rank,
    ts_headline(
      search_language,
      coalesce(n.content, ''),
      to_tsquery(search_language, search_query),
      'MaxWords=50, MinWords=25, MaxFragments=3, StartSel=<mark>, StopSel=</mark>'
    ) as headline,
    n.created_at,
    n.updated_at
  FROM notes n
  WHERE n.user_id = search_user_id
    AND to_tsvector(search_language, 
          coalesce(n.title, '') || ' ' || 
          coalesce(n.content, '') || ' ' || 
          coalesce(array_to_string(n.tags, ' '), '')
        ) @@ to_tsquery(search_language, search_query)
    AND ts_rank(
          to_tsvector(search_language, 
            coalesce(n.title, '') || ' ' || 
            coalesce(n.content, '') || ' ' || 
            coalesce(array_to_string(n.tags, ' '), '')
          ),
          to_tsquery(search_language, search_query)
        ) >= min_rank
  ORDER BY rank DESC
  LIMIT result_limit
  OFFSET result_offset;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

**Key points:**
- `SECURITY DEFINER` для RLS bypass (но проверяем user_id)
- `ts_headline` с custom markers: `<mark>...</mark>`
- Filter by `min_rank` для качества результатов
- `coalesce()` для NULL safety

### Core Feature 3: Query Sanitization

**File**: `lib/supabase/search.ts`

```javascript
/**
 * Build sanitized ts_query string
 * Handles special characters and adds prefix matching
 */
function buildTsQuery(query, language) {
  if (!query || typeof query !== 'string') {
    throw new Error('Invalid search query');
  }
  
  // Remove special FTS characters that could break query
  const sanitized = query
    .trim()
    .replace(/[&|!():<>]/g, ' ')  // Remove FTS operators
    .replace(/\s+/g, ' ')          // Normalize whitespace
    .split(' ')
    .filter(word => word.length > 0)
    .map(word => `${word}:*`)      // Add prefix matching
    .join(' & ');                   // AND between words
  
  if (!sanitized) {
    throw new Error('Empty search query after sanitization');
  }
  
  return sanitized;
}

// Examples:
// "hello world" → "hello:* & world:*"
// "test!" → "test:*"
// "a & b | c" → "a:* & b:* & c:*"
```

**Key points:**
- Remove FTS operators для безопасности
- Add `:*` для prefix matching (находит "running" по "run")
- Join с `&` (AND) для поиска всех слов
- Validate input

### Core Feature 4: ILIKE Fallback

**File**: `lib/supabase/search.ts`

```javascript
/**
 * Fallback search using ILIKE
 * Used when FTS fails or for edge cases
 */
export async function searchNotesILIKE(query, userId, options = {}) {
  const startTime = Date.now();
  
  const { limit = 20, offset = 0 } = options;
  
  // Simple ILIKE pattern
  const pattern = `%${query}%`;
  
  const { data, error, count } = await supabase
    .from('notes')
    .select('*', { count: 'exact' })
    .eq('user_id', userId)
    .or(`title.ilike.${pattern},content.ilike.${pattern}`)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);
  
  if (error) throw error;
  
  const executionTime = Date.now() - startTime;
  
  return {
    results: data || [],
    total: count || 0,
    executionTime
  };
}
```

**Key points:**
- Простой ILIKE pattern без сложной логики
- Сортировка по `updated_at` (нет ranking)
- Тот же response format что и FTS
- Используется только при FTS ошибках

### Core Feature 5: API Endpoint with Fallback

**File**: `app/api/notes/search/route.ts`

```javascript
export async function GET(request) {
  try {
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('q');
    const language = searchParams.get('lang') || 'ru';
    
    if (!query) {
      return NextResponse.json({ results: [], total: 0 });
    }
    
    // Get user from session
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
    
    let results, total, executionTime, method;
    
    try {
      // Try FTS first
      const ftsResult = await searchNotesFTS(query, user.id, { language });
      results = ftsResult.results;
      total = ftsResult.total;
      executionTime = ftsResult.executionTime;
      method = 'fts';
    } catch (ftsError) {
      // Fallback to ILIKE on FTS error
      console.warn('FTS search failed, falling back to ILIKE:', ftsError);
      
      const ilikeResult = await searchNotesILIKE(query, user.id);
      results = ilikeResult.results;
      total = ilikeResult.total;
      executionTime = ilikeResult.executionTime;
      method = 'ilike';
    }
    
    return NextResponse.json({
      results,
      total,
      query,
      method,
      executionTime
    });
    
  } catch (error) {
    console.error('Search error:', error);
    return NextResponse.json(
      { error: 'Search failed' },
      { status: 500 }
    );
  }
}
```

**Key points:**
- Try FTS first, catch → fallback ILIKE
- Log fallback usage для мониторинга
- Return `method` field для debugging
- Unified error handling

### Patterns & Best Practices

**Pattern 1: Try-Catch Fallback**
```javascript
try {
  return await primaryMethod();
} catch (error) {
  console.warn('Primary failed, using fallback:', error);
  return await fallbackMethod();
}
```

**Pattern 2: Input Sanitization**
```javascript
// Always sanitize user input before FTS
const sanitized = sanitizeInput(userInput);
if (!sanitized) throw new Error('Invalid input');
```

**Pattern 3: Performance Tracking**
```javascript
const startTime = Date.now();
// ... operation ...
const executionTime = Date.now() - startTime;
return { data, executionTime };
```

## Integration Points
**How do pieces connect?**

**Flow diagram:**
```
User Input → Frontend Search Component
  ↓
useSearchNotes Hook (React Query)
  ↓
GET /api/notes/search?q=...&lang=ru
  ↓
Try: searchNotesFTS()
  ↓
Supabase RPC: search_notes_fts()
  ↓
PostgreSQL: FTS Query + ts_headline
  ↓
Results → Frontend → Display with Highlighting
```

**Frontend integration:**
```javascript
// hooks/useNotesQuery.ts
export function useSearchNotes(query, options = {}) {
  return useQuery({
    queryKey: ['notes', 'search', query, options],
    queryFn: async () => {
      const params = new URLSearchParams({
        q: query,
        lang: options.language || 'ru'
      });
      const res = await fetch(`/api/notes/search?${params}`);
      return res.json();
    },
    enabled: query.length > 0,
    staleTime: 30000, // Cache for 30s
  });
}
```

## Error Handling
**How do we handle failures?**

**Error hierarchy:**
1. **Input validation errors** → Return 400 Bad Request
2. **FTS query errors** → Fallback to ILIKE (transparent to user)
3. **ILIKE errors** → Return 500 Internal Server Error
4. **Auth errors** → Return 401 Unauthorized

**Logging strategy:**
```javascript
// Log FTS fallback usage (important for monitoring)
console.warn('FTS fallback triggered', {
  query,
  userId,
  error: ftsError.message
});

// Log performance issues
if (executionTime > 1000) {
  console.warn('Slow search query', {
    query,
    executionTime,
    method
  });
}
```

## Performance Considerations
**How do we keep it fast?**

**Optimization strategies:**
1. **Use existing GIN index** - `idx_notes_fts` уже оптимизирован
2. **Limit result set** - Default limit=20, max=100
3. **Pagination** - Use offset для больших result sets
4. **Min rank threshold** - Filter low-relevance results (minRank=0.1)
5. **React Query caching** - Cache results на клиенте (30s)

**Query optimization:**
```sql
-- Good: Use index
WHERE to_tsvector(...) @@ to_tsquery(...)

-- Bad: Function on both sides (can't use index)
WHERE to_tsvector(...) @@ plainto_tsquery(...)  -- slower
```

**Caching approach:**
- Client-side: React Query (30s stale time)
- Server-side: Нет (PostgreSQL достаточно быстрый)
- Future: Redis cache для популярных запросов

## Security Notes
**What security measures are in place?**

**Input validation:**
```javascript
// Sanitize FTS special characters
const sanitized = query.replace(/[&|!():<>]/g, ' ');

// Validate length
if (query.length > 1000) {
  throw new Error('Query too long');
}

// Minimum length for better performance
if (query.trim().length < 3) {
  throw new Error('Query too short (min 3 characters)');
}
```

**RLS enforcement:**
```sql
-- RPC function checks user_id
WHERE n.user_id = search_user_id
```

**SQL injection prevention:**
- Используем parameterized queries через Supabase RPC
- Sanitize input перед to_tsquery
- Никогда не конкатенируем user input в SQL

**XSS prevention:**
```javascript
// Sanitize HTML in headlines before rendering
import DOMPurify from 'dompurify';

const cleanHeadline = DOMPurify.sanitize(headline, {
  ALLOWED_TAGS: ['mark'],  // Only allow <mark> tags
  ALLOWED_ATTR: []
});
```

