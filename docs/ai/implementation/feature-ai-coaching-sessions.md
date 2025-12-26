---
phase: implementation
title: Implementation Notes
description: Edge function implementation details for AI coaching sessions
feature: ai-coaching-sessions
---

# Implementation: AI Coaching Sessions

## Files Added
- `supabase/functions/save-session/index.ts`
- `supabase/functions/get-sessions/index.ts`
- `supabase/functions/search-sessions/index.ts`
- `supabase/functions/update-session/index.ts`
- `supabase/functions/**/deno.json`
- `supabase/functions/**/import_map.json`

## Environment Variables
- `SUPABASE_URL`
- `SUPABASE_SERVICE_ROLE_KEY`
- `COACHING_USER_ID` (required target user)

## Behavior Summary
- **save-session**:
  - Accepts `{ topic, content }` (content <= 50KB).
  - Creates title `Session YYYY-MM-DD - {topic}` (UTC date).
  - Inserts note with `tags = ['claude-therapy']` for `COACHING_USER_ID`.

- **get-sessions**:
  - Reads `limit` (default 3, max 20).
  - Returns latest session notes by `created_at desc`.

- **search-sessions**:
  - Builds tsquery from `q` and uses `search_notes_fts` RPC.
  - Filters by tag `claude-therapy`.

- **update-session**:
  - Accepts `{ id, mode, content?, append?, topic? }` (<= 50KB).
  - `mode="replace"` replaces `description`; `mode="append"` appends to it.
  - Optional `topic` updates `title` (keeps original date).

## CORS
All functions return CORS headers for cross-origin calls from Claude.

## Deployment Notes
Use Supabase CLI:
```
supabase functions deploy save-session
supabase functions deploy get-sessions
supabase functions deploy search-sessions
```
Set secrets in Supabase dashboard: `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, and `COACHING_USER_ID` if needed.
