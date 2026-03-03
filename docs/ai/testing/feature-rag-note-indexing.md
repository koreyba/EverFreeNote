---
phase: testing
title: RAG Note Indexing - Testing (POC)
description: Manual validation strategy and closure criteria for the RAG POC
---

# RAG Note Indexing - Testing (POC)

## Test Coverage Goals

- Validate indexing correctness (`notes -> chunks -> embeddings -> note_embeddings`).
- Validate retrieval relevance quality against baseline FTS on representative prompts.
- Confirm failure handling for empty/missing context and upstream embedding errors.

## Coverage results

| Metric | Value |
|---|---|
| Test cases run | TBD |
| Passed | TBD |
| Failed | TBD |
| Subjective comparison vs FTS | TBD |

## Manual Testing Checklist

### Preconditions

- [ ] Staging migrations are applied.
- [ ] `.env` contains valid Supabase and Gemini credentials.
- [ ] `scripts/rag-poc/` dependencies are installed.

### Indexing (`index.ts`)

- [ ] Script runs without unhandled errors.
- [ ] Progress output reports processed notes count.
- [ ] `note_embeddings` rows are created/updated.
- [ ] Re-running indexing is idempotent for already indexed notes.
- [ ] Empty-content notes are skipped or cleaned up predictably.

### Query quality (`query.ts`)

- [ ] Query on known topic returns relevant context.
- [ ] Query on unknown topic returns explicit "not found" style result.
- [ ] Synonym/paraphrase query still retrieves related notes.
- [ ] Russian-language query quality is acceptable.
- [ ] General query does not hallucinate unsupported facts.

### Comparison with FTS

- [ ] Compare at least 3 prompts: RAG top results vs FTS top results.
- [ ] Record where RAG improves relevance and where it regresses.

## Outstanding gaps

- [ ] Owner: AI feature team. Convert the top manual prompts into automated regression fixtures.
  Next step: add deterministic fixtures and expected ranking assertions.
- [ ] Owner: Backend team. Add latency/error observability for embedding and retrieval paths.
  Next step: define acceptable SLO thresholds and alert rules.
- [ ] Owner: QA. Fill final pass/fail numbers and attach evidence links.
  Next step: update the coverage table after the next staging run.

## POC Verdict

- [ ] Approved to continue into productized rollout.
- [ ] Approved with follow-up fixes listed above.
- [ ] Rejected (document blockers).
