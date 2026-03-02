---
phase: implementation
title: RAG Note Indexing UI — Implementation Guide
description: Technical notes for implementing per-note RAG controls in the web app
---

# Implementation Guide

## Development Setup

1. Add to `ui/web/package.json`:
   ```json
   "@langchain/google-genai": "^0.1.x",
   "node-html-parser": "^6.x"
   ```
2. Add to `ui/web/.env.local`:
   ```
   GEMINI_API_KEY=your-key
   SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
   ```
3. Migrations already applied locally (`20260302000002`, `20260302000003`)

## Code Structure

```
ui/web/
  app/api/notes/[id]/rag/
    route.ts                          ← POST (index) + DELETE (remove)
  lib/rag/
    chunker.ts                        ← stripHtml + chunkText
    embeddings.ts                     ← Gemini embeddings wrapper (1536 dims)
    ragIndexService.ts                ← indexNote + deleteNoteIndex
  hooks/
    useRagStatus.ts                   ← polling hook (3s interval)
  components/features/notes/
    RagIndexPanel.tsx                 ← UI: buttons + status
    NoteEditor.tsx                    ← (modified) add RagIndexPanel
    NoteView.tsx                      ← (modified) add RagIndexPanel
```

## Implementation Notes

### Chunker (`lib/rag/chunker.ts`)
```typescript
export function stripHtml(html: string): string {
  const root = parse(html)
  return root.textContent.replace(/\s+/g, ' ').trim()
}

export function chunkText(
  text: string,
  chunkSize = 1500,
  overlap = 200
): Array<{ content: string; charOffset: number }> {
  const chunks = []
  let offset = 0
  while (offset < text.length) {
    const content = text.slice(offset, offset + chunkSize)
    chunks.push({ content, charOffset: offset })
    offset += chunkSize - overlap
    if (content.length < chunkSize) break
  }
  return chunks
}
```

### Embeddings (`lib/rag/embeddings.ts`)
```typescript
import { GoogleGenerativeAIEmbeddings } from '@langchain/google-genai'

export function createEmbeddings() {
  return new GoogleGenerativeAIEmbeddings({
    apiKey: process.env.GEMINI_API_KEY!,
    modelName: 'models/gemini-embedding-001',
    taskType: 'RETRIEVAL_DOCUMENT',
    outputDimensionality: 1536,
  })
}
```

### ragIndexService (`lib/rag/ragIndexService.ts`)
Key logic for `indexNote`:
1. Fetch note from `notes` table (title + description)
2. `stripHtml(description)` → prepend title → `chunkText()`
3. `DELETE FROM note_embeddings WHERE note_id = ? AND user_id = ?`
4. Batch embed all chunks via `embeddings.embedDocuments()`
5. Upsert all rows into `note_embeddings`
6. Return chunk count

### API Route (`app/api/notes/[id]/rag/route.ts`)
```typescript
import { createRouteHandlerClient } from '@supabase/auth-helpers-nextjs'
import { createClient } from '@supabase/supabase-js'
import { cookies } from 'next/headers'

export async function POST(req, { params }) {
  // 1. Validate session
  const supabase = createRouteHandlerClient({ cookies })
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return Response.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Service client for writes
  const serviceClient = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  )

  const { chunkCount } = await indexNote(params.id, user.id, serviceClient)
  return Response.json({ chunkCount })
}
```

### useRagStatus hook
```typescript
useEffect(() => {
  const fetch = async () => {
    const { data } = await supabase
      .from('note_embeddings')
      .select('chunk_index, indexed_at')
      .eq('note_id', noteId)
    setStatus({ chunkCount: data?.length ?? 0, indexedAt: data?.[0]?.indexed_at ?? null })
  }
  fetch()
  const interval = setInterval(fetch, 3000)
  return () => clearInterval(interval)
}, [noteId])
```

## Integration Points

- `NoteEditor.tsx` — add `<RagIndexPanel noteId={note.id} />` in header `div` after existing buttons
- `NoteView.tsx` — same pattern

## Error Handling

- API route: catch all errors, return `500` with `{ error: message }`
- `RagIndexPanel`: on non-2xx response, set `error` state, display inline
- Gemini PROHIBITED_CONTENT: shouldn't occur with single-chunk short content; if it does, surface error to user
