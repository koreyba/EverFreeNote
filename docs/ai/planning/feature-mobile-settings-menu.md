---
phase: planning
title: Project Planning & Task Breakdown - Mobile Settings Menu
description: Task breakdown for delivering the complete interactive mobile settings screen.
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Feature docs, scope review, and native file-flow design completed.
- [x] Milestone 2: Mobile settings screen redesigned with horizontal scroll tabs and working account/API/WordPress panels.
- [x] Milestone 3: ENEX import/export flows integrated and covered by tests.
- [x] Milestone 4: Validation, implementation review, and final regression pass completed.

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Audit current mobile settings screen, existing shared services, and mobile testing setup.
- [x] Task 1.2: Create feature documentation in `docs/ai/{requirements,design,planning,implementation,testing}/feature-mobile-settings-menu.md`.
- [x] Task 1.3: Add any missing Expo/native dependencies needed for file import/export.

### Phase 2: Core Features
- [x] Task 2.1: Replace the current settings layout with a horizontally scrollable tab rail and card-based panel shell.
- [x] Task 2.2: Implement the `My Account` panel with email display, theme controls, sign out, and inline delete-account confirmation UI.
- [x] Task 2.3: Refactor API key settings into an inline tab panel with status, validation, error, and save behavior.
- [x] Task 2.4: Add a WordPress settings tab panel with load/save, enable toggle, and inline feedback.
- [x] Task 2.5: Implement RN-safe `.enex` import flow using native file picking and note creation services.
- [x] Task 2.6: Implement RN-safe `.enex` export flow using note reads, ENEX building, temporary file writing, and native sharing.

### Phase 3: Integration & Polish
- [x] Task 3.1: Update or remove obsolete `ComingSoon`-driven settings pieces from mobile.
- [x] Task 3.2: Add or update integration tests for the settings screen tabs and success/error states.
- [x] Task 3.3: Add targeted unit tests for new mobile ENEX helpers/services.
- [x] Task 3.4: Run validation (`type-check`, `lint`, targeted tests) and fix regressions.

## Dependencies
**What needs to happen in what order?**

- Task 1.1 and Task 1.2 must finish before implementation to lock the feature scope.
- Task 1.3 must happen before ENEX import/export implementation.
- Task 2.1 is the UI foundation for Tasks 2.2-2.6.
- Task 2.5 and Task 2.6 depend on authenticated note access through the existing mobile provider layer.
- Task 3.2 and Task 3.3 depend on the final screen/component structure stabilizing.

## Timeline & Estimates
**When will things be done?**

- Total estimated effort: 1 focused implementation pass.
- Highest-effort items:
  - ENEX import on mobile.
  - ENEX export/share flow on mobile.
  - Integration tests for the redesigned tabbed screen.

## Risks & Mitigation
**What could go wrong?**

- **Risk: Browser-only ENEX helpers do not work in React Native.**
  - Mitigation: build mobile-specific orchestration while reusing shared builder/types/services where compatible.
- **Risk: Native file APIs behave differently on Android/iOS.**
  - Mitigation: keep the first implementation on Expo-supported APIs and guard unsupported states with explicit errors.
- **Risk: Inline settings panels become visually crowded on small screens.**
  - Mitigation: use a horizontal tab rail, compact cards, and scrollable body content per panel.
- **Risk: Existing settings tests only cover the old screen.**
  - Mitigation: replace outdated assertions with tab-focused integration tests and add targeted service tests.

## Resources Needed
**What do we need to succeed?**

- Existing Supabase functions for API keys and WordPress settings.
- Expo native modules for document picking, file system access, and sharing.
- Mobile testing utilities already present in `ui/mobile/tests/`.
