---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones

- [ ] Milestone 1: `useNoteData` extracted and integrated — orchestrator slimmed of all computed selectors
- [ ] Milestone 2: `useNoteSaveHandlers` extracted and integrated — save/write/delete logic moved out
- [ ] Milestone 3: `useNoteBulkActions` extracted and integrated — bulk operations moved out
- [ ] Milestone 4: Orchestrator reduced to pure wiring ≤150 lines, all tests green

## Task Breakdown

### Phase 1: Extract `useNoteData`

- [ ] **1.1** Create `ui/web/hooks/useNoteData.ts` — move `notes`, `notesById`, `resolveSearchResult`, `mergedFtsData`, `totalNotes`, `notesDisplayed`, `notesTotal`, `selectedCount`, and `notesRef` into the new hook
- [ ] **1.2** Update `useNoteAppController.ts` to call `useNoteData(...)` and destructure its return value
- [ ] **1.3** Verify TypeScript compiles with no errors; spot-check that `NoteAppController` return type is identical
- [ ] **1.4** Run existing test suite — confirm all tests pass

### Phase 2: Extract `useNoteSaveHandlers`

- [ ] **2.1** Create `ui/web/hooks/useNoteSaveHandlers.ts` — move `saving`, `autoSaving`, `handleAutoSave`, `handleSaveNote`, `handleReadNote`, `confirmDeleteNote`, `handleRemoveTagFromNote` into the new hook
- [ ] **2.2** Define the `UseNoteSaveHandlersParams` type (see design doc) and wire up all parameter dependencies in the orchestrator
- [ ] **2.3** Verify TypeScript compiles with no errors
- [ ] **2.4** Run existing test suite — confirm all tests pass
- [ ] **2.5** Manual smoke test: create note, edit note, autosave, manual save, offline save, delete note

### Phase 3: Extract `useNoteBulkActions`

- [ ] **3.1** Create `ui/web/hooks/useNoteBulkActions.ts` — move `deleteSelectedNotes`, `selectAllVisible` into the new hook
- [ ] **3.2** Wire up `UseNoteBulkActionsParams` in the orchestrator
- [ ] **3.3** Verify TypeScript compiles with no errors
- [ ] **3.4** Run existing test suite — confirm all tests pass
- [ ] **3.5** Manual smoke test: enter selection mode, select all, bulk delete (online + offline)

### Phase 4: Final orchestrator cleanup & review

- [ ] **4.1** Review `useNoteAppController.ts` — confirm it is ≤150 lines and contains only wiring
- [ ] **4.2** Ensure all new hook files have JSDoc comments describing their responsibility
- [ ] **4.3** Run full test suite one final time
- [ ] **4.4** Code review against design doc (`/check-implementation`)

## Dependencies

- **1.1 → 2.1:** `useNoteData` must be extracted first since `useNoteSaveHandlers` receives `notes` and `notesRef` from `useNoteData`'s output (or the orchestrator can pass them — both options are valid; see risk 2)
- **2.1 → 3.1:** `useNoteBulkActions` needs `notes` and `mergedFtsData` from `useNoteData`; extract data hook first
- **4.x:** depends on all prior phases complete

## Timeline & Estimates

| Phase | Effort |
|---|---|
| Phase 1 — `useNoteData` | ~1h (mechanical move, low risk) |
| Phase 2 — `useNoteSaveHandlers` | ~2h (most complex, many deps) |
| Phase 3 — `useNoteBulkActions` | ~45min (smaller surface) |
| Phase 4 — Cleanup & review | ~30min |
| **Total** | **~4.5h** |

## Risks & Mitigation

| Risk | Likelihood | Mitigation |
|---|---|---|
| **R1: TypeScript type errors** from moving callbacks that reference each other | Medium | Extract one hook at a time; keep full TS check after each phase |
| **R2: `notesRef` dependency** — `useNoteSaveHandlers` needs `notesRef` which is co-located with `notes` in `useNoteData`; if both are in the same hook, `useNoteSaveHandlers` must receive it as a param | Low | Pass `notesRef` from orchestrator as a parameter to both hooks; `useNoteData` returns it, orchestrator threads it to `useNoteSaveHandlers` |
| **R3: `selectedNoteRef`** — used inside `useNoteSaveHandlers.handleAutoSave` | Low | Keep `selectedNoteRef` in orchestrator, pass as param to `useNoteSaveHandlers` |
| **R4: Circular dependencies** between hooks | Low | All deps flow one-way: orchestrator → sub-hooks. Sub-hooks never import each other. |
| **R5: Regression in offline flows** | Medium | Manual smoke test after Phase 2 while offline (DevTools Network → Offline) |

## Resources Needed

- **Tools:** TypeScript compiler, existing test runner
- **Knowledge:** Familiarity with React hooks rules (especially `useCallback` dependencies), the offline queue/overlay model in `useNoteSync`
- **Docs to reference:**
  - Design doc: `docs/ai/design/feature-split-note-app-controller.md`
  - Current implementation: `ui/web/hooks/useNoteAppController.ts`
  - Existing sub-hooks: `useNoteSync.ts`, `useNoteSelection.ts`, `useNoteSearch.ts`, `useNoteAuth.ts`
