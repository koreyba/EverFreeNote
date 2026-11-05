---
phase: testing
title: Trash validation evidence
description: Local lifecycle, offline, browser and workload checks with release gaps
---

# Trash — validation evidence

Created from the project's testing template. Local implementation is tested; cloud/CI/Android release evidence is not implied. All authored test runs used Allure Agent Mode; failed cases were read before fixes.

## Test Coverage Goals

Cover recovery/irreversible boundaries with real SQL ownership and atomicity checks, preserve offline content, and exercise confirmation/UI/account races. No claim of 100% line/branch coverage is made; scoped evidence and remaining runtime gaps are below.

## Unit Tests

- T1/R1/R3/R4/R8: ordinary versus irreversible warning copy, exact typed count, cancel, frozen Empty Trash IDs, duplicate-action guard and failed-selection handling.
- T8/R6/R8: complete create/update/delete compaction, latest owned draft, base server versions, acknowledgement of in-flight saves, durable replay IDs and safe duplicate-create verification.
- T9/R6/R7/R8: incomplete/foreign snapshots rejected, unknown legacy content excluded from owned Trash, account-specific cache clearing, stale/expired preview rejection, malformed RPC acknowledgements rejected and local-cleanup failures kept separate.
- Service checks cover 50-row body-free summaries, lazy preview, keyset ID gathering, sequential 100-note batches and activity-loop bounds. Worker handler tests use injected Auth/Storage dependencies for missing/wrong authentication, verified owner scope, dedicated Cron authentication and durable failure acknowledgement.

## Integration Tests

`core/tests/integration/note-trash-postgres.test.ts` starts its own resource-capped container without host ports/network/mounts and removes it afterwards. It applies real initial/RLS/share-link/Trash migrations with database roles and a synthetic `auth.uid` implementation. Vector mode additionally applies the repository's actual pgvector/HNSW migration.

Proved locally:

- T2: authenticated and service-role legacy DELETE archive; exact content fields; failed archive rolls back active deletion/share-link cascades; complete never-synced snapshot accepted idempotently; stale version and incomplete snapshot preserve active content.
- T3/T4: restore original ID/body, revoke old sharing, preserve a restored note on offline-operation replay, and prevent old permanent-deletion IDs from targeting a newer cycle.
- T5/T6: inclusive 720-hour boundary and one-second-before boundary, 100-note cap, real RLS/denied raw writes/global purge, account cascade, ID-update guard and per-owner server throttle.
- T7: shared image retention, mixed/unrecognized reference blocking, bounded 100-note legacy backfill, retry fencing and stale lease rejection.
- T11: final migration/HNSW workload and concurrent active reads/edits; no early or active-note deletion.

This fixture does not implement Supabase Auth HTTP, real Storage removal or pg_cron execution. The scheduler-unavailable branch is tested; actual scheduled jobs remain a release check.

## End-to-End Tests

Electron component scope: `TrashPage`, `BulkDeleteDialog`, `Sidebar`, `MobileLayout` (96 tests in the broad affected component run). Desktop and 375px mobile-size flows cover read-only preview, restore, single permanent cancel/confirm, exact-count Empty Trash with new arrivals excluded, no mobile horizontal overflow, and existing workspace/mobile regressions. Component API stubs are deliberate; these are browser checks, not deployed Supabase end-to-end proof.

## Test Data

Synthetic owners/notes only: anonymous/authenticated/service roles, never-synced drafts, conflicting versions, old/new deletion cycles, shared/unknown images, 201 legacy references and 10,100 active/1,100 Trash workload rows. No cloud note or real credential was read or modified.

## Test Reporting & Coverage

Verified broad Jest command (run alone to avoid mixed Allure result directories):

```sh
TRASH_TEST_POSTGRES=1 TRASH_TEST_VECTOR=1 \
TRASH_BENCHMARK_OUTPUT=docs/ai/testing/2026-11-05-note-trash-implementation-benchmark.json \
npx allure agent --goal "Final isolated core/web regression with real Trash SQL and HNSW workload" --report auto -- \
npx jest --selectProjects unit-core integration-core unit-web --runInBand
```

2026-11-05 broad run: native Jest **2,237 passed / 6 skipped**, 249 passing suites, exit 0. Allure rendered **2,177 passing logical tests / 6 skipped**, no failures/broken tests/runner findings. Counts are separate runner/report views and are not added together. Run output: `allure-agent-qYfwf5`. HTML generation was intentionally skipped above the 1,000-result threshold; Markdown/manifest evidence exists.

The six skipped tests are the pre-existing opt-in `mcp-supabase-local` PostgREST fixture suite; they are not counted as passed. Trash SQL/vector cases executed.

After final UI cache/account/retry hardening, focused UI/auth/navigation/shell tests were rerun separately; see the final checkpoint below. Browser checks also run separately through Allure:

```sh
npx allure agent --goal "Validate Trash and existing mobile workspace/browser regressions" --report auto -- \
npx cypress run --component --browser electron --spec \
cypress/component/features/notes/TrashPage.cy.tsx,cypress/component/features/notes/BulkDeleteDialog.cy.tsx,cypress/component/features/notes/Sidebar.cy.tsx,cypress/component/features/mobile/MobileLayout.cy.tsx
```

Root/shell/test type-check, repository ESLint with zero warnings, relevant Deno check and production static export passed during validation. Build uses a synthetic loopback Supabase URL/key; it proves compilation/export, not cloud connectivity. Final source verification is recorded below. `git diff --check` passes. AI DevKit's 14 document checks pass; its only feature-lint failure is the expected branch-name mismatch (`feature-note-trash` versus actual `codex/feature-note-trash`).

## Manual Testing

Browser component interaction/viewport checks executed locally. No phone-tested APK, Stage/Production browser smoke, exact-head CI, independent hosted review or cloud migration/function deployment is claimed.

## Performance Testing

[Final raw measurements](2026-11-05-note-trash-implementation-benchmark.json), PostgreSQL **18.6** with actual pgvector/HNSW, Docker **1 CPU / 512 MiB / 64 MiB shared buffers**, no host ports/network. Fixture: 10,100 active notes, 500 ordinary expired + 100 expired incompressible 256 KiB bodies, 500 recent Trash notes, 400 vectors (1536 dimensions), 100 share links and 600 Storage-reference metadata rows. Seven rollback samples per operation, then real committed changes.

| Operation | Median | Maximum |
| --- | ---: | ---: |
| Move 100 active notes with vector/share cascades | 15.702 ms | 20.572 ms |
| Purge 100 ordinary expired notes with image outbox | 11.692 ms | 14.244 ms |
| Purge 100 large expired notes | 16.741 ms | 68.867 ms |
| Committed 100-note purge during active reads/edits | 15.389 ms | 27.070 ms |

Six commits removed exactly 600 expired notes. Remaining: 10,000 active notes, 500 recent Trash entries and 100 newly moved entries. Vectors/share links cascaded, 600 durable file jobs were queued, and SQL did not delete Storage objects. Explicit vacuum/analyze wall time including Docker invocation: 95.587 ms. The measured SQL calls had an outer two-second timeout.

These results support bounded cleanup for hundreds of notes locally. They do not measure actual Supabase shared CPU/IO, Auth/RPC/network/Storage latency, deployed Cron, long-term vacuum/backlog behavior or very large individual notes. Verify those on Stage. The earlier [proposal-only benchmark](2026-11-05-note-trash-benchmark.json) is preserved as research, not substituted for final results.

## Bug Tracking

Regression tests were added for content loss during compaction, replay after restore, duplicate-create overwrite, incomplete snapshots, unknown/shared images, ambiguous Storage retries, stale previews and owner boundaries. Never weaken those checks to activate maintenance.

Remaining release checks: actual Cron/extensions/Vault, Storage API partial/failure/shared behavior, Supabase timeout/locked-row races, free-plan headroom/paused-project recovery, deployed active-view/search/export behavior and updated Android phone smoke. No external alert or runtime monitoring claim is made.

### Final checkpoint

- Final focused UI/auth/navigation/shell run: **50 passed**, exit 0, no Allure findings; `allure-agent-XTFXwH` (HTML report generated). This follows the final cache/account/failed-selection fixes; the earlier broad Jest run remains separately recorded above.
- Final isolated Electron run: **96 passed**, no retries/skips/findings; `allure-agent-oWqkwq` (HTML report generated). Desktop preview and mobile confirmation screenshots were inspected visually.
- Final root/core/web/shell/test type-check and `npx eslint . --max-warnings=0`: exit 0.
- Final static production build: exit 0 using synthetic build configuration. `deno check` for the new worker: exit 0. `git diff --check`: exit 0.
- Self-review fixed replay, incomplete snapshots, mixed image references, Storage failure fencing, stale/expired previews, legacy owner boundaries and hidden failed Empty Trash selections. No independent hosted review was performed.
- Cloud deployment, CI, actual Cron/Storage execution and Android runtime remain outside this local checkpoint.

### PR #214 Stage checkpoint

- Rebased local core/web Allure run: 2,222 passed, 20 opt-in MCP cases skipped; exit 0, no findings. Type-check, ESLint and worker Deno check passed.
- Stage preview, both migrations and worker are live. Real Stage SQL smoke checks passed for move/restore/owner isolation/permanent delete/expiry with all synthetic data rolled back. Both hourly jobs are active; manual Vault → pg_net → Edge dispatch returned HTTP 200. This verifies dispatch and the worker response, not removal of an actual uploaded file or a naturally elapsed hourly trigger.
- After aligning six component fixtures with the Trash RPC and confirmation copy, the focused Electron regression run passed all 73 tests (Allure: `allure-agent-8OBSen`).
- Stage browser acceptance and production deployment remain pending.
