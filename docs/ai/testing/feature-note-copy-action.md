---
phase: testing
title: Testing Strategy - Web Note Copy Action
description: Testing plan for web note copy actions and EverFreeNote self-copy round-trip behavior.
---

# Testing Strategy

## Scope

Covered in this PR:

- web reading-mode copy action
- web editing-mode copy action
- shared rich/plain copy payload generation
- EverFreeNote self-copy smart-paste behavior
- plain-text fallback when rich clipboard writes fail

Out of scope:

- mobile copy behavior
- native mobile clipboard APIs
- mobile WebView copy/paste validation

## Automated Tests

Core tests:

- `core/tests/unit/core-services-noteCopy.test.ts`
- `core/tests/unit/core-services-sanitizer.test.ts`
- `core/tests/unit/core-services-smartPaste.test.ts`
- `core/tests/integration/smartPaste.integration.test.ts`

Web tests:

- `ui/web/tests/unit/lib/noteClipboard.test.ts`
- `ui/web/tests/unit/components/noteEditor.test.tsx`
- `ui/web/tests/unit/components/noteView.test.tsx`

Expected coverage:

- payload contains HTML and plain-text forms
- wrapper extraction accepts EverFreeNote self-copy payloads
- external paste behavior stays on the default sanitizer path
- task-list metadata survives self-copy sanitization
- web clipboard helper writes dual-format clipboard data when supported
- web clipboard helper falls back to `writeText` if rich write fails
- web reading/editing headers expose the correct copy action

## Manual Test Cases

- Reading mode: copy a saved note and paste into another EverFreeNote editor.
- Editing mode: change body text without saving, copy, and paste into another EverFreeNote editor.
- Plain-text target: copy a formatted note and paste into a text-only field.
- Failure path: simulate denied clipboard permission and confirm error feedback appears without breaking the editor.

## Validation Commands

```powershell
npm run type-check
npx jest --config jest.config.cjs --selectProjects unit-web --runTestsByPath ui/web/tests/unit/lib/noteClipboard.test.ts ui/web/tests/unit/components/noteEditor.test.tsx ui/web/tests/unit/components/noteView.test.tsx
npx jest --config jest.config.cjs --runTestsByPath core/tests/unit/core-services-noteCopy.test.ts core/tests/unit/core-services-sanitizer.test.ts core/tests/unit/core-services-smartPaste.test.ts core/tests/integration/smartPaste.integration.test.ts
```

## Residual Risks

- Browser clipboard permissions and runtime support can still vary by browser and context.
- Some third-party paste targets may ignore rich HTML and use only the plain-text fallback.
- Mobile copy is intentionally deferred and should not be considered covered by this PR.
