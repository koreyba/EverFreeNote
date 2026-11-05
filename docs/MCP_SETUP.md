# MCP Notebook Access

EverFreeNote exposes your notebook to AI agents through a **remote MCP server** (Model Context Protocol, Streamable HTTP). Any MCP-capable client — Claude (web, desktop, iOS, Android), ChatGPT, Claude Code, Cursor and others — can search your notes by text, tag or meaning, read them, create new ones, and edit their content and tags, after you approve it once on a consent screen. Deleting notes is intentionally not available.

The server runs as the Supabase Edge Function `mcp`; authentication is standard OAuth 2.1 with PKCE, provided by Supabase Auth's OAuth 2.1 Server. Only your own notes are accessible, enforced by Row Level Security.

```
https://<project-ref>.supabase.co/functions/v1/mcp
```

---

## 0. Where this lives

The MCP server is **not** a separate service. It is the Supabase Edge Function `mcp`, one per Supabase project, and it authenticates against that same project's Supabase Auth.

| | Production | Stage |
|---|---|---|
| Supabase project | **EverFreeNote** — `pmlloiywmuglbjkhrggo` | **EverFreeNoteStage** — `yabcuywqxgjlruuyhwin` |
| **Connector URL** (paste this into the AI client) | `https://pmlloiywmuglbjkhrggo.supabase.co/functions/v1/mcp` | `https://yabcuywqxgjlruuyhwin.supabase.co/functions/v1/mcp` |
| Authorization server | `https://pmlloiywmuglbjkhrggo.supabase.co/auth/v1` | `https://yabcuywqxgjlruuyhwin.supabase.co/auth/v1` |
| Consent page (Site URL + `/oauth/consent`) | `https://everfreenote.pages.dev/oauth/consent` | `https://stage.everfreenote.pages.dev/oauth/consent` |
| Web app branch on Cloudflare Pages | `main` | `stage` |
| JWT signing key | ECC P-256 (ES256) | ECC P-256 (ES256) |

Source code:

| What | Where |
|---|---|
| HTTP handler (CORS, routing, token validation, transport) | `supabase/functions/mcp/index.ts` |
| Tool definitions (all nine) | `core/mcp/notebookServer.ts` |
| Tag aggregation and incremental tag edits | `core/mcp/tagVocabulary.ts` |
| Semantic-search port and response mapping | `core/mcp/semanticSearch.ts` |
| Database access under RLS | `core/mcp/supabaseNotebookRepository.ts` |
| Write-side HTML sanitizer | `core/mcp/noteHtml.ts` |
| OAuth resource-server helpers | `core/mcp/oauthResource.ts` |
| Consent page | `app/oauth/consent/`, `ui/web/components/features/oauth/` |

Where to look in the Supabase dashboard (replace `<ref>` with the project ref above):

| Task | Path |
|---|---|
| Function logs and invocations | Edge Functions → `mcp` → Logs / Invocations |
| OAuth server settings | Authentication → OAuth Server |
| Registered AI clients and their grants | Authentication → OAuth Apps |
| Token-exchange errors | Logs → Auth Logs (filter `/oauth/token`) |
| JWT signing keys | Settings → JWT Keys |

Redeploying the server:

```bash
npx supabase functions deploy mcp --no-verify-jwt --project-ref <ref>
```

---

## 1. One-time setup (project owner)

### 1.1 Enable the OAuth server in Supabase

Dashboard → **Authentication → OAuth Server**:

1. Turn on **Enable the Supabase OAuth Server** and save.
2. Set the **authorization path** to `/oauth/consent` (this is the consent page shipped with the web app).
3. Enable **dynamic client registration** — Claude and ChatGPT register themselves as OAuth clients; without it the connection fails at the first step.

Dashboard → **Authentication → URL Configuration**: the **Site URL** must be the concrete URL of a deployed EverFreeNote web app that contains the consent page (for example `https://everfreenote.pages.dev`). Supabase redirects the user to `<Site URL>/oauth/consent?authorization_id=…`; a wildcard Site URL cannot be used for this.

Local development already has this enabled in `supabase/config.toml` (`[auth.oauth_server]`).

### 1.2 Deploy the web app

Deploy the branch that contains `app/oauth/consent` (Cloudflare Pages). Verify that `https://<site>/oauth/consent` renders the "Invalid authorization request" card — that proves the route exists.

### 1.3 Deploy the Edge Function

The function must run **without gateway JWT verification** (already declared in `supabase/config.toml` under `[functions.mcp]`), because the OAuth discovery document and the initial `401` challenge are served to unauthenticated clients.

```bash
npx supabase login
```

```bash
npx supabase functions deploy mcp --no-verify-jwt --project-ref <project-ref>
```

`SUPABASE_URL` and `SUPABASE_ANON_KEY` are injected automatically. Optional secrets:

| Secret | Purpose |
|--------|---------|
| `MCP_PUBLIC_ORIGIN` | Force the public origin used in discovery metadata (default: forwarded headers → `SUPABASE_URL`). |
| `MCP_AUTH_ISSUER` | Override the authorization server if it differs from `<origin>/auth/v1`. |
| `MCP_SCOPES_SUPPORTED` | Comma-separated scopes advertised to clients, e.g. `openid,email,offline_access`. Supabase supports `openid profile email phone offline_access`; add `offline_access` if clients have to re-authorize after the access token expires. |

Verify:

```bash
curl -s https://<project-ref>.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource
```

Expected: JSON with `"authorization_servers": ["https://<project-ref>.supabase.co/auth/v1"]`.

```bash
curl -s -i -X POST https://<project-ref>.supabase.co/functions/v1/mcp -H 'content-type: application/json' -d '{}'
```

Expected: `401` with a `WWW-Authenticate: Bearer resource_metadata="…"` header.

---

## 2. Connect an AI client

### Claude (claude.ai, desktop, mobile)

1. On **claude.ai** open **Settings → Connectors → Add custom connector**.
2. Name: `EverFreeNote`; URL: `https://<project-ref>.supabase.co/functions/v1/mcp`. Leave the OAuth client id/secret empty (dynamic registration).
3. Click **Connect**. A browser window opens EverFreeNote: sign in if needed, review the consent card and press **Approve**.
4. Enable the connector in a chat. It appears on Claude Desktop and the iOS/Android apps automatically — connectors can only be *added* on the web, but they sync everywhere.

### ChatGPT

Settings → **Connectors** (developer mode / custom connectors) → create a connector with the same URL and **OAuth** authentication; complete the same browser flow.

### Claude Code

```bash
claude mcp add --transport http everfreenote https://<project-ref>.supabase.co/functions/v1/mcp
```

Then run `/mcp` inside Claude Code and authenticate when prompted.

### Other MCP clients

Any client that implements the MCP authorization spec (Streamable HTTP + OAuth 2.1 with `WWW-Authenticate` discovery) works with the same URL.

---

## 3. What agents can do

| Tool | Description |
|------|-------------|
| `list_notes` | Most recently updated notes; optional `query` (substring in title/body), `tags` with `tag_match` (`all` by default, or `any`), `limit` (1–100), `offset`. Returns summaries with a plain-text excerpt. |
| `get_note` | Full note: `content_html` (editor HTML), `content_text`, and `updated_at` for safe edits. |
| `get_notes` | Read 1–50 unique ids in one call, in requested order. `format`: text (default) or html; `max_chars`: total body-character budget, default 100000, maximum 500000. Every id reports ok, not_found or limit_exceeded. |
| `list_tags` | Every tag with the number of notes carrying it, most used first. Optional substring `query` and `limit`. |
| `create_note` | `title`, optional `content_html`, optional `tags`. |
| `update_note` | Replace fields or use `content_edits` to append/prepend, insert before/after a block or replace a block. Edits require `expected_updated_at` from reading the note. Tags are replaced wholesale. |
| `edit_note_tags` | Add and/or remove individual tags on a note, leaving the others alone. Use this rather than `update_note` when only tags change. |
| `search_notes` | Ranked text (default), semantic or hybrid search. Date ranges, multiple case-insensitive tags with all/any, sort by relevance/updated_at/created_at, limit and offset. Text is free; semantic/hybrid use Gemini. |
| `search_notes_semantic` | Finds notes close in meaning to the query using the notebook's AI index. Optional `limit`, `min_similarity`, `tag`. Returns one entry per note with matching passages. |


### Safe edits inside a note

Read the note first and pass its exact `updated_at` as `expected_updated_at` (including null for a legacy null timestamp). Do not round timestamps through JavaScript Date. `content_edits` apply sequentially and cannot be combined with `content_html`.

```json
{
  "id": "<note-uuid>",
  "expected_updated_at": "<exact updated_at from get_note>",
  "content_edits": [
    { "operation": "insert_after", "anchor_html": "<h2>Decisions</h2>", "content_html": "<p>New decision.</p>" },
    { "operation": "append", "content_html": "<p>Meeting minutes.</p>" }
  ]
}
```

Anchors must match exactly once and contain complete top-level HTML blocks from the read result: an entire paragraph, heading, list, or several adjacent blocks. Replace the containing paragraph/list to change its text. Missing, ambiguous or nested-only anchors cause an error without a write. A stale version causes a conflict: read again and reconcile the new content. Existing whole-field replacements remain compatible and can opt into the same version check.

`get_notes` never silently truncates a body. An over-budget item has `limit_exceeded` and its original `content_length`; use `get_note` separately when needed. Missing and foreign ids both return `not_found`. Metadata is outside the body-character budget; characters are not a token estimate.

### Ranked search with dates and tags

```json
{
  "query": "project interview",
  "mode": "hybrid",
  "tags": ["work", "urgent"],
  "tag_match": "all",
  "created_after": "2026-10-01T00:00:00Z",
  "created_before": "2026-11-01T00:00:00Z",
  "sort": "relevance",
  "limit": 20,
  "offset": 0
}
```

Created and updated ranges are independent. Lower bounds are inclusive, upper bounds exclusive; supply ISO timestamps with timezone offsets and at most six fractional digits. Use the user's timezone when defining a calendar month. Filters apply before ranking and pagination. Text mode supports quoted phrases, OR and excluded words using PostgreSQL web-search syntax. Semantic mode ranks each note by its best matching passage; hybrid combines text and semantic rank positions. Scores are comparable only within the same mode/query. Semantic/hybrid use the saved similarity threshold unless `min_similarity` is supplied.

If hybrid search lacks a key or has a model/configuration setup gap, it returns text results with `mode: "text"` and a warning. A genuine upstream error remains an error. Semantic results depend on indexed content; new or edited unindexed content can still be found through text search.

Deploy `20261105183000_mcp_note_workflows.sql` before updating `rag-search` and `mcp`. See `docs/ai/deployment/2026-11-05-feature-mcp-note-workflows.md` for rollout checks.

### Semantic search prerequisites

`search_notes_semantic` reuses the same AI index the web app's search uses. It works once **both** are true:

1. A **Gemini API key** is saved under Settings → Indexing (RAG). Every search spends that key's embedding quota.
2. The notes have been **indexed** from that screen.

If the key is missing, the notes were indexed with a different embedding model, or AI indexing is not set up, the tool says which of those it is instead of returning an empty result. Nothing extra is deployed or configured for it: the MCP function calls the project's existing `rag-search` function with your own token.

Note bodies are the editor's HTML (`<p>`, `<h1>`–`<h3>`, lists, `<strong>`, `<em>`, links, `<code>`, `<pre>`, `<blockquote>`, `<hr>`, `<img>`, `<mark>`). Agents are instructed to convert Markdown to this HTML before writing.

Everything an agent writes is sanitized on the server before it is stored: scripts, event handlers, `javascript:` URLs and elements outside the editor allowlist are removed. An agent cannot plant active content in your notebook.

---

## 4. Revoking access

Revoke a client's grant from the Supabase dashboard (**Authentication → OAuth Server**) or programmatically with `supabase.auth.oauth.revokeGrant({ clientId })`. The agent's next call gets `401` and the client asks you to authorize again.

---

## 5. Troubleshooting

| Symptom | Cause / fix |
|---------|-------------|
| Client reports it cannot register / "dynamic client registration disabled" | Enable dynamic client registration in Authentication → OAuth Server. |
| Browser opens a 404 or a page without a consent card | Site URL does not point at a deployment that contains `/oauth/consent`, or the branch with the consent page is not deployed. |
| Consent page says "Invalid authorization request" | `authorization_id` missing from the URL — check that the trailing-slash redirect on the host keeps the query string, or set the authorization path to `/oauth/consent/`. |
| `401 invalid_token` on every call | Grant revoked or token expired without refresh; remove and re-add the connector. |
| Discovery works but the client never asks to sign in | The client ignored `WWW-Authenticate`; check the client's MCP authorization support. |

Design and implementation details: `docs/ai/design/feature-mcp-notebook-access.md`, `docs/ai/implementation/feature-mcp-notebook-access.md`.
