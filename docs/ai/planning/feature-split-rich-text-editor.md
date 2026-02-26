---
phase: planning
title: Planning — Split RichTextEditor
description: Task breakdown for extracting EditorMenuBar and editorExtensions
---

# Project Planning & Task Breakdown

## Milestones

- [x] Milestone 1: Documentation complete
- [x] Milestone 2: Implementation — 3 file changes + 2 new files
- [x] Milestone 3: TypeScript clean (npx tsc --noEmit: no errors)

## Task Breakdown

### Phase 1: Preparation
- [x] Task 1.1: Read RichTextEditor.tsx and RichTextEditorWebView.tsx in full
- [x] Task 1.2: Identify exact lines to move, imports to split, types to export
- [x] Task 1.3: Write documentation

### Phase 2: Implementation
- [x] Task 2.1: Create `ui/web/components/editorExtensions.ts` (50 lines)
- [x] Task 2.2: Create `ui/web/components/EditorMenuBar.tsx` (514 lines)
- [x] Task 2.3: Update `RichTextEditor.tsx` — remove MenuBar, remove extensions useMemo, add imports (764 → 208 lines)
- [x] Task 2.4: Update `RichTextEditorWebView.tsx` — remove extensions useMemo, import from editorExtensions (242 → 194 lines)
- [x] Task 2.5: Run `npx tsc --noEmit` — clean

### Phase 3: Testing
- [x] Task 3.1: Existing Cypress tests unchanged (no import path changes — all test files import from original file paths)
- [ ] Task 3.2: Run Cypress to verify no regressions (requires Cypress environment)

## Dependencies

- `HistoryState` type: defined in `EditorMenuBar.tsx`, imported in `RichTextEditor.tsx`
- `editorExtensions` const: defined in `editorExtensions.ts`, imported in both editor files

## Risks & Mitigation

| Risk | Mitigation |
|---|---|
| TipTap extension instances shared at module level may cause issues with SSR/multiple editors | Both files already used `useMemo(() => [...], [])` with `[]` dep — effectively equivalent to module-level const |
| Missing import in EditorMenuBar.tsx | Read RichTextEditor.tsx imports carefully before writing |
