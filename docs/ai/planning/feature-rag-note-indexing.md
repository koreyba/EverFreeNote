---
phase: planning
title: RAG Note Indexing - Planning (POC)
description: Task breakdown and milestone tracking for script-based RAG proof of concept
---

# RAG Note Indexing - Planning (POC)

## Milestones

- [x] M1: Supabase vector groundwork completed (table + RPC path)
- [x] M2: Indexing script completed (notes -> embeddings -> pgvector)
- [x] M3: Query script completed (question -> retrieval -> LLM answer)
- [x] M4: POC manually validated and documented

Note: milestone checkboxes track outcome-level completion. The detailed Phase 1-5 checklist below is retained as the original execution plan and is not backfilled retroactively.

## Task Breakdown

### Phase 1: Supabase Setup

- [ ] 1.1 Enable pgvector locally if needed
- [ ] 1.2 Create `note_embeddings` migration
- [ ] 1.3 Create `match_notes` RPC migration
- [ ] 1.4 Apply migrations to staging

### Phase 2: Script Scaffold

- [ ] 2.1 Create `scripts/rag-poc/`
- [ ] 2.2 Initialize `package.json` and dependencies
- [ ] 2.3 Configure TypeScript
- [ ] 2.4 Add `.env.example` and `README.md`
- [ ] 2.5 Add `lib/supabase.ts`
- [ ] 2.6 Add `lib/html-utils.ts`
- [ ] 2.7 Add `lib/embeddings.ts`

### Phase 3: Indexing

- [ ] 3.1 Implement `index.ts` note fetch
- [ ] 3.2 Implement HTML -> text conversion
- [ ] 3.3 Implement Gemini embeddings call
- [ ] 3.4 Persist vectors/upserts
- [ ] 3.5 Add progress logging and error handling

### Phase 4: Query + Answer

- [ ] 4.1 Implement `query.ts` CLI input
- [ ] 4.2 Embed question
- [ ] 4.3 Call `match_notes` RPC
- [ ] 4.4 Build context prompt
- [ ] 4.5 Generate answer and list sources

### Phase 5: Validation

- [ ] 5.1 Index real staging notes
- [ ] 5.2 Run 3-5 validation questions
- [ ] 5.3 Compare with baseline FTS behavior
- [ ] 5.4 Record conclusions

## Dependencies

- Gemini API key
- Supabase project with pgvector
- Migrations applied before indexing scripts

## Risks and Mitigation

| Risk | Probability | Mitigation |
|---|---|---|
| Gemini rate limits during indexing | Medium | Batch + delay between requests |
| Long notes exceed practical embedding limits | Medium | Chunk text before embedding |
| Low retrieval quality on some prompts | Medium | Tune `matchCount`, chunking, and prompt |

## POC Outcome Snapshot

- Date: 2026-03-02
- Status: concept validated
- Follow-up: UI integration moved to Edge Function-based implementation
