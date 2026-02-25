---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown — Force Paste Format

## Milestones

- [ ] Milestone 1: Service layer — `SmartPasteService` accepts forced type
- [ ] Milestone 2: UI — "Apply as Markdown" button in web and mobile toolbars
- [ ] Milestone 3: Tests — unit + integration coverage, manual QA sign-off

## Task Breakdown

### Phase 1: Service Layer

- [ ] **Task 1.1 — Extend `SmartPasteService.resolvePaste()`**
  - Add optional 3rd parameter `forcedType?: PasteType`.
  - When provided, skip `detectPasteType()` and use synthetic detection (`confidence = 1.0`, `reasons = ['forced-by-user']`).
  - Extract existing pipeline body into private `_resolve(payload, detection, options)` helper to avoid duplication.
  - File: `core/services/smartPaste.ts`

### Phase 2: Web UI

- [ ] **Task 2.1 — Add `applySelectionAsMarkdown` handler to `RichTextEditor`**
  - Extract plain text from current selection via `editor.state.doc.textBetween(from, to, '\n')`.
  - Call `SmartPasteService.resolvePaste(payload, undefined, 'markdown')`.
  - Replace selection with `editor.chain().focus().deleteRange({ from, to }).insertContent(result.html).run()`.
  - Track `hasSelection` state via `onSelectionUpdate` TipTap event.
  - File: `ui/web/components/RichTextEditor.tsx`

- [ ] **Task 2.2 — Create `ApplyMarkdownButton` web component**
  - Props: `disabled: boolean`, `onClick: () => void`.
  - `aria-label="Apply as Markdown"`, respects `disabled`.
  - Reuse existing toolbar button styling.
  - File: `ui/web/components/ApplyMarkdownButton.tsx` (new)

- [ ] **Task 2.3 — Wire button into `RichTextEditor` toolbar**
  - Render `ApplyMarkdownButton` in toolbar, `disabled={!hasSelection}`, `onClick={applySelectionAsMarkdown}`.
  - File: `ui/web/components/RichTextEditor.tsx`

- [ ] **Task 2.4 — Same changes for `RichTextEditorWebView`**
  - Mirror Tasks 2.1 + 2.3 for the WebView variant.
  - File: `ui/web/components/RichTextEditorWebView.tsx`

### Phase 3: Mobile UI

- [ ] **Task 3.1 — Add "Apply as MD" button to `EditorToolbar`**
  - New props: `hasSelection: boolean`, `onApplyMarkdown: () => void`.
  - Button disabled when `!hasSelection`.
  - Use a suitable lucide-react-native icon.
  - File: `ui/mobile/components/EditorToolbar.tsx`

- [ ] **Task 3.2 — Wire selection state and handler from mobile editor to toolbar**
  - Track selection emptiness in the mobile editor component.
  - Pass `hasSelection` and `onApplyMarkdown` to `EditorToolbar`.

### Phase 4: Tests

- [ ] **Task 4.1 — Unit tests for `SmartPasteService` forced-type path**
  - `resolvePaste` with `forcedType = 'markdown'` + low-score text → markdown output.
  - `forcedType = 'markdown'` → `detectPasteType` is NOT called.
  - `forcedType = 'markdown'` → sanitization still runs (script tags stripped).
  - No `forcedType` → auto-detection unchanged (regression guard).
  - File: `ui/mobile/tests/unit/core-services-smartPaste.test.ts`

- [ ] **Task 4.2 — Integration test for forced markdown**
  - New fixture: `force-markdown.txt` — content that scores below threshold but is valid markdown.
  - With `forcedType = 'markdown'` → correct heading/list rendering.
  - Without `forcedType` → auto-detected as plain (confirms fixture is genuinely low-score).
  - File: `ui/mobile/tests/integration/smartPaste.integration.test.ts`

- [ ] **Task 4.3 — Manual QA checklist** _(see Testing doc)_

## Dependencies

- Tasks 2.x depend on Task 1.1 (service API must exist first).
- Task 2.3 depends on Task 2.2 (button component must exist).
- Tasks 3.x depend on Tasks 2.x being designed (prop interface defined).
- Tasks 4.1/4.2 can start once Task 1.1 is complete.

## Timeline & Estimates

| Task | Effort |
|------|--------|
| 1.1 Service extension | S (< 1h) |
| 2.1 Handler + selection state | S (1h) |
| 2.2 Web button component | S (45 min) |
| 2.3 Wire into toolbar | XS (15 min) |
| 2.4 WebView mirror | XS (30 min) |
| 3.1/3.2 Mobile toolbar | S (1h) |
| 4.1 Unit tests | S (1h) |
| 4.2 Integration tests | S (1h) |
| Manual QA | S (1h) |
| **Total** | **~7h** |

## Risks & Mitigation

| Risk | Likelihood | Impact | Mitigation |
|------|-----------|--------|-----------|
| `resolvePaste` refactor breaks existing pipeline | Low | High | Write regression unit tests before refactoring; run full test suite after |
| `onSelectionUpdate` fires too frequently causing perf issues | Low | Low | Update only boolean `hasSelection` flag — no heavy computation in handler |
| Mobile toolbar overcrowded | Medium | Low | Icon-only button; consider overflow menu if needed |

## Resources Needed

- Existing codebase: `SmartPasteService`, `RichTextEditor`, `EditorToolbar`
- Lucide icon library (already installed in mobile)
- Test fixtures directory: `ui/mobile/tests/integration/fixtures/`
- Design doc: `docs/ai/design/feature-force-paste-format.md`
