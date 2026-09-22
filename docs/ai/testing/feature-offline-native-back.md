---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Offline saves and native Back validation

## Test Coverage Goals
Cover local durability, restart/reconnect identity, overlapping writes, native Back priority and failure-safe navigation. Keep browser storage/transport simulation distinct from an installed Android run. Coverage percentages will come from the final instrumented Jest run; do not infer 100% coverage from green tests.

## Unit Tests
- `useNoteSaveHandlers.test.tsx`: stale online flag, first/manual save, overlapping auto/manual creation, storage/queue failures.
- `useNoteSync.test.tsx`: stable ID, quiet background writes, duplicate insert recovery, remote deletion recovery, auth restoration and ownership guard.
- `offline-sync-manager.test.ts`: edits arriving during queue compaction remain in the queue.
- `offlineStorage.test.ts`: an older acknowledgement cannot mark newer text synced.
- `appBack.test.tsx` and `nativeShellProvider.test.tsx`: priority, keyboard, async save, repeated presses, failed save, root exit, listener lifecycle.
- Existing notes, mutations, shell, settings, queue/cache and core integration suites remain in the regression run.

## Integration Tests
- `cypress/component/features/mobile/OfflineNotes.cy.tsx`: full notes controller/editor, real IndexedDB, blocked HTTP requests while online is still reported, local save, app remount with a fresh query cache, reconnect and exactly one remote ID. The transport response is simulated; this is a browser component integration test, not real Supabase evidence.
- `MobileLayout.cy.tsx`: real editor/menu/fullscreen interactions. Added Back ordering and tabs-menu dismissal; 28 cases passed without retries.

## End-to-End Tests
Installed Android 36 emulator smoke passed against real local Supabase using package `com.everfreenote.shell.offlineback`, the same production source and a development backend configuration. ADB system Back dismissed Gboard, one open formatting menu, fullscreen, note/list, then exited to the Android launcher. Settings Back restored `/` from `/settings/`.

With backend access disconnected and navigator.onLine still true, note `62bbc8f7-f287-43cf-9179-31433f5115ff` and its body persisted in IndexedDB with zero error toasts. Force-stop/relaunch and an APK update retained the pending note. Restoring the backend connection without dispatching an online event resulted in an empty queue and one real database row with the same ID/title/body. Evidence: `.tmp-artifacts/native-smoke.jsonl`, keyboard screenshots, and a direct local database SELECT. The periodic retry was added after the initial native run exposed missing WebView online events.

## Test Data
Isolated local development APK and local test account. Browser component tests use `offline-test.invalid` with intercepted traffic. No production note content or private credentials are included in test artifacts.

## Test Reporting & Coverage
Allure directories under `.tmp-artifacts/`: `offline-red` (3 expected regressions), `offline-sync-red` (identity/cache regressions), `back-red` (4 expected regressions), `queue-race-red` (2 expected regressions), `auth-red` (auth startup regression).
Green checkpoints: `offline-green` 28/28; `back-green` 14/14; `mobile-component-pass1` mobile-layout 28/28 (offline harness initially failed); `offline-component-pass3` 1/1, no findings. Final full coverage run: `unit-verified`, 1659/1659 passed, no retries or Allure findings. Component regression: `component-final`, 59/59 passed, no retries or findings. `reconnect-green`: 10/10 after the final retry change. Type checks, ESLint (zero warnings), git diff whitespace check and development APK build passed.

Jest file coverage (statement/function/branch): `appBack.ts` 100/100/100%; `offlineQueue.ts` 100/100/100%; `NativeShellProvider.tsx` 89.7/84.6/85.7%; `useNoteSaveHandlers.ts` 83.5/74.2/68.9%; `useNoteSync.ts` 67.5/50/52.6%. These are whole-file figures, not changed-line coverage. DOM/storage/network integration callbacks are also exercised by Cypress and the Android smoke; their runtime proof is not counted as Jest coverage. The 100% whole-file goal is not met for those existing hooks.
Initial full Jest regression found only changed-contract expectations; these were updated to await local flush and include owner metadata, preserving behavior assertions.

After the clean CI failure exposed the missing root keyboard dependency, targeted native-provider/storage tests passed 19/19 and the offline IndexedDB component passed 1/1 (`ci-fix-unit`, `offline-final`). The unit invocation mistakenly expected 21 tests: source and parameterized-case inventory confirms 12 provider plus 7 storage cases, with none missing; the sole Allure finding is this expectation metadata error. Final type checks and ESLint also passed. Initial cloud static analysis reported a complexity increase of 144 against a limit of 100; the check is retained for owner review, not waived by local test success.

## Manual Testing
Android emulator smoke passed as described above. Physical-phone validation was not performed. Production APK receipt is generated with the artifact.

## Performance Testing
No new network call is awaited by editor save. Saves complete after local cache and queue persistence. Back serializes navigation while a local save is active. While visible, sync retries every 15 seconds and on focus/visibility restoration, covering transport recovery without online events.

## Bug Tracking
Track remaining evidence in the feature planning document. No database migration or storage version change. Local pending data remains available on transient transport failures.
