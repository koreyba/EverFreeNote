---
phase: planning
title: MCP Notebook Access — Project Planning & Task Breakdown
description: Tasks to ship the remote MCP server, OAuth consent page and documentation
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 1: Core tool layer implemented and covered by protocol-level tests
- [x] Milestone 2: Edge Function `mcp` type-checks under Deno and answers discovery/401/authenticated flows
- [x] Milestone 3: Consent page shipped with tests; Google sign-in returns to the pending consent
- [x] Milestone 4: Docs complete (implementation, testing, deployment, connector setup guide); `type-check`, `eslint`, Jest green

## Task Breakdown

### Phase 1: Foundation
- [x] Task 1.1: Requirements, design and planning docs (`docs/ai/*/feature-mcp-notebook-access.md`)
- [x] Task 1.2: Add `@modelcontextprotocol/sdk@1.30.0` to the root workspace
- [x] Task 1.3: `core/mcp/types.ts` — `NoteRecord`, `NotebookRepository`, input/result types
- [x] Task 1.4: `core/mcp/noteContent.ts` — `htmlToPlainText`, `buildExcerpt` (+ unit tests)
- [x] Task 1.5: `core/mcp/oauthResource.ts` — metadata, `WWW-Authenticate`, bearer extraction, route classification, public origin (+ unit tests)

### Phase 2: Core Features
- [x] Task 2.1: `core/mcp/supabaseNotebookRepository.ts` — RLS-scoped list/get/create/update (+ unit tests with mocked client)
- [x] Task 2.2: `core/mcp/notebookServer.ts` — `McpServer` with four tools (+ protocol tests via `InMemoryTransport` and SDK `Client`)
- [x] Task 2.3: `supabase/functions/mcp/index.ts`, `deno.json`, `import_map.json`
- [x] Task 2.4: `supabase/config.toml` — enable OAuth server + dynamic registration locally, `[functions.mcp] verify_jwt = false`
- [x] Task 2.5: `deno check` the function; smoke-test 401 + metadata routes locally with `deno run`

### Phase 3: Consent page
- [x] Task 3.1: `ui/web/lib/oauthConsentNavigationState.ts` (+ unit tests)
- [x] Task 3.2: `OAuthConsentPageClient` component + `app/oauth/consent/page.tsx` (+ unit tests)
- [x] Task 3.3: `app/auth/callback/page.tsx` returns to pending consent (+ test update)

### Phase 4: Integration & Polish
- [x] Task 4.1: Implementation, testing and deployment docs; `docs/MCP_SETUP.md` connector guide; README link
- [x] Task 4.2: `npm run type-check`, `npm run eslint`, Jest unit-core + unit-web
- [x] Task 4.3: Code review pass against design

## Dependencies

- 1.3 → 1.4/1.5 → 2.1/2.2 → 2.3 → 2.5.
- 3.1 → 3.2/3.3.
- External: Supabase OAuth 2.1 Server (beta) must be enabled in the dashboard for stage/prod; dynamic client registration toggled on; Site URL must point at the deployed SPA. These are manual release steps, tracked in the deployment doc.
- Cloudflare Pages must serve `/oauth/consent` (static export produces `/oauth/consent/index.html`; verify the trailing-slash redirect keeps the query string).

## Timeline & Estimates

| Phase | Estimate |
|-------|----------|
| Phase 1 | 0.5 day |
| Phase 2 | 1 day |
| Phase 3 | 0.5 day |
| Phase 4 | 0.5 day |

Buffer: half a day for Supabase beta surprises (scope handling, discovery quirks).

## Risks & Mitigation

| Risk | Mitigation |
|------|------------|
| Supabase OAuth server is beta; API or metadata paths change | Keep issuer/origin overridable via env (`MCP_AUTH_ISSUER`, `MCP_PUBLIC_ORIGIN`); pin supabase-js. |
| A client ignores `resource_metadata` in `WWW-Authenticate` and probes the project root | Documented limitation; fallback would be a tiny Cloudflare Worker or Pages `_redirects` proxy at the root well-known path. |
| Deno cannot resolve shared core code | Enforce the `core/rag` import style (relative `.ts` imports, no aliases); verify with `deno check` in Task 2.5. |
| Trailing-slash redirect on Cloudflare Pages drops `authorization_id` | Verify after first deploy; configure `authorization_url_path = "/oauth/consent/"` if needed. |
| Unbounded HTML from agents | Same contract as the REST API; render paths sanitize; sizes bounded by schema where sensible. |

## Resources Needed

- Supabase dashboard access (Authentication → OAuth Server) for stage and prod projects.
- Claude (web) account to add the custom connector; optionally ChatGPT for a second client.
- Local: Node 18+, `npx deno@2` for type-checking the function (Docker + `supabase start` only for a full local OAuth round-trip).
