---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- On both Web and Mobile (WebView editor), background/empty-area clicks can place the caret in an unexpected location (currently sometimes jumps to the end of the note).
- This is most noticeable when there is vertical spacing inside the document (e.g., margin/padding after headings). Users can click into a “gap” in the middle of the note and get teleported to the end.
- Impact: breaks expected text editing flow; users lose context and must manually re-position the caret.

Clarification:
- The problematic case is not “click below the last paragraph” (where moving to end is expected), but “click into an internal empty vertical gap between blocks inside the note” (e.g. after a heading), where jumping to the document end is not expected.

## Goals & Objectives
**What do we want to achieve?**

- Primary goals
  - Make caret placement on clicks feel like a typical note app (Evernote-style): clicking near content places caret near the click, not at the end of the document.
  - Ensure consistent behavior on Web and Mobile editor.
- Secondary goals
  - Avoid regressions to normal ProseMirror behavior: clicking directly on text should behave natively.
  - Keep the implementation minimal and maintainable (shared utility where appropriate).
- Non-goals (what's explicitly out of scope)
  - Changing autosave semantics or note persistence.
  - Introducing new UI/UX features (menus, extra controls, formatting behavior changes).
  - Reworking editor schema/content model.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user, I want clicking on text to place the caret exactly where I clicked, so that I can edit precisely.
- As a user, I want clicking in the horizontal empty space to the right of a line to place the caret at the end of that line/block, so that I can continue typing naturally.
- As a user, I want clicking in a vertical gap between blocks (e.g., after a heading) to place the caret near that gap (end of the previous block or start of the next), so that I can insert text there.
- As a user, I want clicking below the last content (true empty bottom area) to place the caret at the end of the document, so that I can append.

UX rules (single click/tap in edit mode):
- Click on text/content node → native caret placement (exactly where clicked).
- Click in horizontal “blank” to the right of a line (same visual row as text) → caret at end of the nearest line/block (not document end).
- Click in an internal vertical gap between blocks (e.g., heading margin) → caret moves to the nearest valid insertion position around that gap (end of previous block OR start of next block), but NOT to end of document.
- Click below the last block (real empty tail of the note) → caret at end of document.
- Click above the first block → caret at start of document.

- Edge cases to consider
  - Click above the first content → caret at start of document.
  - Notes containing only a heading or only an empty paragraph.
  - Clicks around non-text nodes (images, tasks, lists).
  - Double click selection, drag selection, long-press selection on mobile: must remain native (we only target single click/tap behavior).

## Success Criteria
**How will we know when we're done?**

- Acceptance criteria
  - Clicking inside text never triggers a “jump to end”.
  - Clicking in gaps within the document places caret near the click (closest valid insertion position), not at document end.
  - Clicking below content still places caret at document end.
  - Behavior matches across Web and Mobile editor (same algorithmic rule set; minor platform coordinate differences acceptable).
- Measurable outcomes
  - Add regression tests that fail on the current buggy behavior and pass with the fix (Web + Mobile/WebView).
  - No new TypeScript or ESLint errors.

Testability notes:
- For internal vertical gaps: we consider the fix correct if typing immediately after the click inserts text near that gap (between the two surrounding blocks), and not appended at the end of the document.
- For below-content clicks: typing should append at the end.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints
  - Web editor is TipTap/ProseMirror.
  - Mobile editor uses a WebView-based editor bridge (also ProseMirror-derived).
  - We must not break existing click/caret behavior inside content.
- Assumptions we're making
  - ProseMirror `EditorView.posAtCoords()` is available in both environments.
  - For “true empty area” (outside content), we can fall back to start/end based on click position.
  - The editor DOM bounds can be used to distinguish “below content” vs “internal gap” reliably enough for UX parity.

## Questions & Open Items
**What do we still need to clarify?**

- Mobile: do we have a direct handle to ProseMirror `EditorView` in the WebView layer to apply the same caret-placement logic, or do we need to add a bridge message?
- Should we treat “horizontal empty space to the right of a line” as end-of-block (simple/typical), or preserve an x-column (more complex; likely non-goal for now)?
- Confirm scope: apply only in edit mode (recommended). Read mode should keep its own selection behavior.
