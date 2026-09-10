---
phase: testing
title: MCP Notebook Access — Testing Strategy
description: Unit, protocol-level and component coverage for the MCP server, OAuth helpers and consent page
---

# Testing Strategy

## Test Coverage Goals

- 100% of new code in `core/mcp/*`, `ui/web/lib/oauthConsentNavigationState.ts` and `ui/web/components/features/oauth/*` exercised by Jest.
- Protocol-level confidence: tools are exercised through the official SDK `Client` over `InMemoryTransport`, so schema generation, argument validation and result shapes are tested exactly as an AI client sees them.
- The Edge Function adapter is verified by `deno check` plus a local `deno run` smoke test (discovery, 401 challenge, routing, CORS); the full OAuth round-trip is a manual acceptance test against a Supabase project.

## Unit Tests

### `core/tests/unit/core-mcp-noteContent.test.ts`
- [x] Empty/null input, block boundaries → line breaks, list bullets, `<br>`/`<hr>`
- [x] Script/style removal, named/decimal/hex entity decoding, out-of-range code points kept
- [x] Whitespace collapsing; excerpt truncation with ellipsis, limit of one

### `core/tests/unit/core-mcp-oauthResource.test.ts`
- [x] `classifyMcpRoute` with/without `/functions/v1`, trailing slashes, unknown paths
- [x] `resolvePublicOrigin` precedence: override → forwarded headers (first value, https default) → `SUPABASE_URL` → request URL → empty
- [x] URL builders, RFC 9728 document (scopes optional), `WWW-Authenticate` quoting, bearer extraction edge cases

### `core/tests/unit/core-mcp-supabaseNotebookRepository.test.ts`
- [x] `listNotes`: columns, user filter, ordering, range, tag/text filters, blank query skipped, count fallback, null data, errors
- [x] `getNote`: user-scoped lookup, null, errors
- [x] `createNote`: insert payload with `user_id`, errors
- [x] `updateNote`: partial patch, description mapping, zero rows → null, empty patch → read, errors
- [x] Helpers: `escapeIlikeValue`, `toNoteRecord` normalisation of nullable columns

### `core/tests/unit/core-mcp-notebookServer.test.ts` (protocol-level)
- [x] Server info, instructions, four tools with annotations and output schemas
- [x] `list_notes`: defaults, filters, `has_more`, validation errors (`limit` 0/101, negative offset), repository failure
- [x] `get_note`: success, not found, invalid UUID, repository failure
- [x] `create_note`: defaults + tag normalisation, HTML pass-through, empty title, repository failure
- [x] `update_note`: partial update, `content_html` → `description`, no fields, not found, repository failure
- [x] Pure helpers: `normalizeTags`, `toNoteSummary`, `toNoteDetail`, `describeToolError`

### `ui/web/tests/unit/lib/oauthConsentNavigationState.test.ts`
- [x] Id validation, path building, save/read/consume/clear, tampered values, storage getter throwing, storage methods throwing

### `ui/web/tests/unit/components/oauthConsentPageClient.test.tsx`
- [x] Missing/invalid id, session loading, signed-out sign-in card (Google stores pending id; test-auth buttons wired)
- [x] Details rendering (client name, host, email, scopes), sparse client fallback
- [x] Already-approved redirect, load error, thrown load error
- [x] Approve/deny redirect with `skipBrowserRedirect`, in-flight disabled buttons, approval error, thrown denial error

### `ui/web/tests/unit/components/authCallbackConsentReturn.test.tsx`
- [x] Existing session → consent path; code exchange → consent path; nothing pending → `/`; failure keeps pending id

## Integration Tests

- [x] `deno check` of `supabase/functions/mcp/index.ts` (resolves `@core/mcp/*`, `npm:` SDK, `npm:zod`, esm.sh supabase-js)
- [x] `deno run` smoke test: `GET …/.well-known/oauth-protected-resource` → 200 JSON; `POST /mcp` without token → 401 + `WWW-Authenticate`; bogus token with unreachable Supabase → 401 `invalid_token`; unknown route → 404; `OPTIONS` → CORS
- [x] Authenticated JSON-RPC round-trip against stage (2026-09-10): dynamic client registration → authorize → consent page on `stage.everfreenote.pages.dev` (test login) → Approve → PKCE token exchange (access + refresh token) → initialize, tools/list, create_note, get_note, update_note, list_notes (query and tag), not-found and empty-patch errors, 401 on a bad token

## End-to-End Tests

Manual acceptance on the stage project after deployment:

- [ ] Add `https://<ref>.supabase.co/functions/v1/mcp` as a custom connector in Claude (web) → browser opens EverFreeNote → consent card shows "Claude" → Approve → connector shows the four tools.
- [ ] Ask Claude to list, read, create and update a note; verify in the web app.
- [ ] Sign out of EverFreeNote, repeat the connection: sign-in card → Google → `/auth/callback` → back on consent → Approve.
- [ ] Deny → client shows an authorization error; no grant appears in Supabase.
- [ ] Open the connector on the Claude mobile app → tools available without re-authorising.
- [ ] Regression: `/share`, `/settings`, normal sign-in still land on `/`.

## Test Data

- Fake `NotebookRepository` (Jest mocks) and hand-written note fixtures with valid v4 UUIDs.
- Mocked Supabase query builder (`select/eq/order/range/contains/or` chain, thenable for list queries).
- Mocked `supabase.auth.oauth` for consent tests; `SupabaseTestProvider` injects the client.

## Test Reporting & Coverage

Commands:

```bash
npx jest --config jest.config.cjs --selectProjects unit-core --testPathPatterns core-mcp
```

```bash
npx jest --config jest.config.cjs --selectProjects unit-web --testPathPatterns 'oauthConsent|authCallbackConsentReturn'
```

Results (2026-09-10): unit-core 68/68 passed (4 suites); unit-web 26/26 passed (3 suites) plus the existing `authCallbackPage` suite still green; `npm run type-check` projects (root, core, core tests, web tests) clean; `eslint --max-warnings=0` clean on all touched files; `deno check` clean.

Known gaps:
- The Edge Function handler itself (`index.ts`) has no automated test beyond `deno check` and the smoke run; its logic is intentionally thin and delegates to tested helpers.
- No Cypress component test yet for the consent card (Jest covers the behaviour; a Cypress spec can be added to the `features/auth` group for the visual regression suite).
