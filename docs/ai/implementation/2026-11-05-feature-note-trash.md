---
phase: implementation
title: Trash implementation
description: Delivered code, integration contracts and validation
---

# Trash — implementation

Implemented after user approval on 2026-11-05. Stage is deployed for PR #214; see the rollout and validation records. Production deployment and Android runtime proof remain separate release steps.

## Development Setup

Separate worktree outside the main checkout; branch `codex/feature-note-trash`, fetched main base `bd30c2716af9c2bfd39d27571133770b106e4d47`. Root and `ui/shell` locked dependencies installed with `npm ci`. Original checkout/APK artifacts preserved.

## Code Structure

- `20261105193000_add_note_trash.sql`: atomic archive, ID guard, RLS, complete snapshot/version/operation validation, restore/purge, expiry, image inventory/backfill and durable cleanup leases.
- `20261105193001_schedule_note_trash.sql`: optional extension setup, hourly jobs and Vault-backed media dispatch.
- `core/services/notes.ts`: validated Trash RPCs, metadata/keyset pagination and bounded batches.
- `core/services/trashMediaCleanup.ts` and `supabase/functions/trash-cleanup`: verified user/dedicated-cron authentication and bounded Storage removal/acknowledgement.
- Queue/save/bulk/sync hooks: durable full snapshots, base server versions, stable replay IDs and safe duplicate-create verification.
- `20261105193002_add_trash_card_previews.sql`: RLS-preserving list projection with bounded excerpts and no table rewrite.
- `TrashPage` adapts the archived snapshot to the shared Notes sidebar, cards and reader. Trash entry IDs identify list selection and confirmed mutations. Navigation/shell/controller/mutation hooks retain restore, confirmation, Empty Trash, session/request-order guards and cache reconciliation.
- `useTrashCleanup`: readiness/reconnect/foreground/Trash/hourly activity fallback. `trashCache`/auth hook: owner-only disposable cache clearing.

## Implementation Notes

Active readers stay on `notes`. The database trigger protects existing server DELETE paths. New deletion payloads preserve complete title/body/tags before local tombstones. Legacy queues are preserved without inventing missing historical content. Version conflicts remain readable locally. Content-free receipts survive restore/purge to prevent replay from re-deleting restored content.

Permanent actions use immutable Trash entry IDs. Empty Trash freezes all fetched IDs/count. All bulk server calls are sequential chunks of 100. Server acceptance and failed local cleanup remain distinct outcomes.

## Integration Points

Share links/vectors cascade with active deletion and are not silently recreated. Media references survive retention; only trusted unreferenced claims authorize Storage removal. Activity fallback requires local readiness, not an empty/healthy mutation queue. No auth database trigger performs cleanup work.

## Error Handling

Incomplete snapshots fail before mutation. Malformed replies are not acknowledged. Conflicts preserve local drafts; failed selections remain selected. Duplicate submission and stale responses are guarded. Expired previews are removed from pane/cache. Media failures keep durable work/backoff and reference fencing.

## Performance Considerations

Indexed 100-note expiry, one runner, 250 ms lock timeout, two-second statement timeout; event sweep ≤5 chunks within two seconds per owner/hour. Media/backfill is separately bounded. See [testing](../testing/2026-11-05-feature-note-trash.md) for real migration/HNSW workload evidence and limits.

## Security Notes

Owner-only RLS, explicit definer ownership, fixed search paths, denied raw writes/private helpers. Trusted service roles alone can select a cleanup owner or run globally. The worker verifies tokens/a dedicated maintenance secret. No secret was retrieved or committed.

## Validation

TDD red/green runs cover lifecycle, replay, ownership, file safety and UI races. Real PostgreSQL/pgvector, Electron component, type-check/lint/build/Deno evidence is tracked in [testing](../testing/2026-11-05-feature-note-trash.md).

AI DevKit feature lint validates all 14 required documents but exits 1 because it hard-codes branch `feature-note-trash`. Actual branch `codex/feature-note-trash` follows the requested isolated worktree/Codex convention; no alias/configuration hides this mismatch.
