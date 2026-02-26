---
phase: planning
title: Planning — Deduplicate Offline Write Pattern
description: Task breakdown for extracting executeOfflineWrite
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 1: Documentation complete (requirements + design + planning)
- [x] Milestone 2: `executeOfflineWrite` extracted and both callers refactored
- [x] Milestone 3: Tests updated/added (offline path tests added; TS clean)

## Task Breakdown

### Phase 1: Preparation
- [x] Task 1.1: Read `useNoteSaveHandlers.ts` in full, identify all divergences between the two offline paths
- [x] Task 1.2: Write requirements doc
- [x] Task 1.3: Write design doc
- [x] Task 1.4: Write planning doc

### Phase 2: Implementation
- [x] Task 2.1: Define `OfflineWriteInput` type at the top of the file
- [x] Task 2.2: Implement `executeOfflineWrite` private closure inside `useNoteSaveHandlers`
- [x] Task 2.3: Refactor `handleAutoSave` — replace offline create and offline update inline blocks with `executeOfflineWrite` calls
- [x] Task 2.4: Refactor `handleSaveNote` — remove `offlineMutation` closure, replace offline branches with `executeOfflineWrite` calls
- [x] Task 2.5: Verify TypeScript compiles with no errors (npx tsc --noEmit: clean)

### Phase 3: Testing
- [x] Task 3.1: Review existing `useNoteSaveHandlers.cy.tsx` — coverage holds, no modifications needed to existing 8 tests
- [x] Task 3.2: Add Cypress tests for `executeOfflineWrite` behavior (offline create path, offline update path, lastSavedAt)
- [ ] Task 3.3: Confirm no regressions in `useNoteBulkActions.cy.tsx` or `useNoteAppController.cy.tsx` (Cypress can't run in this environment)

## Dependencies

- `CachedNote` type from `@core/types/offline` must not need `created_at`/`updated_at` fields (verify)
- All caller changes are internal — no dependency on other files

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| Subtle behavioral difference between the two offline paths | Document each divergence in Phase 1 before writing code; reconcile explicitly |
| `CachedNote` shape mismatch removes needed fields | Inspect display layer usage before removing `@ts-ignore` fields |
| Count drift after refactor | Keep `handleAutoSave`'s full queue scan in finally as safety net |
