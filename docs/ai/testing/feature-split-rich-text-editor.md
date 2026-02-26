---
phase: testing
title: Testing — Split RichTextEditor
description: Test plan for the structural refactor
---

# Testing Strategy

## Test Coverage Goals

- All existing Cypress tests must pass without modification (pure structural refactor)
- No new tests needed for `editorExtensions.ts` (no logic, just config)
- No new tests needed for `EditorMenuBar.tsx` (existing toolbar tests in `RichTextEditor.cy.tsx` cover it)

## Existing Tests (must not regress)

- [x] `cypress/component/editor/RichTextEditor.cy.tsx` — covers toolbar button interactions
- [x] `cypress/component/editor/RichTextEditorPaste.cy.tsx` — covers paste behavior
- [x] `cypress/component/editor/RichTextEditorApplyMarkdown.cy.tsx` — covers markdown apply
- [x] `cypress/component/RichTextEditorWebView.cy.tsx` — covers WebView editor

## Test Reporting & Coverage

- Run: `npx cypress run --component --spec "cypress/component/editor/RichTextEditor.cy.tsx"`
- All tests must pass

## Status

- [ ] Existing tests verified passing after refactor
- [ ] TypeScript compiles clean
