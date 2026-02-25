---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding — Force Paste Format

## Problem Statement
**What problem are we solving?**

- The existing `SmartPasteService` auto-detects clipboard content as `html`, `markdown`, or `plain` using a scoring heuristic. When the score for markdown falls below the threshold (default: 3), the content is silently downgraded to plain text.
- Users who copy markdown from terminals, AI chat outputs, GitHub previews, or documentation sites may receive garbled plain text in the editor — losing all formatting.
- There is currently no way to fix an incorrect detection after the fact. The user must manually reformat the content — which is tedious and error-prone.

**Who is affected?**
- Developers and technical users who frequently paste from AI assistants, terminals, GitHub, and documentation sites.
- Power users who know the source format and want a quick way to correct a failed auto-detection.

**Current workaround:** Manually re-apply heading/bold/list formatting after an incorrect plain-text paste.

## Goals & Objectives
**What do we want to achieve?**

**Primary goals:**
- Allow the user to select already-pasted text and explicitly re-render it as markdown via a toolbar button.
- The action is one-shot: select → click → formatted. No persistent state or mode involved.

**Secondary goals:**
- The solution should be extensible to other formats (`html`, `plain`) in the future.

**Non-goals (Phase 1):**
- Forcing `html` or `plain` paste formats.
- Persisting any format preference across sessions.
- Changing the underlying markdown parsing or sanitization pipeline.
- Handling edge cases where the user selects already-formatted TipTap content — the user is responsible for what they select.

## User Stories & Use Cases
**How will users interact with the solution?**

1. **As a developer,** I want to select plain text that contains markdown syntax and click "Apply as Markdown", so that headings, code blocks, and lists are rendered correctly after a failed auto-detection.
2. **As a mobile user,** I want the same button available in the mobile toolbar.

**Key workflow:**
1. User pastes content → auto-detection misses → content appears as plain text with raw markdown syntax.
2. User selects the pasted text → clicks "Apply as Markdown" button in toolbar → selection is replaced with properly rendered markdown.

**Known limitation:**
If the selection contains text that was already formatted by TipTap (not raw markdown characters), `textBetween` will strip that formatting before parsing. The user is responsible for selecting only the relevant plain text. This is not a bug — it is expected behaviour for a corrective tool.

**Edge cases:**
- Selection contains plain text with no markdown syntax → markdown-it parses it as-is (paragraph), result looks the same as before. No crash.
- Selection is empty → button is disabled (no action).
- Undo works the same as any other editor content replacement.

## Success Criteria
**How will we know when we're done?**

- [ ] An "Apply as Markdown" button is present in the web toolbar (`RichTextEditor.tsx`) and mobile toolbar (`EditorToolbar.tsx`).
- [ ] The button is disabled when there is no text selection.
- [ ] Clicking the button with a selection: extracts plain text of the selection, parses as markdown, replaces selection with rendered HTML.
- [ ] Existing auto-detection behaviour on paste is 100% unchanged.
- [ ] Unit tests cover the selection-to-markdown conversion path in `SmartPasteService`.
- [ ] Integration tests verify end-to-end: select plain markdown text → button → correct HTML output.
- [ ] No regression in existing smart paste behaviour.

## Constraints & Assumptions
**What limitations do we need to work within?**

- **Technical constraints:**
  - Must reuse `SmartPasteService.resolvePaste()` with a `forcedType` parameter — minimal interface change to the service.
  - Selection text is extracted via `editor.state.doc.textBetween(from, to, '\n')` — this returns plain text only.
  - The web editor uses TipTap/ProseMirror; the mobile editor uses a WebView variant — both share `SmartPasteService`.
  - No new editor state is introduced — the action is stateless (imperative command, not a mode).
- **Assumptions:**
  - The user selects only the text they want to re-render. No defensive logic is needed for mixed-formatting selections.
  - The existing markdown parsing and sanitization pipeline is correct and does not need changes.

## Questions & Open Items
**What do we still need to clarify?**

- [ ] **Future formats:** Should the button eventually support a dropdown (`Apply as Markdown / Plain`), or remain a dedicated markdown-only action?
- [ ] **Mobile UX:** Icon choice for the mobile toolbar button — `FileText`, `Clipboard`, or a custom MD icon?
