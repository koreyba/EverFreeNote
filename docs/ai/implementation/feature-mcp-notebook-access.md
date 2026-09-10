---
phase: implementation
title: MCP Notebook Access — Implementation Guide
description: How the remote MCP server, OAuth resource helpers and consent page are built and wired
---

# Implementation Guide

## Development Setup

- Node 18+ with the root workspace installed (`npm install`); `@modelcontextprotocol/sdk@1.30.0` is a root dependency (used by `core/mcp` and its Jest tests).
- Deno is not required globally: `npx --yes deno@2 …` is enough to type-check and smoke-run the function.
- Local Supabase (optional, for a full OAuth round-trip): `npm run db:start` with `[auth.oauth_server]` enabled in `supabase/config.toml` (already on), then `npm run functions:serve`.

Useful commands:

```bash
npm run deno-check
```

That runs `scripts/deno-check-functions.mjs`, which type-checks each function with its own `deno.json`. A single `deno check supabase/functions/**/*.ts` cannot work here: it ignores the per-function import maps, so every `@core/…`, `npm:` and `esm.sh` specifier fails to resolve.

```bash
SUPABASE_URL=http://127.0.0.1:54321 SUPABASE_ANON_KEY=<anon> npx --yes deno@2 run -A --config supabase/functions/mcp/deno.json supabase/functions/mcp/index.ts
```

```bash
npx jest --config jest.config.cjs --selectProjects unit-core --testPathPatterns core-mcp
```

## Code Structure

```
core/mcp/
  types.ts                       NoteRecord, NotebookRepository, list/create/update contracts
  noteContent.ts                 htmlToPlainText(), buildExcerpt()
  noteHtml.ts                    sanitizeNoteHtml() — allowlist sanitizer for agent-supplied bodies
  oauthResource.ts               RFC 9728 metadata, WWW-Authenticate, bearer extraction, routing, public origin
  supabaseNotebookRepository.ts  RLS-scoped repository on a user-token Supabase client
  notebookServer.ts              createNotebookMcpServer(repository) — the four tools
supabase/functions/mcp/
  index.ts                       Deno.serve handler (CORS, routing, token validation, transport)
  deno.json / import_map.json    @core/, @supabase/supabase-js (esm.sh), @modelcontextprotocol/sdk (npm:), zod (npm:)
app/oauth/consent/page.tsx       Route (Suspense wrapper, noindex)
ui/web/components/features/oauth/
  OAuthConsentPageClient.tsx     Consent state machine
  OAuthConsentLayout.tsx         Layout, spinner and message card
ui/web/lib/oauthConsentNavigationState.ts  sessionStorage bridge used by app/auth/callback/page.tsx
```

Naming: tools are snake_case (`list_notes`, `get_note`, `create_note`, `update_note`); tool payload fields mirror the REST API (`title`, `tags`) except the body, which is exposed as `content_html` / `content_text` to make the format explicit.

## Implementation Notes

### Shared core code must stay Deno-compatible
`core/mcp/*` follows the `core/rag/*` rule: relative imports with explicit `.ts` extensions and no `@/…` aliases. The only bare specifiers are the ones mapped in `supabase/functions/mcp/import_map.json`. The Edge Function is excluded from the root `tsconfig.json` (it uses the `Deno` global and is checked by `deno check` instead).

### Tool callbacks are typed explicitly
The SDK infers callback argument types from the zod shape under Node's TypeScript but not under Deno's (TS 6). Each callback therefore annotates its argument with the exported `z.infer` type (`ListNotesInput`, `GetNoteInput`, `CreateNoteToolInput`, `UpdateNoteToolInput`). Input/output schemas are passed as raw shapes (`{ field: zodType }`), the most widely supported form.

### Sanitizing agent-supplied bodies
`create_note` and `update_note` pass `content_html` through `sanitizeNoteHtml()` (package `sanitize-html`, which runs unchanged in Node and Deno) before handing it to the repository. The allowlist mirrors the DEFAULT profile of `core/services/sanitizer.ts`; `href` accepts http/https/mailto, `img src` additionally accepts `data:`. Note that the sanitizer normalises CSS whitespace inside `style` attributes, so bodies are not always byte-identical to what the agent sent.

The domain type calls the body `contentHtml`; the Postgres column is still `description`, and the mapping happens only inside `supabaseNotebookRepository.ts`.

### Validation and error semantics
- Argument validation is done by the SDK from the zod shapes; invalid arguments come back as `isError: true` results with an "Input validation error" message (not as JSON-RPC protocol errors).
- Business errors (`Note not found`, "Provide at least one of …") and repository failures are returned as `isError: true` with a short prefix (`Failed to list notes: …`). Nothing throws out of a tool callback.
- Blank tags are allowed by the schema and removed by `normalizeTags()`; duplicates are removed keeping the first occurrence; order is preserved.

### Stateless Streamable HTTP
`WebStandardStreamableHTTPServerTransport` is created per request with `sessionIdGenerator: undefined` (no `Mcp-Session-Id`) and `enableJsonResponse: true` (plain JSON instead of SSE). A fresh `McpServer` is built per request as well; both are garbage-collected with the request. `GET`/`DELETE` on `/mcp` are handled by the transport (405 in stateless mode).

### Public origin resolution
The discovery document must advertise the URL AI vendors actually call. `resolvePublicOrigin()` prefers `MCP_PUBLIC_ORIGIN`, then `X-Forwarded-Proto`/`X-Forwarded-Host`, then `SUPABASE_URL`, then the request URL. `MCP_AUTH_ISSUER` overrides the authorization server if it ever differs from `<origin>/auth/v1`.

### Consent page state machine
`OAuthConsentPageClient` renders, in order: invalid id → session loading → signed-out (inline `AuthForm`) → idle/loading → error → ready (approve/deny) → redirecting. `getAuthorizationDetails` returning `redirect_url` means the client is already approved; the page navigates immediately. Navigation is injectable (`navigate` prop) so tests do not touch `window.location`.

### Returning from Google sign-in
Before delegating to `handleSignInWithGoogle`, the page stores the `authorization_id` in sessionStorage. `app/auth/callback/page.tsx` calls `consumeOAuthConsentReturnPath()` on every success path and pushes the consent URL instead of `/`. Failure paths leave the stored id untouched so a retry can still resume.

## Integration Points

- **Supabase Auth OAuth 2.1 Server** — issuer `https://<ref>.supabase.co/auth/v1`, metadata at `/.well-known/oauth-authorization-server/auth/v1`, consent redirect to `SITE_URL + /oauth/consent?authorization_id=…`. Dashboard: Authentication → OAuth Server (enable, set authorization path, allow dynamic client registration).
- **Gateway** — `[functions.mcp] verify_jwt = false`; deploy with `supabase functions deploy mcp --no-verify-jwt`.
- **Database** — `public.notes` through the existing RLS policies; no migration.
- **Web app** — new static route `/oauth/consent`; `app/auth/callback` updated.

## Error Handling

| Situation | Response |
|-----------|----------|
| Missing `SUPABASE_URL` / `SUPABASE_ANON_KEY` | `500 { error: "Function not configured" }` + console error |
| Unknown path under the function | `404` |
| No bearer token | `401` + `WWW-Authenticate: Bearer resource_metadata="…"` |
| Invalid/expired token (`auth.getUser` fails) | `401` + `… error="invalid_token"` |
| Transport/handler exception | `500 { error: "Internal error" }` + console error |
| Tool-level failures | JSON-RPC result with `isError: true` |

The consent page surfaces Supabase error messages verbatim in a message card and never leaves the user on a blank screen.

## Performance Considerations

- Two Supabase round-trips per tool call (token check + query). `auth.getUser` could later be replaced by local JWT verification against the project's JWKS to save one call.
- `list_notes` is capped at 100 rows and uses `notes_user_id_idx` / `notes_updated_at_idx`; the ILIKE filter on `description` is a sequential scan within the user's rows, acceptable for personal notebooks.
- Metadata responses carry `Cache-Control: public, max-age=300`.

## Security Notes

- OAuth 2.1 + PKCE via Supabase; tokens are validated on every request; the function never reads the service-role key; queries run under RLS as the user.
- `WWW-Authenticate` values are quoted and stripped of quotes/newlines; tokens are never echoed.
- CORS allows any origin (the endpoint is meant for server-side AI hosts) but exposes only MCP-related headers.
- The consent page shows the client name and host as text only (no external logo or link rendering), and validates `authorization_id` against a strict character class before using it in storage or URLs.
- Note HTML from agents is stored as received, mirroring the existing `create-note` REST function; all render paths sanitize (`SanitizationService`, TipTap schema).
- Known limitation: RFC 8707 `resource` binding is not enforced (Supabase tokens carry `aud: "authenticated"`).
