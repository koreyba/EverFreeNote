---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
feature: full-text-search-optimization
---

# System Design & Architecture: Full-Text Search Optimization

## Architecture Overview
**What is the high-level system structure?**

```mermaid
graph TD
    Client[Next.js Client] -->|Search Query| RQ[React Query Cache]
    RQ -->|Cache Hit| Client
    RQ -->|Cache Miss| API[/api/notes/search]
    API -->|FTS Query| FTS[FTS Search Function]
    API -->|Fallback| ILIKE[ILIKE Search Function]
    FTS -->|ts_query + ts_rank| DB[(PostgreSQL + FTS Index)]
    ILIKE -->|ILIKE pattern| DB
    FTS -->|Results + Rank| Highlight[ts_headline Processor]
    Highlight -->|Highlighted Results| API
    API -->|JSON Response| RQ
    RQ -->|Cached| Client
    
    style FTS fill:#90EE90
    style ILIKE fill:#FFB6C1
    style DB fill:#87CEEB
    style RQ fill:#FFD700
```

**Key components:**
1. **React Query Cache** - клиентское кэширование результатов (30s stale time)
2. **FTS Search Function** - основная логика поиска через `to_tsquery` и `ts_rank`
3. **ILIKE Fallback** - запасной вариант при FTS ошибках
4. **Highlighting Processor** - обработка результатов через `ts_headline`
5. **Search API Endpoint** - оркестрация поиска и обработка ошибок

**Language Detection Strategy:**
- Default: browser locale (`navigator.language`)
- Override: query parameter `?lang=ru|en|uk`
- Fallback: 'ru' если язык не определен или не поддерживается

**Technology stack:**
- PostgreSQL Full-Text Search (встроенный)
- Supabase JS Client для запросов
- Next.js API Routes для backend
- React Query для кэширования на клиенте

## Data Models
**What data do we need to manage?**

**Existing schema (notes table):**
```sql
CREATE TABLE notes (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users,
  title TEXT,
  content TEXT,
  tags TEXT[],
  created_at TIMESTAMPTZ,
  updated_at TIMESTAMPTZ
);

-- Existing FTS index
CREATE INDEX idx_notes_fts ON notes 
USING gin(to_tsvector('simple', 
  coalesce(title, '') || ' ' || 
  coalesce(content, '') || ' ' || 
  coalesce(array_to_string(tags, ' '), '')
));
```

**FTS query structure:**
```typescript
interface SearchQuery {
  query: string;           // User search input
  language?: 'ru' | 'en' | 'uk';  // Language for stemming
  minRank?: number;        // Minimum ts_rank threshold (default: 0.1)
  limit?: number;          // Results limit
  offset?: number;         // Pagination offset
}

interface SearchResult {
  id: string;
  title: string;
  content: string;
  tags: string[];
  rank: number;            // ts_rank score
  headline: string;        // Highlighted fragment
  created_at: string;
  updated_at: string;
}
```

**Data flow:**
1. User input → sanitize → to_tsquery
2. FTS search → ts_rank calculation
3. Results → ts_headline processing
4. Sorted by rank → return to client

## API Design
**How do components communicate?**

**Updated API endpoint:**
```typescript
// GET /api/notes/search?q=keyword&lang=ru
// Response:
{
  "results": [
    {
      "id": "uuid",
      "title": "Note title",
      "content": "Full content...",
      "tags": ["tag1", "tag2"],
      "rank": 0.85,
      "headline": "...found <b>keyword</b> in text...",
      "created_at": "2025-01-01T00:00:00Z",
      "updated_at": "2025-01-01T00:00:00Z"
    }
  ],
  "total": 42,
  "query": "keyword",
  "method": "fts" | "ilike",  // Which search method was used
  "executionTime": 45  // ms
}
```

**FTS SQL query structure:**
```sql
SELECT 
  id, title, content, tags, created_at, updated_at,
  ts_rank(
    to_tsvector('russian', title || ' ' || content || ' ' || array_to_string(tags, ' ')),
    to_tsquery('russian', 'keyword:*')
  ) as rank,
  ts_headline(
    'russian',
    content,
    to_tsquery('russian', 'keyword:*'),
    'MaxWords=50, MinWords=25, MaxFragments=3'
  ) as headline
FROM notes
WHERE user_id = $1
  AND to_tsvector('russian', title || ' ' || content || ' ' || array_to_string(tags, ' '))
      @@ to_tsquery('russian', 'keyword:*')
  AND ts_rank(...) > 0.1
ORDER BY rank DESC
LIMIT 20 OFFSET 0;
```

**Language mapping:**
```typescript
const FTS_LANGUAGES = {
  'ru': 'russian',
  'en': 'english',
  'uk': 'russian',  // PostgreSQL doesn't have ukrainian, use russian as closest
                     // TODO: Consider custom ukrainian dictionary in future
};
```

**Note**: Украинский использует russian config как временное решение. Для лучшего качества можно добавить custom dictionary позже.

## Component Breakdown
**What are the major building blocks?**

**Backend (New/Modified):**
1. `lib/supabase/search.ts` - FTS search functions (NEW)
   - `searchNotesFTS()` - main FTS search
   - `searchNotesILIKE()` - fallback search
   - `sanitizeSearchQuery()` - input sanitization
   - `buildTsQuery()` - construct to_tsquery string

2. `app/api/notes/search/route.ts` - API endpoint (MODIFIED)
   - Try FTS first
   - Catch errors → fallback to ILIKE
   - Add execution time tracking
   - Return unified response

3. `supabase/migrations/20251021_add_fts_search_function.sql` - Database RPC (NEW)
   - Create `search_notes_fts()` RPC function
   - Implements ts_rank and ts_headline
   - Security: SECURITY DEFINER with user_id check

**Frontend (Modified):**
1. `hooks/useNotesQuery.ts` - add search query hook
   - Use React Query for caching
   - Debounce search input

2. `components/SearchResults\.tsx` - display highlighted results
   - Render headline with HTML (sanitized)
   - Show relevance score (optional)

**Database:**
- Existing `idx_notes_fts` index (no changes needed)
- New RPC function `search_notes_fts()` for complex FTS queries

## Design Decisions
**Why did we choose this approach?**

### 1. Use existing FTS index
**Decision**: Использовать существующий `idx_notes_fts` индекс
**Rationale**: Индекс уже создан, не нужно миграций
**Alternative**: Создать новый GIN индекс с разными весами для title/content
**Trade-off**: Все поля имеют одинаковый вес (можно улучшить позже)

### 2. Keep ILIKE fallback
**Decision**: Сохранить ILIKE как fallback при FTS ошибках
**Rationale**: Надежность важнее производительности в edge cases
**Alternative**: Возвращать ошибку при FTS проблемах
**Trade-off**: Немного сложнее код, но лучше UX

### 3. Use ts_rank for relevance
**Decision**: Использовать `ts_rank()` для сортировки результатов
**Rationale**: Встроенная функция PostgreSQL, проверенная временем
**Alternative**: `ts_rank_cd()` (более сложный алгоритм)
**Trade-off**: ts_rank проще и быстрее, достаточно для наших нужд

### 4. Language-specific stemming
**Decision**: Использовать разные FTS конфигурации для ru/en/uk
**Rationale**: Лучшее качество поиска для каждого языка
**Alternative**: Использовать 'simple' для всех языков
**Trade-off**: Нужно определять язык запроса (можем детектить автоматически)

### 5. Prefix matching with :*
**Decision**: Использовать `:*` для prefix matching в to_tsquery
**Rationale**: Находит слова начинающиеся с запроса (лучше UX)
**Alternative**: Точное совпадение без :*
**Trade-off**: Немного медленнее, но намного удобнее для пользователей. Prefix matching может быть медленнее для очень коротких префиксов (1-2 буквы), но мы можем добавить минимальную длину запроса (3+ символа) если нужно.

### 6. ts_headline for highlighting
**Decision**: Использовать `ts_headline()` для подсветки фрагментов
**Rationale**: Встроенная функция, автоматически выбирает релевантные фрагменты
**Alternative**: Клиентский highlighting через regex
**Trade-off**: Дополнительная нагрузка на БД, но лучше качество

## Non-Functional Requirements
**How should the system perform?**

**Performance targets:**
- Search latency: < 100ms (p95) для 10K записей
- Search latency: < 500ms (p95) для 1M записей
- Throughput: 100+ queries/sec на стандартном Supabase tier

**Scalability considerations:**
- FTS индексы масштабируются логарифмически O(log n)
- GIN индексы эффективны до миллионов записей
- Pagination для больших result sets

**Security requirements:**
- Input sanitization для предотвращения SQL injection
- RLS policies применяются (user_id filter в RPC функции)
- Не возвращаем заметки других пользователей
- String concatenation в `to_tsvector()` безопасна (не SQL injection)
- `coalesce()` защищает от NULL values во всех полях
- RPC функция использует `SECURITY DEFINER` но проверяет `user_id`

**Reliability/availability:**
- Fallback на ILIKE при FTS ошибках
- Graceful degradation (поиск всегда работает)
- Error logging для мониторинга fallback usage

