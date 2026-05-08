---
phase: implementation
title: Implementation Guide - Note Copy Action
description: Implementation notes for note-level copy actions with EverFreeNote self-copy round-trip preservation.
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Branch-only feature start: `feature-note-copy-action`
- Dependencies were bootstrapped in:
  - repo root: `npm ci`
  - mobile app: `ui/mobile -> npm ci`
- No new environment variables are expected for the first implementation pass.

## Code Structure
**How is the code organized?**

- Shared clipboard payload logic should live in a core service, for example:
  - `core/services/noteCopy.ts`
- Web UI wiring should stay inside existing note presentation components:
  - `ui/web/components/features/notes/NoteView.tsx`
  - `ui/web/components/features/notes/NoteEditor.tsx`
- Mobile UI wiring stays in:
  - `ui/mobile/app/note/[id].tsx`
  - `ui/mobile/components/EditorWebView.tsx`
  - `app/editor-webview/page.tsx`
- Smart-paste round-trip preservation extends:
  - `core/services/smartPaste.ts`
  - possibly `core/services/sanitizer.ts`

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Build a single note-body copy payload from HTML:
  - rich HTML with EverFreeNote self-copy marker
  - plain-text fallback derived from the same body
- Web reading mode should use current note HTML.
- Web editing mode should use current editor draft HTML, not initial props.
- Mobile editing mode should read current HTML from `EditorWebViewHandle.getContent()`.
- Mobile clipboard write should be attempted from the editor page/browser context through a new bridge message.

### Patterns & Best Practices
- Keep copy payload building deterministic and pure.
- Do not mix copy logic into `SmartPasteService`; detection/paste resolution and copy construction should stay separate concerns.
- Preserve the existing architecture rule:
  - note shell / screen owns orchestration
  - editor component owns editor state
  - core services own serialization/transformation logic

## Integration Points
**How do pieces connect?**

- Web clipboard:
  - prefer `navigator.clipboard.write()` with `text/html` + `text/plain`
  - fallback to `writeText()` if richer write path is unavailable
- Mobile bridge:
  - add a command message for copy payload delivery
  - add a result message back to native for success/error feedback
- Paste:
  - self-copy detection should happen before the generic style filtering path strips supported editor formatting

## Error Handling
**How do we handle failures?**

- Clipboard write failures must not crash note screens or the editor.
- Web should show a clear error toast when clipboard write fails.
- Mobile should show a clear toast/message when the WebView copy command fails or is unsupported.
- Smart-paste self-copy detection failures should fall back to the existing generic paste behavior rather than block paste entirely.

## Performance Considerations
**How do we keep it fast?**

- Reuse existing chunked bridge helpers for large mobile payloads instead of inventing another transport.
- Avoid repeated editor `getHTML()` calls inside one action path; resolve once per button press.
- Keep payload construction synchronous and linear in note size.

## Security Notes
**What security measures are in place?**

- Continue treating clipboard HTML as untrusted on paste.
- Restrict expanded preservation rules to EverFreeNote-marked self-copy payloads only.
- Keep unsafe protocol filtering and dangerous attribute stripping in place even for self-copy.
