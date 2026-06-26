---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Prerequisites: mobile dev build (`npm --prefix ui/mobile run android:dev`),
  web dev server (`npm run dev`), and the shared editor bundle.
- The editor that runs inside the mobile WebView is the **web** bundle
  (`ui/web/components/RichTextEditorWebView.tsx`); changes there affect both
  platforms.

## Code Structure
**How is the code organized?**

- `core/services/noteCopy.ts` — payload builder + self-copy marker (shared).
- `core/services/smartPaste.ts` — external paste transformation (shared, not
  modified here).
- `ui/web/components/RichTextEditorWebView.tsx` — Option A copy/paste DOM
  handlers (`handleDOMEvents.copy`, `handlePaste`).
- `ui/mobile/app/note/[id].tsx` — native header Copy button.
- `ui/mobile/components/EditorWebView.tsx` — native↔WebView bridge.
- Fallback files (to be commented, not deleted):
  `ui/mobile/utils/writeNoteCopyPayloadToClipboard.ts`,
  `ui/mobile/utils/noteClipboardCache.ts`.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- **Copy (Option A):** build `NoteCopyService.buildPayload(html)` and write both
  `text/html` (marker-wrapped) and `text/plain` via `clipboardData.setData`
  inside the WebView. On mobile the native header button triggers this via a
  `COPY_NOTE` bridge message rather than writing natively.
- **Paste (Option A):** read `event.clipboardData` directly; detect the marker
  with `NoteCopyService.isSelfCopyHtml` → restore 1:1; otherwise hand to
  `SmartPasteService`.
- **Fallback removal:** comment out the native write, the in-memory cache, and
  the `CLIPBOARD_PASTE_REQUEST` native read so the WebView path is the only path.

### Patterns & Best Practices
- Single source of truth for the clipboard format: `NoteCopyService.buildPayload`
  (used by web and mobile alike → parity).
- Marker-in-HTML standard: `data-everfreenote-copy="note-body"`; benign to
  external consumers; detected before strict sanitization.
- Keep removed code as comments with a short note pointing to this doc so it can
  be restored quickly if Option A verification fails.

## Integration Points
**How do pieces connect?**

- Native → WebView: `COPY_NOTE`. WebView → Native: `NOTE_COPIED` (toast).
- WebView ↔ system clipboard: DOM `copy`/`paste` events.
- smart-paste: invoked from `handlePaste` for non-self content; must keep marker
  detection ordering.

## Error Handling
**How do we handle failures?**

- Plain-text fallback in the payload guarantees readable text even when rich is
  unavailable.
- Instrument the two Option A branches (copy/paste with vs without
  `clipboardData`) so any silent fallback is observable.
- If `clipboardData` is missing on paste, or `setData` is blocked on copy
  (user-activation), do **not** silently revert to a fuzzy cache — surface it and
  follow the Design "robust fallback" path.

## Performance Considerations
**How do we keep it fast?**

- Copy/paste are synchronous in the editor; no extra native round-trips on the
  happy path under Option A.
- Removing the cache and native bridge removes per-paste native IPC and timer
  state.

## Security Notes
**What security measures are in place?**

- Copy output sanitized with the `editor-self-copy` profile.
- External paste keeps strict sanitization through smart-paste.
- The marker is a `data-*` attribute only; no executable content is added to the
  clipboard.
