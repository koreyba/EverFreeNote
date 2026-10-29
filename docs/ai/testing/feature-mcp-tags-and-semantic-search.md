---
phase: testing
title: MCP Tags & Semantic Search — Testing Strategy
description: Unit and protocol coverage for the tag tools and semantic search
---

# Testing Strategy

## Test Coverage Goals

- Every new pure helper covered directly, including the case-folding rules that are easy to regress.
- Every new tool exercised through the official MCP SDK client over `InMemoryTransport`, so schemas, validation and result shapes are tested exactly as an agent sees them.
- The `rag-search` call site is covered by `deno check` and by tests of the pure mapping it delegates to; the network hop itself is verified in acceptance.

## Unit Tests

### `core-mcp-tagVocabulary.test.ts` (17)
- [x] `dedupeTags`: trimming, blanks, case-insensitive duplicates, missing input
- [x] `aggregateTags`: one count per note not per occurrence, case folding with first spelling kept, count-then-alphabetical order, blanks ignored
- [x] `filterTags`: no query, case-insensitive substring, no match, input not mutated
- [x] `applyTagEdit`: add, already-present at another case, case-insensitive removal, absent removal, removal-before-addition re-spelling, trimming, cleaning tags already stored
- [x] `tagsUnchanged`: value and order

### `core-mcp-semanticSearch.test.ts` (12)
- [x] `groupChunksByNote`: one entry per note with the best similarity, ordering, limit applied after ordering, excerpt cap and de-duplication, whitespace normalisation and truncation, missing title/tags/content, chunk without a note id, empty input
- [x] `mapUnavailableResponse`: missing key, model mismatch by status and by code, missing deployment, `null` for genuine failures
- [x] `describeEmptyResult` with and without an explicit threshold

### `core-mcp-supabaseNotebookRepository.test.ts` (30, 12 new)
- [x] Tag filters: `contains` for `all`, `overlaps` for `any`, filter skipped for a blank list
- [x] `listTags`: reads only the `tags` column with the user filter and the cap, aggregates, ignores non-string values, flags a truncated scan, null payload, error rethrow
- [x] `editNoteTags`: add without disturbing others, case-insensitive removal, no write when unchanged, `null` for a missing note with no write attempted, error rethrow

### `core-mcp-notebookServer.test.ts` (15 new)
- [x] Tool list now advertises `list_tags` and `edit_note_tags`
- [x] `list_notes` forwards `tags` and `tag_match` with `all` as the default
- [x] `list_tags`: ordering, substring filter with limit, `truncated` passthrough, repository failure
- [x] `edit_note_tags`: normalised lists, removal alone, nothing-to-do rejected, blank-only lists rejected, missing note, repository failure
- [x] `search_notes_semantic`: registered only with a port, defaults, forwarded limit/threshold/tag, explained empty result, setup gap relayed, empty query rejected, upstream failure

## End-to-End Tests

Manual acceptance after deploying the `mcp` function:

- [ ] Ask the agent which tags exist; compare against the tag list in the web app.
- [ ] Ask for notes carrying two tags; confirm `all` semantics, then ask for either tag and confirm `any`.
- [ ] Have the agent add a tag to a note, then confirm in the app that the other tags survived.
- [ ] Have the agent remove that tag using different capitalisation.
- [ ] Ask a question whose wording does not appear in any note; confirm semantic search finds the right one and that `get_note` opens it.
- [ ] On a notebook with no Gemini key, confirm the agent reports the setup step instead of an empty result.

## Test Reporting & Coverage

```bash
npx jest --config jest.config.cjs --selectProjects unit-core --testPathPatterns core-mcp
```

Results (2026-09-10): 136 MCP tests pass across 7 suites, up from 80. Full suite 1556 tests in 189 suites. `npm run type-check`, `eslint .` with no warnings, and `deno check` over all 16 Edge Functions are clean.

Local verification (2026-10-28): 156 MCP unit and local PostgREST integration tests passed with the column-grant fixture; project type-check, targeted ESLint, and the MCP Edge Function Deno check passed. This does not represent remote CI or a deployed test.

Local integration: `core/tests/integration/mcp-supabase-local.test.ts` forces two independent tag edits to read the same original array before writing, verifies literal searches and paging, and checks that saved semantic thresholds are read through RLS. Run with `MCP_TEST_SUPABASE_URL` and `MCP_TEST_SUPABASE_ANON_KEY` pointing to a disposable local stack. The fresh local migrations used for verification needed test-only CRUD grants to `authenticated` on `public.notes` and INSERT on `public.user_rag_search_settings` for fixtures; the new migration provides the two SELECT columns required by MCP. Set `MCP_TEST_COLUMN_GRANTS=1` on a disposable stack without a broader table-level SELECT grant to additionally verify column restriction, anonymous denial and propagation of a real database permission error. No RLS policies were changed. This observation does not establish the privileges of any deployed instance.

Known gap: tag vocabulary counts names case-insensitively, but `list_notes` still filters the saved tag strings case-sensitively. An experimental SECURITY INVOKER filter fixed the mismatch and passed local RLS/all/any/pagination tests, but was not retained: under RLS, an `EXPLAIN ANALYZE` exact-count benchmark for a synthetic 50,002-note user (3–4 tags per note) took about 139 ms versus 13 ms for the existing `all` filter and 83 ms versus 15 ms for `any`. A functional GIN index was not used by the planner under RLS and did not solve the regression. This was a local warm-cache measurement, not a production performance claim. A safe indexed design and rollout plan remain to be investigated; no SQL migration was deployed.
