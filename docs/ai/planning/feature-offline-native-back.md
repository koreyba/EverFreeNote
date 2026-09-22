---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Offline creation and Android Back plan

## Milestones
- [x] Inspect latest main, existing offline queue and Back wiring; requirements/design review.
- [x] Reproduce remote-unavailable new-note save and missing Back consumption with failing tests.
- [x] Unify durable local saves, stable-ID background sync, quiet failures and safe cleanup.
- [x] Add Back priority, keyboard and overlay handling, safe editor/list/route transitions.
- [x] Validate persistence/reconnect and Back interactions in component tests and Android emulator.
- [x] Run type checks, lint, full Jest coverage, targeted Cypress regression, and final design/code review.
- [x] Publish PR #201, inspect initial cloud quality/CI receipts, and build the production APK.

## Dependencies & Risks
Use a sibling worktree already bootstrapped at /Users/denys.koreiba/Documents/EverFreeNote-android-apk, branch codex/offline-native-back. Retain existing signing identity for the manual APK. Do not confuse mock transport evidence with a physical phone. Avoid concurrent Allure runs and sharing Next build output with a preview server.

## Current evidence
1659 Jest/core integration cases passed; 59 component cases passed. Android emulator confirmed offline durability through restart/update, one same-ID row after reconnection, Gboard dismissal and semantic Back ordering. A native-discovered missing-online-event case is covered by quiet periodic foreground retry. PR #201 contains the cloud check history; the delivered APK has a sidecar receipt recording its exact source commit, hash, signature and validation limits. Merge is separate from APK delivery and requires reviewing any remaining quality gates.

## User follow-up
- [x] Reproduce offline cold-start hang with an expired persisted session on Android.
- [x] Restore local identity without waiting on token refresh; remove duplicate auth ownership.
- [x] Verify cold launch, offline create, process restart, token refresh and same-ID reconnect.
- [x] Fix online deletion retaining the newly persistent cache and add regression coverage.
- [x] Full Jest regression: 1666/1666, plus focused component regressions and static checks.
- [x] Deliver production APK a35c992 with matching signature and inspect its terminal cloud checks.
- [x] Correct three component-test fixture/timing failures and four Codacy annotations; 55 targeted cases pass.
- [x] Read bccf7c8 terminal cloud results: all tests passed; Qodana license rejected and Codacy complexity remains above threshold. Merge remains separate.

## Pull-to-refresh tasks
- [x] Add failing gesture and refresh-data regression tests.
- [x] Implement Android-only list/reading refresh with bounded network wait and draft guards.
- [x] Verify actual nested list scrolling, reading refresh and editor exclusion in browser components.
- [x] Verify installed Android swipe behavior.
- [ ] Build and verify the production update.
- [ ] Review, update PR scope/evidence and inspect final CI.
