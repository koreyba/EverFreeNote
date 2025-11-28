---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Foundation (Providers & Adapters)
- [ ] Milestone 2: Service Layer Extraction
- [ ] Milestone 3: UI Decomposition & Integration
- [ ] Milestone 4: Cleanup & Documentation

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Create `SupabaseProvider` to manage the Supabase client instance.
- [x] Task 1.2: Create `BrowserAdapter` (wrappers for `window`, `localStorage`, `alert`, `prompt`).
- [x] Task 1.3: Implement `SanitizationService` using DOMPurify.

### Phase 2: Service Layer
- [x] Task 2.1: Create `NoteService` (CRUD operations).
- [x] Task 2.2: Create `AuthService` (Login/Logout).
- [x] Task 2.3: Create `SearchService` (Unify FTS and ILIKE logic).
- [x] Task 2.4: Refactor `useNotesQuery` and `useNotesMutations` to use these services.

### Phase 3: UI Decomposition
- [x] Task 3.1: Extract `AuthShell` (Login screen) from `page.tsx`.
- [x] Task 3.2: Extract `Sidebar` component.
- [x] Task 3.3: Extract `NoteList` / `VirtualNoteList` logic.
- [x] Task 3.4: Extract `NoteEditor` and `NoteView` components.
- [x] Task 3.5: Create `useNoteAppController` hook to manage state.
- [x] Task 3.6: Reassemble `page.tsx` using the new components and controller.

### Phase 4: Cleanup & Documentation
- [ ] Task 4.1: Remove unused imports and legacy code.
- [ ] Task 4.2: Update `ARCHITECTURE.md` with new component structure.
- [ ] Task 4.3: Run full test suite to ensure no regressions.
- [ ] Task 4.4: Create `IMPLEMENTATION_SUMMARY.md` for the user.
- [ ] Task 3.7: Replace in-page FTS UI с `components/SearchResults` + единый вызов `search.ts` (Codex).

### Phase 4: Cleanup & Documentation
- [ ] Task 4.1: Fix encoding issues in `README.md` and `ARCHITECTURE.md`.
- [ ] Task 4.2: Verify all `dangerouslySetInnerHTML` usages use the sanitizer.
- [ ] Task 4.3: Run full regression test suite.

## Dependencies
**What needs to happen in what order?**

- Phase 1 must happen before Phase 2 (Services need the client).
- Phase 2 must happen before Phase 3 (UI needs services/hooks).

## Timeline & Estimates
**When will things be done?**

- **Phase 1**: 2 hours
- **Phase 2**: 3 hours
- **Phase 3**: 4 hours
- **Phase 4**: 1 hour
- **Total**: ~10 hours

## Risks & Mitigation
**What could go wrong?**

- **Risk**: Breaking existing functionality during refactoring.
  - **Mitigation**: Run E2E tests after each major extraction.
- **Risk**: Performance regression in virtual list.
  - **Mitigation**: Test with large dataset (1000+ notes).
