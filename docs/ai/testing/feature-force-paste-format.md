---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy — Force Paste Format

## Test Coverage Goals

- Unit test coverage: 100% of new/changed code in `SmartPasteService`
- Integration test scope: forced markdown rendering end-to-end
- End-to-end: manual QA checklist across web and mobile
- Regression guard: all existing smart paste tests must remain green

## Unit Tests

### SmartPasteService — forced type override (`core/services/smartPaste.ts`)

> Tests: `ui/mobile/tests/unit/core-services-smartPaste.test.ts`

- [x] **Forced markdown — low-score text:** payload with text scoring below threshold + `forcedType = 'markdown'` → `result.type === 'markdown'`, output contains rendered tags (`<ul>`, `<li>`).
- [x] **Detection skipped:** when `forcedType` is provided, `detectPasteType` is NOT called (spy/mock).
- [x] **Sanitization still runs:** forced markdown output has script tags stripped, unsafe URLs removed.
- [x] **Empty text:** `forcedType = 'markdown'`, `payload.text = ''` → no error thrown.
- [x] **No forced type — auto-detection unchanged:** `resolvePaste(payload)` without `forcedType` produces same result as before.
- [x] **Detection metadata:** `result.detection.confidence === 1.0`, `reasons` contains `'forced-by-user'`.

### `EditorToolbar` — MD button (`ui/mobile/components/EditorToolbar.tsx`)

> Tests: `ui/mobile/tests/component/editorToolbar.test.tsx`

- [x] **Renders MD button:** button with `accessibilityLabel="Apply as Markdown"` is present.
- [x] **Disabled by default:** no `hasSelection` prop → `accessibilityState.disabled === true`.
- [x] **Disabled when hasSelection=false:** `accessibilityState.disabled === true`.
- [x] **Enabled when hasSelection=true:** `accessibilityState.disabled === false`.
- [x] **Callback fires when enabled:** pressing with `hasSelection=true` calls `onCommand('applySelectionAsMarkdown')`.
- [x] **No callback when disabled:** pressing with `hasSelection=false` does NOT call `onCommand`.
- [x] **Label text:** button shows "MD" text.

### `EditorWebView` — SELECTION_CHANGE bridge (`ui/mobile/components/EditorWebView.tsx`)

> Tests: `ui/mobile/tests/component/editorWebViewMessages.test.tsx`

- [x] **Payload true:** `SELECTION_CHANGE` message with `true` → calls `onSelectionChange(true)`.
- [x] **Payload false:** `SELECTION_CHANGE` message with `false` → calls `onSelectionChange(false)`.
- [x] **No callback prop:** `SELECTION_CHANGE` without `onSelectionChange` → no crash.

### `applySelectionAsMarkdown` utility (`ui/web/lib/editor.ts`)

> No web jest config — covered by manual QA and indirectly via SmartPasteService tests.

## Integration Tests

> Tests: `ui/mobile/tests/integration/smartPaste.integration.test.ts`

- [x] **Forced markdown — low-score fixture:** `force-markdown.txt` with `forcedType = 'markdown'` → result HTML contains `<ul>`, `<li>`, `'Buy milk'`.
- [x] **Same fixture without forced type:** auto-detects as `'plain'` (confirms fixture is genuinely below threshold).
- [x] **Existing fixtures unaffected:** all 4 existing integration fixtures produce same output as before (regression).

## End-to-End Tests
**What user flows need validation?**

- [ ] **Web flow:** select plain markdown text in editor → click "Apply as Markdown" → selection replaced with rendered markdown (heading/list visible).
- [ ] **Button disabled with no selection:** click elsewhere to deselect → button becomes disabled.
- [ ] **Mobile flow:** same action via mobile toolbar button.
- [ ] **Undo:** `Ctrl+Z` after applying → selection content restored to plain text.
- [ ] **Regression — normal paste:** pasting content without using the button still uses auto-detection.

## Test Data

### New fixture: `force-markdown.txt`

Content that scores below auto-detection threshold (< 3 pts) but is valid markdown:

```markdown
Project notes

- Buy milk
- Call dentist
- Review PR
```

Scores ~2 pts (bullet list only) → auto-detects as plain, but renders correctly when forced.

### Existing fixtures (unchanged):
- `ui/mobile/tests/integration/fixtures/ai-chat-markdown.md`
- `ui/mobile/tests/integration/fixtures/google-docs.html`
- `ui/mobile/tests/integration/fixtures/web-article.html`
- `ui/mobile/tests/integration/fixtures/plain.txt`

## Test Reporting & Coverage

- Run: `npm run test -- --coverage`
- New paths to verify at 100%:
  - `SmartPasteService.resolvePaste()` forced-type branch
  - `SmartPasteService._resolve()` private helper
- Coverage gaps allowed: visual/accessibility attributes (covered by manual QA)

## Manual Testing

### Web editor checklist
- [ ] "Apply as Markdown" button visible in toolbar
- [ ] Button is greyed out / disabled when no text is selected
- [ ] Select low-score markdown text → click button → correct rendering (headings, lists, code blocks)
- [ ] Button has no persistent state — clicking again on a new selection works identically
- [ ] `aria-label="Apply as Markdown"` announced by screen reader; `disabled` properly communicated
- [ ] No visual regression in existing toolbar buttons

### Mobile toolbar checklist
- [ ] Button appears in scrollable toolbar
- [ ] Disabled appearance when no selection
- [ ] Tap with selection → markdown rendered correctly
- [ ] Undo works via mobile undo gesture

### Edge cases
- [ ] Empty selection → button disabled, no action on click
- [ ] Selection with no markdown syntax → result looks same as before (plain paragraph), no crash
- [ ] Undo after action → plain text restored correctly

## Bug Tracking

- File bugs under label `paste` / `force-format`.
- Regression test required for any bug fix before closing the issue.
