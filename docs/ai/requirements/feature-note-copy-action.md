---
phase: requirements
title: Requirements & Problem Understanding - Note Copy Action
description: Add note copy actions for web and mobile while preserving formatting fidelity for EverFreeNote round-trip paste.
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- EverFreeNote currently has no dedicated note copy action in the note header on web or mobile.
- Users who want to duplicate or move note content must manually select note body content, which is slower and inconsistent across reading/editing modes and across platforms.
- The most important missing behavior is round-trip fidelity: content copied from EverFreeNote should paste back into EverFreeNote with the same structure and formatting as closely as possible.
- The current smart paste pipeline is optimized for external sources and intentionally strips some formatting that EverFreeNote itself supports, so a generic clipboard flow is not enough for internal copy/paste fidelity.

## Goals & Objectives
**What do we want to achieve?**

- Add a visible note copy action on web note headers:
  - Reading mode: `Edit | Copy | Delete | More`
  - Editing mode: `Read | Copy | Save | More`
- Add a visible note copy action on the mobile note screen as an icon-only action in the right header group before the theme toggle.
- Copy the current note body content, not the note title or tags, so pasted content targets the editor body cleanly.
- In editing mode, copy the current unsaved draft body rather than the last persisted note body.
- Preserve EverFreeNote-supported formatting when content is pasted back into EverFreeNote, including editor-specific structures that the generic paste flow would otherwise downgrade or strip.
- Keep safe clipboard behavior for non-EverFreeNote paste targets by also supplying a plain-text representation.

Non-goals:

- Full pixel-perfect fidelity in every third-party destination app.
- Redesigning note action placement beyond the approved copy button additions.
- Changing note persistence format or database schema.
- Adding title/tag copy variants in this first iteration.
- Expanding generic external smart-paste behavior for all sources beyond what is needed for EverFreeNote self-copy.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a web user in reading mode, I want a `Copy` button next to my main note actions so that I can quickly copy note content without entering selection mode.
- As a web user in editing mode, I want `Copy` to use my current unsaved draft so that I can duplicate or move in-progress content without saving first.
- As a mobile user, I want a compact copy icon in the note header so that I can quickly copy note content without using selection handles.
- As an EverFreeNote user, I want copied content to paste back into EverFreeNote with the same supported formatting so that duplication and cross-note reuse feel native.
- As a user pasting copied note content into other apps, I want the copy action to remain usable even if the destination only accepts plain text.

Key workflows and scenarios:

- Web reading mode copy of a persisted note body.
- Web editing mode copy of a dirty draft body.
- Mobile reading/editing screen copy using the active note body from the WebView-backed editor.
- Paste copied content back into a different EverFreeNote note and retain supported formatting.
- Paste copied content into a plain-text destination and receive a readable fallback.

Edge cases to consider:

- Copying a note whose editor contains task lists, headings, alignment, font family, font size, links, images, or highlight formatting.
- Copying while the mobile WebView is loaded from local fallback bundle instead of remote.
- Copying long note bodies that exceed single-message bridge payload size on mobile.
- Clipboard write failures due to platform/browser permission or capability limits.

## Success Criteria
**How will we know when we're done?**

- Web reading mode shows a `Copy` button between `Edit` and `Delete`.
- Web editing mode shows a `Copy` button between `Read` and `Save`.
- Mobile note header shows an icon-only `Copy` action in the right-side action group before theme toggle and `More`.
- Triggering copy in editing mode uses the current editor draft body, including unsaved changes.
- Triggering copy in reading mode uses the currently displayed note body.
- Copy writes both HTML-rich content and plain-text fallback where platform capabilities allow.
- Pasting copied content back into EverFreeNote preserves supported structural/editor formatting better than the generic external paste path.
- Existing external smart paste behavior remains unchanged for non-EverFreeNote sources.
- Failures surface a clear success/error feedback message without crashing the editor or blocking further edits.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints:
  - Mobile editor content is hosted in a WebView and communicates with React Native through the existing message bridge.
  - Current smart paste sanitization intentionally strips many inline styles and editor-specific attributes.
  - Mobile clipboard capabilities differ from web browser clipboard capabilities and may not support the same rich formats directly from React Native.
  - Long mobile payloads may need chunked bridge transport.
- Business/product constraints:
  - UI placement should follow the approved action order without broad redesign.
  - The first version should favor reliable note-body copy over configurable copy variants.
- Workflow constraints:
  - This feature start is intentionally branch-only (`feature-note-copy-action`) with no worktree, reducing workspace isolation compared with the default skill flow.
- Assumptions:
  - Users expect the note-level copy action to copy body content, not title/tags.
  - The accepted definition of “same format” is fidelity for EverFreeNote-supported formatting, not byte-identical clipboard serialization.

## Questions & Open Items
**What do we still need to clarify?**

- Mobile rich clipboard write path must be validated during implementation:
  - preferred path is rich HTML write from the WebView/editor page;
  - fallback behavior may need to degrade to plain text if platform APIs reject rich clipboard writes.
- We need to confirm exactly which editor-owned tags/attributes/styles are required for reliable EverFreeNote self-copy round-trip:
  - task list structure
  - text alignment
  - font family / font size
  - color / highlight semantics
- We need to decide whether copy feedback should be a short-lived inline state, toast, or both per platform.
