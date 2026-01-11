---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Use existing tooling:
  - `npm run validate`
  - `npx cypress run --component --spec ...`
- Mobile/WebView: use the existing editor-webview build/run setup.

## Code Structure
**How is the code organized?**

- Web editor component: `ui/web/components/RichTextEditor.tsx`
- Proposed shared helper: `core/utils/...` (exact filename TBD)
- Mobile WebView editor logic: under `editor-webview/` or the existing bridge layer (exact file to confirm)

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Feature 1: ProseMirror-native caret placement
  - Use `view.posAtCoords({ left: x, top: y })`.
  - If a position exists, set selection via `Selection.near(view.state.doc.resolve(pos))` and dispatch.
  - If position is null (true outside), fall back to `start/end` based on click location vs editor bounds.
- Feature 2: Web integration
  - Handle only background clicks (not clicks on actual content nodes).
  - Prevent default only when we take over selection.
- Feature 3: Mobile integration
  - Prefer running logic inside WebView where ProseMirror lives.
  - If needed, add a bridge message that passes coordinates.

### Patterns & Best Practices
- Keep the utility pure and defensive (never throw, always safe return value).
- Avoid DOM heuristics tied to CSS/layout.

## Integration Points
**How do pieces connect?**

- Web: TipTap editor → `editor.view` → shared helper.
- Mobile: WebView ProseMirror view → shared helper.

## Error Handling
**How do we handle failures?**

- If we cannot compute coordinates → do nothing and let ProseMirror default behavior run.
- If we take over selection, ensure we call `event.preventDefault()` to avoid double-handling.

## Performance Considerations
**How do we keep it fast?**

- Only run on pointer down/click.
- Single `posAtCoords` call and single dispatch.

## Security Notes
**What security measures are in place?**

- No new security surface area.
