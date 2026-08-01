---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones

- [x] M1: Shared tab model, safe persistence, and focused unit tests.
- [x] M2: Web controller integration and editor/reader session preservation.
- [x] M3: Desktop and mobile web tab presentations plus all open-note paths.
- [ ] M4: Native mobile presentation using the shared model semantics.
- [ ] M5: Full verification, documentation updates, and review.

## Task Breakdown

### Phase 1: Foundation

- [x] T1.1: Add `core/services/noteWorkspaceTabs.ts` with types, state factory, invariant-preserving transitions, deduplication, close-neighbor behavior, and safe hydration.
- [x] T1.2: Add web `sessionStorage` adapter and `useNoteWorkspaceTabs` hook with one blank-tab fallback.
- [x] T1.3: Add unit tests for reducer transitions, malformed state, duplicate note IDs, persistence round-trip, and last-tab close.

### Phase 2: Core Web Features

- [x] T2.1: Integrate workspace state into `useNoteAppController` without breaking the existing `NoteAppController` consumers.
- [x] T2.2: Route list, FTS search, tag-only results, AI/internal note opens, edit, create, and settings return through active-tab transitions.
- [x] T2.3: Add active-tab flush/capture coordination and per-tab dirty/saving/error state.
- [x] T2.4: Extend `NoteEditor`, `RichTextEditor`, and `NoteView` to capture/restore draft, scroll, title selection, and best-effort editor selection.

### Phase 3: Integration & Polish

- [x] T3.1: Add desktop `NotesTabStrip` above the existing Reading/Editing header/actions.
- [x] T3.2: Add narrow/mobile web compact tab summary and list with accessible close/switch controls.
- [x] T3.3: Add focused component/controller tests for tab UX, duplicate selection, transitions, persistence, and save-error close confirmation.
- [x] T3.4: Verify Tags/Search/Settings navigation preserves the workspace.

### Phase 4: Native Mobile

- [ ] T4.1: Expose the shared model through the native mobile state/persistence adapter.
- [ ] T4.2: Adapt `useOpenNote`, Notes/Search result flows, and note route to activate existing sessions or replace the active session.
- [ ] T4.3: Add compact mobile tab list/sheet and native session tests.

### Phase 5: Quality Gates

- [x] T5.1: Update implementation/testing/deployment/monitoring docs with actual commands and evidence.
- [x] T5.2: Run focused unit/integration tests, production type-check, ESLint, and mobile checks independently.
- [x] T5.3: Run the project Allure agent-mode focused tests and inspect results/evidence.
- [ ] T5.4: Review diff/status for unrelated files and perform final code review.

## Dependencies

- T1.1 precedes T1.2 and all controller/UI work.
- T2.3/T2.4 must be complete before tab switching is considered loss-safe.
- T3.1/T3.2 depend on the controller's stable tab API.
- T4 can reuse T1.1 but must not change web persistence semantics.
- Verification depends on the final test plan and any new test fixtures.

## Timeline & Estimates

- Foundation: 0.5–1 day.
- Core web behavior: 1–2 days.
- UI and regression tests: 0.5–1 day.
- Native mobile adaptation: 1–2 days depending on route/store constraints.
- Quality gates and review: 0.5–1 day.

These are engineering estimates only; autosave/editor lifecycle and native navigation are the main uncertainty buffers.

## Risks & Mitigation

- **Autosave race on tab switch:** flush and capture before every transition; retain the existing debounced-latest/reconciliation tests.
- **Large drafts exceed storage quota:** catch serialization/storage errors, keep memory state, and avoid blocking the editor.
- **Remote note changed while a tab is inactive:** revalidate on activation through existing `resolveOpenableNote` and reconcile local draft fields.
- **Duplicate sessions from different entry points:** centralize all open-note actions in controller/reducer and test each source.
- **Editor selection coordinates become stale:** treat restoration as best effort and validate bounds before applying.
- **Native/web behavior diverges:** share reducer/invariants and keep presentation-specific adapters thin.
- **Unrelated dirty files in the main checkout:** work only in `.worktrees/codex-notes-tabs` and stage task files explicitly.

## Resources Needed

- Existing React/Tiptap editor and autosave hooks.
- Existing offline cache/queue and note query/mutation services.
- Jest/Testing Library and the project's Allure agent-mode workflow.
- One bounded subagent for architecture/mobile investigation or a disjoint native implementation slice; close it when its report is integrated.

## Execution Tracking

- T2/T3 done (2026-08-01): controller, editor/reader session capture, desktop/mobile web controls, and navigation integration. Combined Allure run `C:\Users\DenysKoreiba\AppData\Local\Temp\allure-agent-58hLNC`; 34/34 passed, expectations matched, no findings.
- T5.2 done (2026-08-01): `npm run type-check` passed, including `ui/mobile`; focused ESLint passed for all changed source/test files.
- T5.4 pending final diff/status audit. Native mobile route/store adaptation remains a separately scoped follow-up; the delivered mobile presentation is the responsive web Notes UI.

- T1.1 — done (2026-08-01): pure workspace model and 9 focused Jest tests. Allure agent output `C:\Users\DenysKoreiba\AppData\Local\Temp\allure-agent-QVm6RR`; 9/9 passed, expectations matched, no findings.
- T1.2/T1.3 — done (2026-08-01): web storage adapter, hook, and combined 13-test model/storage run. Allure agent output `C:\Users\DenysKoreiba\AppData\Local\Temp\allure-agent-Rc7Bph`; 13/13 passed, expectations matched, no findings.
