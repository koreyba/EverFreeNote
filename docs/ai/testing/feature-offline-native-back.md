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
Android emulator smoke passed as described above. The user installed production APK 23b7d05 on a physical phone and confirmed offline creation and cached-note loading. The subsequent expired-session cold-start fix was validated on the emulator; physical-phone confirmation of that follow-up remains pending. Production APK receipt is generated with the artifact.

## Performance Testing
No new network call is awaited by editor save. Saves complete after local cache and queue persistence. Back serializes navigation while a local save is active. While visible, sync retries every 15 seconds and on focus/visibility restoration, covering transport recovery without online events.

## Bug Tracking
Track remaining evidence in the feature planning document. No database migration or storage version change. Local pending data remains available on transient transport failures.

## Offline cold-start follow-up (2026-09-22)
The user reported an endless startup spinner without internet. Reproduced on Android 36 with a real saved Supabase session whose `expires_at` was set in the past and backend access removed: the old APK still displayed the spinner after 74 seconds. Updating the same development package with preserved app data opened the cached notes while the session remained expired and the backend remained unreachable.

Created note `cb891db9-6e1f-4b4a-aca5-69a4d39603ce` in that state, force-stopped and relaunched the app, then restored the backend connection. IndexedDB retained the text, the SDK refreshed the token, the queue emptied, and a real local Supabase SELECT found the same ID/title/body. No save-error toast appeared. Receipt: `.tmp-artifacts/cold-start-native.jsonl`; development package `com.everfreenote.shell.offlineback`, not the production backend.

Regression tests cover plain/chunked session cookies, an unreachable refresh, absent/foreign-project sessions, an empty initial auth event and sign-out racing a late session response. `cold-start-red` reproduced the loading failures; `cold-start-green2` passed all six auth cases. The final coverage run `cold-start-unit-final` passed 1666 logical cases, matched the expected count, and reported no findings. Type checks and zero-warning ESLint passed.

Online deletion now removes successful deletions from the persisted cache and overlay; failed bulk deletions remain available. Two regression assertions failed before this fix (`delete-cache-red`), then the focused auth/delete run passed 25 cases (`delete-auth-green`). The extended IndexedDB create/reconnect/delete/remount flow, controller and search tests passed 25/25 without retries (`cold-start-components-final`). The other auth/save/bulk/provider component cases passed in `cold-start-components2`; its two failures were the subsequently corrected old auth-owner expectation and a test attempting the read-only delete button while still editing.

Cloud E2E on 23b7d05 exposed the stale deleted-note cache, now covered by the new regression. Cloud component results also exposed three stale queue-contract assertions, updated to preserve per-item compaction and create ownership. Qodana did not analyze code because its cloud token/license was declined. Cloud receipts for the updated head must be reviewed separately from local success.

`ci-regression-local` passed all 54 component cases with coverage enabled: 16 sync-manager, 10 compaction and 28 mobile-layout. The invocation incorrectly expected 55; source inventory confirms 54 with none excluded. Its only finding is that count metadata error. Two Linux CI toolbar interaction failures did not reproduce locally, so their cloud result remains a separate unresolved signal until the updated head runs.

## CI follow-up on a35c992
Cloud E2E, web/core units, build, shell build, preview, CodeQL, Semgrep and Sonar passed. Component CI recorded 685 passes and three failures: an incomplete bulk-delete fixture omitted deleteNote, the IndexedDB assertion ran before async deletion completed, and inline-format commands raced menu exit/reopening. Updated the fixture with a successful-deletion assertion, waited for the delete dialog to finish, and awaited menu dismissal without Cypress auto-scrolling the fixed toolbar. No application code changed.

The targeted follow-up ran 55 cases with coverage, matching the source inventory and expected count; all passed without retries or Allure findings (`.tmp-artifacts/ci-followup-targeted`). Type checks and ESLint passed. Four Codacy test annotations were addressed with explicit stub references and an optional provider-user parameter. Final cloud confirmation remains separate. Qodana still rejects the configured license/token; no credentials or quality thresholds were changed.

The same menu-exit wait and fixed-toolbar click policy was applied to font/list controls that failed on the preceding Linux run. The final mobile-layout scope passed 28/28 without retries or findings (`ci-followup-menu`). The shipped a35c992 APK remains current because this follow-up changes only tests and evidence.

## Android pull-to-refresh (2026-09-22)
Gesture and data-flow tests failed before implementation (`pull-refresh-red`, `pull-refresh-red-guards`). HTTP cancellation forwarding was independently removed and restored: the real Supabase client test failed with missing signal identity (`pull-refresh-transport-red-final`) and passed after restoration.

The complete Jest run passed 1686 logical cases without retries, skips or findings (`pull-refresh-unit`). Final focused contracts passed 20/20 (`pull-refresh-unit-final`). Mobile browser components passed 30/30, including empty-list gesture wiring, reading refresh, editor exclusion and existing layout/menu regressions (`pull-refresh-components-verified`). The original generic visibility matcher classified a visibly rendered overlay as hidden; the test now asserts its positive width, in-viewport bounds and computed visibility, retaining the refresh-action assertion. Final type checks and zero-warning ESLint passed.

Installed development APK on Android 36, preserving app data. With real local Supabase, an ADB swipe fetched a newly inserted server note; a second swipe refreshed its open reading content after a direct server update. Swiping below the list top and inside the editor sent no new notes request. During an explicitly verified WebView network failure, the content remained, the indicator ended, and exactly one error toast appeared. Merely disabling emulator Wi-Fi/removing adb reverse initially left an existing transport available, so those attempts are not offline proof. The final receipt records failed backend access and network errors under active CDP network emulation. Artifacts: `.tmp-artifacts/pull-refresh-native.jsonl`, `pull-refresh-reading-before.png`, `pull-refresh-reading-after.png`. This is emulator evidence, not physical-phone confirmation.

The previous bccf7c8 cloud head passed all web/core units, Linux component tests and E2E. Qodana license rejection and Codacy complexity remain separate from executed test success; final updated-head checks are recorded on PR #201.

Static review follow-up: Codacy reported ten annotations. Removed the test's non-null assertion, made nullable gesture guards explicitly boolean, and made the optional reading snapshot match the controller contract. For the three affected TypeScript files, explicitly selected `@typescript-eslint/no-unused-vars` instead of the base JavaScript rule that incorrectly marks callback-signature parameter names unused; no quality threshold was changed. Focused contracts passed 20/20 and mobile components 30/30 after review (`pull-refresh-reviewed`, `pull-refresh-component-review`). Type checks and zero-warning ESLint passed. Native remote deletion also returned to the list and removed the created test fixture after its pending save completed.

## Cache reconciliation and immediate local rendering (2026-09-22)
- Red: `reconcile-red` reproduces both stale cached rows after refresh and a skeleton covering available notes. `reconcile-service-red` exposes missing authoritative ID verification.
- Green: `reconcile-unit-final` runs all 1697 existing/new logical Jest cases, no failures. Review found an additional editor-opening race at the cache transaction boundary: `reconcile-editor-red` fails; `reconcile-reviewed` passes all 37 targeted cases after the guard (one additional logical case).
- Browser: `reconcile-ui` passes all 3 real IndexedDB/HTTP-boundary component scenarios. Cached cards render within the 2-second assertion while the initial response is delayed 5 seconds. Once the network response arrives, the actual Android touch gesture removes two confirmed deleted notes from both rendered list and storage; later-page and pending notes survive remount. A separate IndexedDB transaction test preserves newer revisions, ownership changes and queued edits.
- Test fixture corrections: wait until the initial request actually starts; expose PostgREST count headers across CORS; permit the documented 15-second foreground retry when reconnect overlaps a failed write. No assertions removed. The browser can serialize identical GET requests, so network-unavailable display and successful online refresh are separate assertions.
- Android emulator 36: prior installed build shows zero cached cards after 2 seconds with backend requests held, and retains both deleted fixtures after a list swipe. The updated build displays the cached fixture while backend requests remain held; a list swipe removes both remotely deleted fixtures without opening them, including persistent cache cleanup. Evidence: `.tmp-artifacts/reconcile-native.jsonl`. Native tests use the local Supabase test account, not production data or a physical phone.
- Base lifecycle lint passes; feature docs all pass, with the existing naming-only exception (`feature-*` expected by ai-devkit, mandated `codex/*` branch). Final typecheck and full zero-warning ESLint are required before publication.
