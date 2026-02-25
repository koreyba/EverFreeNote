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

- [ ] **Forced markdown — low-score text:** payload with text scoring below threshold + `forcedType = 'markdown'` → `result.type === 'markdown'`, output contains rendered tags (`<h1>`, `<ul>`, etc.).
- [ ] **Detection skipped:** when `forcedType` is provided, `detectPasteType` is NOT called (spy/mock).
- [ ] **Sanitization still runs:** forced markdown output has script tags stripped, unsafe URLs removed.
- [ ] **Empty text:** `forcedType = 'markdown'`, `payload.text = ''` → `result.html` is empty string, no error.
- [ ] **No forced type — auto-detection unchanged:** `resolvePaste(payload)` without `forcedType` produces same result as before (regression guard for all existing test cases).

### `ApplyMarkdownButton` (`ui/web/components/ApplyMarkdownButton.tsx`)

- [ ] **Disabled state:** `disabled=true` → button has `disabled` attribute, not clickable.
- [ ] **Enabled state:** `disabled=false` → button is interactive.
- [ ] **onClick fires:** simulating click calls `onClick` callback once.

### `EditorToolbar` — new button (`ui/mobile/components/EditorToolbar.tsx`)

- [ ] **Renders disabled when no selection:** `hasSelection=false` → button is disabled/dimmed.
- [ ] **Renders enabled when selection exists:** `hasSelection=true` → button is active.
- [ ] **Callback fires:** pressing button calls `onApplyMarkdown`.

## Integration Tests

- [ ] **Forced markdown — low-score fixture:** `force-markdown.txt` content with `forcedType = 'markdown'` → result HTML contains `<h1>`, `<ul>` etc.
- [ ] **Same fixture without forced type:** auto-detects as `'plain'` (confirms fixture is genuinely below threshold).
- [ ] **Existing fixtures unaffected:** all 4 existing integration fixtures produce same output as before (regression).

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
