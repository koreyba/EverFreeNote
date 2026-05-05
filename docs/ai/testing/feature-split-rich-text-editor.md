---
phase: testing
title: Testing - Split RichTextEditor
description: Test plan for the structural refactor
---

# Testing Strategy

## Test Coverage Goals

- All existing Cypress tests must pass without behavior changes.
- No new tests are needed for `editorExtensions.ts`.
- No new tests are needed for `EditorMenuBar.tsx`; the split `RichTextEditor.*.cy.tsx` specs cover toolbar and history behavior.

## Existing Tests (must not regress)

- [x] `cypress/component/editor/RichTextEditor.rendering.cy.tsx` - render and caret placement coverage
- [x] `cypress/component/editor/RichTextEditor.formatting.cy.tsx` - toolbar button interactions
- [x] `cypress/component/editor/RichTextEditor.advanced.cy.tsx` - color, embeds, edge cases, clear formatting
- [x] `cypress/component/editor/RichTextEditor.history.cy.tsx` - undo/redo toolbar behavior
- [x] `cypress/component/editor/RichTextEditorPaste.cy.tsx` - paste behavior
- [x] `cypress/component/editor/RichTextEditorApplyMarkdown.cy.tsx` - markdown apply
- [x] `cypress/component/RichTextEditorWebView.cy.tsx` - WebView editor

## Test Reporting & Coverage

- Run:
  - `npx cypress run --component --spec "cypress/component/editor/RichTextEditor.rendering.cy.tsx"`
  - `npx cypress run --component --spec "cypress/component/editor/RichTextEditor.formatting.cy.tsx"`
  - `npx cypress run --component --spec "cypress/component/editor/RichTextEditor.advanced.cy.tsx"`
  - `npx cypress run --component --spec "cypress/component/editor/RichTextEditor.history.cy.tsx"`
- All tests must pass.

## Status

- [ ] Existing tests verified passing after refactor
- [ ] TypeScript compiles clean
