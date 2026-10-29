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
  - `npx cypress run --component --browser electron --spec "cypress/component/editor/RichTextEditor.rendering.cy.tsx"`
  - `npx cypress run --component --browser electron --spec "cypress/component/editor/RichTextEditor.formatting.cy.tsx"`
  - `npx cypress run --component --browser electron --spec "cypress/component/editor/RichTextEditor.advanced.cy.tsx"`
  - `npx cypress run --component --browser electron --spec "cypress/component/editor/RichTextEditor.history.cy.tsx"`
  - `npx cypress run --component --browser electron --spec "cypress/component/editor/RichTextEditorPaste.cy.tsx"`
  - `npx cypress run --component --browser electron --spec "cypress/component/editor/RichTextEditorApplyMarkdown.cy.tsx"`
  - `npx cypress run --component --browser electron --spec "cypress/component/RichTextEditorWebView.cy.tsx"`
- All tests must pass.

## Status

- [ ] Existing tests verified passing after refactor
- [ ] TypeScript compiles clean

## Image insertion follow-up

- Cover file selection, repeat selection, unsupported/corrupt/oversized files, URL insertion, and workspace persistence failure.
- Manually checked a 2.7 MB PNG in mobile-sized Chrome against the local Docker app: it saved and remained visible after reload and reopening the note. The large tab could not be restored automatically; the workspace warning is shown. Physical Android/iOS pickers remain to be checked.
