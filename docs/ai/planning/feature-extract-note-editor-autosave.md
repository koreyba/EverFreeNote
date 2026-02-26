---
phase: planning
title: Planning — Extract useNoteEditorAutoSave
description: Task breakdown
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 1: Documentation complete
- [x] Milestone 2: Hook created, NoteEditor updated
- [x] Milestone 3: TypeScript clean, no regressions

## Task Breakdown

### Phase 1: Preparation
- [x] Task 1.1: Read NoteEditor.tsx in full, map what moves vs stays
- [x] Task 1.2: Design hook API (params, returns, internals)
- [x] Task 1.3: Write documentation

### Phase 2: Implementation
- [x] Task 2.1: Create `ui/web/hooks/useNoteEditorAutoSave.ts`
- [x] Task 2.2: Update `NoteEditor.tsx` — remove extracted logic, call hook
- [x] Task 2.3: Run `npx tsc --noEmit` — verify clean

### Phase 3: Testing
- [ ] Task 3.1: Verify existing NoteEditor Cypress tests unaffected
- [ ] Task 3.2: Add Cypress tests for autosave behavior (note-switch edge case, flush)

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| `onNoteSwitch` closure captures stale `initialTags` | NoteEditor defines the callback inline — it always sees current props |
| `debouncedAutoSave.reset` on note switch uses wrong tags | Use `initialTags` (already correct — it's the incoming prop for the new note) |
