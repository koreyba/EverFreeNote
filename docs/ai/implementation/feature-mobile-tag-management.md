---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Mobile Tag Management Implementation Guide

> This is the initial Phase 1 guide. Update it with concrete file-level decisions after requirements/design review and during implementation.

## Implemented Structure

- `core/services/notes.ts` now exposes `getAllNotes`, `renameTag`, and `deleteTag`; bulk methods operate on the complete user-scoped set and persist only changed notes.
- `core/types/offline.ts` and `core/utils/compactQueue.ts` support idempotent `renameTag`/`deleteTag` queue operations without collapsing them into ordinary note edits.
- `ui/mobile/hooks/useTagManagement.ts` derives mobile summaries from shared core tag functions and falls back from Supabase to SQLite.
- `ui/mobile/hooks/useTagManagementMutations.ts` performs optimistic cache/local updates, queues offline/failed remote operations, and invalidates note/tag/search queries.
- `ui/mobile/app/(tabs)/tags.tsx` plus `ui/mobile/components/tags/{TagSearchInput,AlphabeticalIndex,TagManagementCard}.tsx` provide the native screen and interactions.
- `ui/mobile/providers/CollapsibleTabBarProvider.tsx` and `ui/mobile/utils/collapsibleTabBar.ts` own scroll-direction state; Notes, Search, Tags, Settings, and AI Index report scroll events. The tabs layout animates the native bar with a 180 ms transform/opacity transition and resets on pathname changes.
- `ui/mobile/types/lucide-react-native.d.ts` supplies the local icon declarations required by the installed package artifact; `ui/mobile/eslint.config.mjs` ignores generated `android/build` reports.

## Current Validation

- Core TypeScript check passes.
- Mobile application and test TypeScript checks pass.
- Mobile ESLint passes with zero warnings/errors after excluding generated Android build reports.
- Focused behavior, core service, sync replay, hook, and existing-screen regression tests pass through Allure Agent.
- Full mobile Jest regression passes 705/705 tests across 82 suites.
- Root unit/integration/web coverage passes 1,417/1,417 tests across 183 suites.
- The mobile declaration for `lucide-react-native` is explicitly included by both application and test TypeScript configs so clean validation can resolve the package's missing published declaration.
- Focused coverage was generated; device-level Android/iOS smoke testing remains outstanding.

## Expected File Areas

- `ui/mobile/app/(tabs)/_layout.tsx`: add the main `Tags` route and host the collapsible tab-bar state/controller.
- `ui/mobile/app/(tabs)/tags.tsx`: native screen entry point.
- `ui/mobile/components/tags/`: native management UI, alphabet index, cards, action/rename modal, and supporting states.
- `ui/mobile/hooks/`: tag management and collapsible navigation hooks/controllers.
- `core/services/tags.ts` and/or `core/services/notes.ts`: shared tag semantics and complete affected-note operations.
- `ui/mobile/services/database.ts`, `ui/mobile/services/sync.ts`, and offline types: local persistence and safe queue replay if the existing queue cannot represent bulk operations.
- `ui/mobile/tests/`: behavioral tests for UI, controller, service, and synchronization changes.

## Implementation Rules

1. Keep tag normalization and mutation semantics in pure, reusable code. Do not duplicate web JSX or place bulk-update logic inside a component.
2. Do not implement rename/delete by iterating only over notes currently rendered by a paginated screen. The service/queue design must establish completeness first.
3. Use the existing React Query and SQLite patterns, including user-scoped query keys and invalidation after mutations.
4. Use a native modal for rename because `Alert.prompt` is not cross-platform. Use an explicit native confirmation for delete.
5. Add a clear X action to the mobile search input when text is present, matching the web behavior and existing mobile input accessibility conventions.
6. Alphabetical selection must assign the clicked letter and update the visible group; it must not invert a shared boolean in a way that makes clicking another letter disable filtering.
7. The collapsible tab bar starts visible, hides only after downward movement exceeds a threshold, shows after upward movement exceeds a threshold, and is forced visible at the top and on tab focus.
8. Preserve bottom safe-area spacing and ensure hiding the bar never clips the last row or makes it unreachable.
9. Add tests with real state transitions and meaningful behavioral assertions. Avoid tests that only assert mock call counts.

## Definition of Done for Implementation

- The route, native screen, operations, offline behavior, and collapsible navigation are implemented in the same PR.
- Domain and UI behavior is covered by focused tests, including the specific “click another letter selects that letter” regression.
- Type-check, lint, and focused test evidence is captured in the testing documentation.
- Manual QA covers both mobile platforms or documents the exact platform limitation.
- No unrelated local changes are included in the commit.
