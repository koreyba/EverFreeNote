---
phase: implementation
title: Implementation Notes - Web Note Copy Action
description: Implementation notes for the web-only note copy action and self-copy smart-paste support.
---

# Implementation Notes

## Scope

This PR keeps the note copy feature web-only. Mobile UI, mobile dependencies, and mobile tests are intentionally excluded.

Implemented areas:

- `core/services/noteCopy.ts`
- `core/services/smartPaste.ts`
- `core/services/sanitizer.ts`
- `ui/web/lib/noteClipboard.ts`
- `ui/web/components/features/notes/NoteView.tsx`
- `ui/web/components/features/notes/NoteEditor.tsx`
- Core and web tests for copy payloads, smart paste, and web actions

## Copy Pipeline

`NoteCopyService.buildPayload(html)` returns:

- `html`: a wrapped EverFreeNote self-copy payload
- `text`: a plain-text fallback

The wrapper marker is:

```html
data-everfreenote-copy="note-body"
```

Smart paste checks for this marker before running the generic sanitizer. If present, it extracts the wrapped content and sanitizes it with the self-copy profile.

## Web Clipboard

`copyNotePayloadToClipboard` attempts the best browser-supported path:

1. Use `navigator.clipboard.write` with `ClipboardItem` containing `text/html` and `text/plain`.
2. If rich write is unavailable or throws at runtime, fall back to `navigator.clipboard.writeText(payload.text)`.
3. Let the caller show failure feedback if the fallback also fails.

## Web UI

- Reading mode adds `Copy` between `Edit` and `Delete`.
- Editing mode adds `Copy` between `Read` and `Save`.
- Both headers use the same visual button treatment.
- Editing mode copies the current draft body HTML from editor state, not only the last persisted note description.

## Validation

Primary validation commands:

```powershell
npm run type-check
npx jest --config jest.config.cjs --selectProjects unit-web --runTestsByPath ui/web/tests/unit/lib/noteClipboard.test.ts ui/web/tests/unit/components/noteEditor.test.tsx ui/web/tests/unit/components/noteView.test.tsx
npx jest --config jest.config.cjs --runTestsByPath core/tests/unit/core-services-noteCopy.test.ts core/tests/unit/core-services-sanitizer.test.ts core/tests/unit/core-services-smartPaste.test.ts core/tests/integration/smartPaste.integration.test.ts
```

Manual validation should focus on:

- reading-mode copy and paste back into EverFreeNote
- editing-mode unsaved draft copy
- plain-text paste into a text-only target
- rich clipboard fallback behavior where browser support can be simulated

## Deferred Mobile Work

Mobile copy was removed from this PR. Reintroducing it should happen in a dedicated mobile PR after confirming native clipboard behavior, WebView content retrieval, and device-level copy/paste expectations.
