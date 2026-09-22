---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Mobile editor layout

## Problem Statement
On phones, the end of a long edited note is covered by bottom navigation. Scrolling tags can paint above the note action header. Navigation always consumes space, and the wrapping formatting toolbar takes too much vertical space.

## Goals & Objectives
Deliver all four requested changes together in the shared web UI used by browsers and the Capacitor Android shell. Keep desktop formatting and persistence behavior compatible. No backend, schema, native build pipeline, or separate retired React Native changes.

## User Stories & Use Cases
- Edit and reach the final paragraph of a long note with bottom navigation shown or hidden.
- Scroll tags underneath the note actions without covering their buttons.
- Scroll down to hide Notes/Tags/Search/Settings; reverse direction to restore them.
- Format text using a bottom, single-row toolbar with horizontal scrolling and grouped related controls.

## Success Criteria
1. At 320–430px widths, final content can scroll fully above the formatting toolbar and navigation.
2. Header hit-testing selects its controls even when tags scroll beneath it.
3. Vertical scrolling hides/reveals navigation with a small movement threshold; horizontal controls and popup scrolling do not toggle it. Navigation resets on view changes.
4. Mobile formatting is one row of touch controls. Paragraph/H1/H2/H3, inline formatting (bold, italic, underline, strikethrough), list types and alignment use grouped menus; all current commands remain reachable. Selection and undo/redo survive toolbar interaction. Inline formats can be combined independently. Primary groups come before less frequent controls. The mobile font-family trigger uses an Aa icon; the menu identifies the current font, and font size remains a separate numeric control.
5. Compound controls open only on a click or keyboard activation; dragging from a trigger scrolls without opening it. Toolbar menus open into the available space above the toolbar; the editor fits the visible viewport when the software keyboard changes it.
6. Desktop retains the current top toolbar and individual controls.

## Constraints & Assumptions
Start from freshly fetched origin/main (f3d3d1a6972). Branch feature-mobile-editor-layout, sibling worktree as required by AGENTS.md. Use existing React, Tiptap, Radix and Phosphor components. The user's first item is treated as the end of long note content; no dedicated footnote node exists in this editor.

## Questions & Open Items
No blocking product questions. Real Android keyboard/device evidence is distinct from browser viewport simulation.

## Requirements Review
All four user requests have measurable browser checks and corresponding design decisions. User authorized implementing the complete set and the full dev-lifecycle.

## Fullscreen editing follow-up
On mobile, an always-reachable expand icon at the bottom right hides note tabs, title, tags, action header and bottom navigation. Only note text and formatting remain. Collapse restores the same editor without losing draft, selection or undo history; Escape also exits. This mode is available only while editing and fits the visible keyboard viewport.
