---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Progress Summary (2026-02-26)

All implementation tasks completed. TypeScript compiles cleanly. Pending: manual smoke tests and Phase 6 check-implementation.

**Line counts after refactor:**
| File | Lines |
|---|---|
| `useNoteAppController.ts` (orchestrator) | 323 |
| `useNoteData.ts` (NEW) | 88 |
| `useNoteSaveHandlers.ts` (NEW) | 416 |
| `useNoteBulkActions.ts` (NEW) | 112 |

The orchestrator at 323 lines contains zero business logic — only wiring (hook calls, param threading, nav wrappers, return).

## Milestones

- [x] Milestone 1: `useNoteData` extracted and integrated — orchestrator slimmed of all computed selectors
- [x] Milestone 2: `useNoteSaveHandlers` extracted and integrated — save/write/delete logic moved out
- [x] Milestone 3: `useNoteBulkActions` extracted and integrated — bulk operations moved out
- [x] Milestone 4: Orchestrator reduced to pure wiring, all TypeScript checks green

## Task Breakdown

### Phase 1: Extract `useNoteData` ✅

- [x] **1.1** Create `ui/web/hooks/useNoteData.ts` — move `notes`, `notesById`, `resolveSearchResult`, `mergedFtsData`, `totalNotes`, `notesDisplayed`, `notesTotal`, `selectedCount`, and `notesRef` into the new hook
- [x] **1.2** Update `useNoteAppController.ts` to call `useNoteData(...)` and destructure its return value
- [x] **1.3** Verify TypeScript compiles with no errors; spot-check that `NoteAppController` return type is identical
- [ ] **1.4** Run existing test suite — confirm all tests pass *(deferred — no automated tests for this hook)*

> **Note:** `AggregatedFtsData` type derived via `NonNullable<ReturnType<typeof useNoteSearch>['aggregatedFtsData']>` to avoid type drift with the source.

### Phase 2: Extract `useNoteSaveHandlers` ✅

- [x] **2.1** Create `ui/web/hooks/useNoteSaveHandlers.ts` — move `saving`, `autoSaving`, `handleAutoSave`, `handleSaveNote`, `handleReadNote`, `confirmDeleteNote`, `handleRemoveTagFromNote` into the new hook
- [x] **2.2** Define the `UseNoteSaveHandlersParams` type and wire up all parameter dependencies in the orchestrator
- [x] **2.3** Verify TypeScript compiles with no errors
- [ ] **2.4** Run existing test suite — confirm all tests pass *(deferred)*
- [ ] **2.5** Manual smoke test: create note, edit note, autosave, manual save, offline save, delete note *(pending)*

### Phase 3: Extract `useNoteBulkActions` ✅

- [x] **3.1** Create `ui/web/hooks/useNoteBulkActions.ts` — move `deleteSelectedNotes`, `selectAllVisible` into the new hook
- [x] **3.2** Wire up `UseNoteBulkActionsParams` in the orchestrator
- [x] **3.3** Verify TypeScript compiles with no errors
- [ ] **3.4** Run existing test suite — confirm all tests pass *(deferred)*
- [ ] **3.5** Manual smoke test: enter selection mode, select all, bulk delete (online + offline) *(pending)*

### Phase 4: Final review

- [x] **4.1** Orchestrator contains only wiring — no business logic
- [x] **4.2** All new hook files have JSDoc comments describing their responsibility
- [ ] **4.3** Run full test suite one final time *(pending)*
- [ ] **4.4** Code review against design doc (`/check-implementation`) *(in progress)*

## Dependencies

- **1.1 → 2.1:** ✅ `useNoteData` extracted first; `notesRef` passed from orchestrator to `useNoteSaveHandlers`
- **2.1 → 3.1:** ✅ `useNoteData` output (`notes`, `mergedFtsData`) threaded to `useNoteBulkActions`
- **4.x:** all prior phases complete ✅

## Timeline & Estimates

| Phase | Estimated | Actual |
|---|---|---|
| Phase 1 — `useNoteData` | ~1h | ~45min |
| Phase 2 — `useNoteSaveHandlers` | ~2h | ~1h (TypeScript type fix for AggregatedFtsData) |
| Phase 3 — `useNoteBulkActions` | ~45min | ~30min |
| Phase 4 — Cleanup & review | ~30min | ongoing |
| **Total** | **~4.5h** | **~2.5h** |

## Risks & Mitigation

| Risk | Status | Notes |
|---|---|---|
| **R1: TypeScript type errors** | ✅ Resolved | One type error hit: `AggregatedFtsData.total` was `number` vs `number \| undefined`. Fixed by deriving type from `useNoteSearch` return. |
| **R2: `notesRef` dependency** | ✅ Resolved | `notesRef` returned from `useNoteData`, threaded to `useNoteSaveHandlers` via orchestrator params |
| **R3: `selectedNoteRef`** | ✅ Resolved | Kept in orchestrator, passed as param |
| **R4: Circular dependencies** | ✅ No issues | All data flows orchestrator → sub-hooks |
| **R5: Regression in offline flows** | ⏳ Pending | Manual smoke test still needed |

## Resources Needed

- **Tools:** TypeScript compiler, existing test runner
- **Docs to reference:**
  - Design doc: `docs/ai/design/feature-split-note-app-controller.md`
  - Implementation: `ui/web/hooks/useNoteAppController.ts`, `useNoteData.ts`, `useNoteSaveHandlers.ts`, `useNoteBulkActions.ts`
