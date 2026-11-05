---
phase: planning
title: Trash delivery plan
description: Implementation milestones and separate release evidence
---

# Trash — delivery plan

User approved implementation on 2026-11-05. Local feature work is implemented. Stage preview/backend deployment and SQL smoke checks passed; browser acceptance and production release remain separate.

## Milestones

- [x] M1: lifecycle/ownership on real PostgreSQL; old DELETE callers protected.
- [x] M2: durable offline snapshots and desktop/mobile-size Trash UI.
- [x] M3 local: bounded expiry/activity, media worker, workload and regression checks.
- [ ] M3 release: Stage browser acceptance, exact-head CI, production release and rebuilt Android runtime.

## Task Breakdown

- [x] **P1:** schema/indexes/RLS, archive/identity guards, restricted lifecycle RPCs, account cascade; real authenticated/service-role/rollback checks.
- [x] **P2:** immutable cycle IDs, version-checked snapshots, restore/selected purge and content-free replay receipts; old-confirmation and replay-after-restore checks.
- [x] **P3:** active/Trash image references, bounded legacy backfill, conservative unknown/shared handling, durable leased Storage worker and retry fencing.
- [x] **P4:** full owner-scoped deletion payloads/compaction, base versions, never-synced content, safe duplicate-create verification; legacy data preserved without invented snapshots.
- [x] **P5:** navigation, 50-row metadata list, lazy read-only preview, restore, selection, exact-count/Empty Trash confirmations, cache/session/request-order guards.
- [x] **P6:** sequential 100-note server batches; separate local-cleanup failures; active readers, public links, tags/AI queries/workspace invalidation audited.
- [x] **P7 local:** optional hourly Cron/pg_net migration, Vault dispatch contract, startup/reconnect/foreground/Trash/hourly fallback, server gates and bounded work.
- [x] **P8 local:** final migrations with real pgvector/HNSW, RLS/roles, 10,100 active notes, 600 expired entries, 256 KiB bodies, share/image cascades, concurrent active reads/edits and explicit vacuum.
- [x] **P9 local:** TDD/focused and broad Jest, Electron desktop/mobile-size component checks, type-check/lint, Deno check, static production build and self-review.
- [ ] **P7/P8/P9 release:** actual extension settings, scheduled execution without clients, Storage API failures/shared objects, Stage RPC/IO/headroom, independent review/exact-head CI and updated Android phone smoke. Nothing here claims deployment/CI/phone proof.

## Dependencies

Database-first protects existing server deletion paths. New clients add local-draft safety. Physical file cleanup requires complete reference inventory and authenticated worker configuration. Apply the release checks before enabling real scheduled destructive work.

## Timeline & Estimates

Local implementation/verification completed on 2026-11-05. No release date promised; cloud deployment and Android rebuild follow the existing release process.

## Risks & Mitigation

Free storage includes retained content and indefinite content-free receipts. Unknown media paths favor retention and can delay file cleanup. Legacy ID-only replays lack new operation-ID semantics. Offline devices can retain cached copies until reconciliation. Rollback disables maintenance and preserves recovery data.

## Resources Needed

Existing free Supabase/Cloudflare infrastructure, managed worker/Vault secret configuration, Stage synthetic notes/files, normal CI/review and Android build/device access. See [testing](../testing/2026-11-05-feature-note-trash.md) and [deployment](../deployment/2026-11-05-feature-note-trash.md).
