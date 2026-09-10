---
phase: requirements
title: MCP Notebook Access — Requirements & Problem Understanding
description: Let any MCP-capable AI agent read, create and update the user's notes through a remote MCP server secured by Supabase OAuth 2.1
---

# Requirements & Problem Understanding

## Problem Statement

**What problem are we solving?**

The owner of an EverFreeNote notebook wants AI agents (Claude, ChatGPT, Cursor, Claude Code and any other Model Context Protocol client) to work with the notebook directly: find notes, read them, create new ones and update existing ones. Today the only programmatic entry points are the Bearer-JWT Edge Functions (`create-note`, `get-notes`, `delete-note`), which no consumer AI product can call out of the box, and which require a hand-copied session token.

- **Affected users**: every EverFreeNote user who uses an AI assistant; initially the project owner.
- **Current situation**: no MCP endpoint exists. Copying a short-lived Supabase JWT into an agent is the only workaround and it does not work from phones or from hosted assistants.
- **Key constraint discovered during discovery**: mobile AI clients cannot run local (stdio) MCP servers. The server must be a public HTTPS endpoint reachable from the AI vendor's cloud, so the integration must be a *remote* MCP server.

## Goals & Objectives

### Primary Goals
- Expose the notebook as a remote MCP server (Streamable HTTP transport) hosted on the existing Supabase project as an Edge Function.
- Authenticate agents with the standard MCP authorization flow (OAuth 2.1 + PKCE) using Supabase Auth's built-in OAuth 2.1 Server, so that Claude (web, desktop, iOS, Android), ChatGPT and other spec-compliant clients connect without custom headers or pasted tokens.
- Scope every request to the signed-in user through Row Level Security: the server acts *as the user*, never with a service-role key.
- Provide tools for: listing and searching notes, reading a note, creating a note, updating a note.
- Ship the user-facing consent page that Supabase's headless OAuth server redirects to.

### Secondary Goals
- Keep the implementation runtime-agnostic where possible so the tool logic is unit-tested with Jest and the Edge Function stays a thin adapter.
- Document how to enable the feature in the Supabase dashboard and how to add the connector in Claude and ChatGPT.

### Non-Goals
- Deleting notes through MCP (explicitly deferred by the owner).
- Markdown ↔ HTML conversion for note bodies (agents receive and send the editor's HTML; follow-up candidate).
- Full-text ranked search via `search_notes_fts` (substring search is sufficient for v1; FTS requires making `core/utils/search` Deno-compatible).
- MCP resources, prompts, sampling, or per-user API keys / personal access tokens.
- Admin UI for reviewing or revoking OAuth grants (Supabase exposes `listGrants` / `revokeGrant`; can be added later in Settings).

## User Stories & Use Cases

| ID | Story |
|----|-------|
| US-1 | As a notebook owner, I want to add EverFreeNote as a custom connector in Claude once on the web and have it work on my phone too, so I can ask Claude about my notes anywhere. |
| US-2 | As a notebook owner, I want the agent to find notes by words in the title or body and by tag, so I do not need to remember note ids. |
| US-3 | As a notebook owner, I want the agent to read the full content of a note. |
| US-4 | As a notebook owner, I want the agent to create a note with a title, body and tags. |
| US-5 | As a notebook owner, I want the agent to update a note's title, body or tags. |
| US-6 | As a notebook owner, I want to see which application is asking for access and approve or deny it on a consent screen before any data is shared. |
| US-7 | As a security-conscious user, I want an agent to only ever see my own notes, enforced by the database, even if the server code has a bug. |

### Key workflows
1. **First connection**: user adds the MCP URL in the AI client → client discovers the authorization server → browser opens EverFreeNote → user signs in (if needed) → consent screen → approve → client receives tokens → tools become available.
2. **Everyday use**: agent calls `list_notes` / `get_note` / `create_note` / `update_note`; token refresh is handled by the client via Supabase's token endpoint.
3. **Revocation**: user revokes the grant (Supabase dashboard or a future Settings UI); the agent's next call fails with 401 and the client re-runs the OAuth flow.

### Edge cases
- Request without a token, with an expired token, or with a token from a different Supabase project → `401` with a spec-compliant `WWW-Authenticate` header so clients know how to (re)authorize.
- User is not signed in when landing on the consent page → sign-in is shown inline; Google sign-in round-trips through `/auth/callback` and must return to the pending consent.
- Consent page opened without an `authorization_id`, or with an expired one → clear error, no crash.
- `update_note` for a note the user does not own → the RLS-scoped update matches zero rows → tool returns a "not found" error, never leaks existence.
- Agent sends HTML with disallowed tags → stored as-is, consistent with the existing `create-note` API; all render paths already sanitize (`SanitizationService`, TipTap schema).

## Success Criteria

- A spec-compliant MCP client (verified with the official TypeScript SDK client in tests) can list tools and call all four tools against the server.
- The Edge Function answers unauthenticated requests with `401` and a `WWW-Authenticate: Bearer resource_metadata="…"` header, and serves the OAuth Protected Resource Metadata document pointing at the project's Supabase Auth issuer.
- Authenticated calls run through a Supabase client carrying the user's token (RLS enforced); no service-role key is used by the MCP function.
- The consent page renders client details, approves and denies, and redirects back to the client; it works after an interrupted Google sign-in.
- New code is covered by Jest unit tests (protocol-level tests via `InMemoryTransport`, repository tests with a mocked Supabase client, component tests for the consent page); `npm run type-check`, `npm run eslint` and `deno check` on the function pass.
- Documentation lists the exact dashboard toggles and the connector URL format.

## Constraints & Assumptions

- **Hosting**: the web app is a static export on Cloudflare Pages (no API routes). The only server runtime in the project is Supabase Edge Functions (Deno 2), so the MCP server lives there.
- **Deno interop**: code shared between Node (tests, web) and Deno (function) must use relative imports with explicit `.ts` extensions and only bare specifiers present in the function's import map (`@supabase/supabase-js`, `@modelcontextprotocol/sdk/*`, `zod`).
- **Stateless transport**: Edge Functions are short-lived and horizontally scaled, so the Streamable HTTP transport runs in stateless mode (no session ids, no SSE resumption). Each tool call is one HTTP request.
- **Gateway JWT verification must be off** for this function (`verify_jwt = false`): the discovery document and the initial `401` must be reachable without a token, and Supabase's gateway would otherwise reject them.
- **Supabase OAuth 2.1 Server is in beta**; it is free on all plans during the beta. Dynamic client registration must be enabled for Claude/ChatGPT to self-register.
- **Public reachability**: Anthropic's and OpenAI's servers must reach the function; Supabase Edge Functions are public by default.
- **Discovery path**: the protected-resource metadata is served under the function's own path (`/functions/v1/mcp/.well-known/oauth-protected-resource`) because the function cannot serve the project root; clients are pointed at it explicitly through the `WWW-Authenticate` header as the MCP spec allows.

## Questions & Open Items

- Which OAuth scopes should be advertised? Supabase's server supports `openid profile email phone offline_access` (verified 2026-09-10 on stage). v1 omits `scopes_supported` by default; the function secret `MCP_SCOPES_SUPPORTED` can advertise a list (notably `offline_access` for refresh tokens) once acceptance shows it is needed.
- Should note bodies be exposed as Markdown for agents in a later iteration (better ergonomics for LLMs, lossy for rich formatting)?
- Should `list_notes` gain ranked full-text search (requires refactoring `core/utils/search` to be Deno-compatible)?
- Should Settings get a "Connected apps" section using `supabase.auth.oauth.listGrants()` / `revokeGrant()`?
