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
- [ ] Publish PR, inspect cloud quality/CI receipts, and package the production APK.

## Dependencies & Risks
Use a sibling worktree already bootstrapped at /Users/denys.koreiba/Documents/EverFreeNote-android-apk, branch codex/offline-native-back. Retain existing signing identity for the manual APK. Do not confuse mock transport evidence with a physical phone. Avoid concurrent Allure runs and sharing Next build output with a preview server.

## Current evidence
1659 Jest/core integration cases passed; 59 component cases passed. Android emulator confirmed offline durability through restart/update, one same-ID row after reconnection, Gboard dismissal and semantic Back ordering. A native-discovered missing-online-event case is covered by quiet periodic foreground retry. Delivery remains the final step.
