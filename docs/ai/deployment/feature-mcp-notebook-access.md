---
phase: deployment
title: Deployment Notes - MCP Notebook Access
description: Release steps for the mcp Edge Function, Supabase OAuth 2.1 server settings and the consent page
---

# Deployment Notes

## Scope
- New Edge Function `supabase/functions/mcp` (deployed with `verify_jwt = false`).
- New static route `/oauth/consent` in the web app; `app/auth/callback` returns to a pending consent.
- Supabase Auth OAuth 2.1 Server must be enabled per project (dashboard setting, beta, free on all plans).
- No database migration; no new secrets are required (`MCP_PUBLIC_ORIGIN` / `MCP_AUTH_ISSUER` are optional overrides).
- Root `tsconfig.json` now excludes `supabase/functions` (Deno code is checked with `deno check`).

## Infrastructure

| Component | Where |
|-----------|-------|
| MCP server | Supabase Edge Function `mcp` → `https://<ref>.supabase.co/functions/v1/mcp` |
| Authorization server | Supabase Auth of the same project → `https://<ref>.supabase.co/auth/v1` |
| Consent page | Web app (Cloudflare Pages) → `<Site URL>/oauth/consent` |

Environments:

| Environment | Supabase project | Notes |
|-------------|------------------|-------|
| Local | `supabase start` | `[auth.oauth_server]` enabled in `config.toml`; Site URL `http://127.0.0.1:3000`; `npm run functions:serve` |
| Stage | `yabcuywqxgjlruuyhwin` ("EverFreeNoteStage", dkoreiba account) | OAuth server enabled, authorization path `/oauth/consent`, dynamic client registration ON (done 2026-09-10). Site URL set to `https://stage.everfreenote.pages.dev` (branch `stage`, auto-deployed by Cloudflare Pages; bundle verified to use this project) on 2026-09-10. Function deployed 2026-09-10 (`supabase functions deploy mcp --no-verify-jwt`). |
| Production | `pmlloiywmuglbjkhrggo` ("EverFreeNote", dkoreiba account) | OAuth server enabled, authorization path `/oauth/consent`, dynamic client registration ON (done 2026-09-10). Site URL `https://everfreenote.pages.dev` is already concrete; consent page goes live when this branch reaches the production deploy. Function deployed 2026-09-10. |

## Release Steps

1. **Web app** — merge/deploy the branch so `/oauth/consent` exists on the target site. Check `https://<site>/oauth/consent` renders the "Invalid authorization request" card.
2. **Supabase dashboard → Authentication → URL Configuration** — set **Site URL** to that site (no wildcard). Keep the redirect allow-list as is.
3. **Supabase dashboard → Authentication → OAuth Server** — enable the OAuth server, set authorization path `/oauth/consent`, enable dynamic client registration, save.
4. **Edge Function** — from a machine logged into the Supabase CLI (`npx supabase login`):

   ```bash
   npx supabase functions deploy mcp --no-verify-jwt --project-ref <ref>
   ```

5. **Smoke test** (no auth needed):
   - `GET https://<ref>.supabase.co/functions/v1/mcp/.well-known/oauth-protected-resource` → 200 JSON, `authorization_servers` = the project's `/auth/v1`.
   - `POST https://<ref>.supabase.co/functions/v1/mcp` with an empty JSON body → 401 with `WWW-Authenticate: Bearer resource_metadata="…"`.
   - `GET https://<ref>.supabase.co/.well-known/oauth-authorization-server/auth/v1` → 200 (OAuth server enabled).
6. **Acceptance** — add the connector in Claude (web), approve on the consent page, run the four tools; open Claude mobile and confirm the connector is present. See `docs/MCP_SETUP.md` and the manual checklist in `docs/ai/testing/feature-mcp-notebook-access.md`.

## Validation
- Function logs (Dashboard → Edge Functions → mcp → Logs) show no `mcp: request handling failed` entries during the acceptance run.
- Authentication → OAuth Server lists the registered client (e.g. Claude) after the first connection.
- Existing auth flows (Google sign-in landing on `/`, `/share`, `/settings`) unchanged.

## Rollback
- Remove the connector on the client side or revoke the grant in the dashboard — immediate loss of access.
- `npx supabase functions delete mcp --project-ref <ref>` removes the endpoint; disabling the OAuth server in the dashboard removes the authorization endpoints.
- The web app changes are additive (new route, callback redirect only when a consent is pending); reverting the deploy is sufficient if needed.

## Open items after first rollout
- Stage discovery verified live on 2026-09-10: `GET https://yabcuywqxgjlruuyhwin.supabase.co/.well-known/oauth-authorization-server/auth/v1` returns the metadata (registration endpoint present, PKCE S256, scopes `openid profile email phone offline_access`).
- If a client has to re-authorize after ~1 h, set the function secret `MCP_SCOPES_SUPPORTED=openid,email,offline_access` so refresh tokens are requested.
- Verify Cloudflare Pages keeps `?authorization_id=` across the trailing-slash redirect (`/oauth/consent` → `/oauth/consent/`); if not, set the authorization path to `/oauth/consent/`.
