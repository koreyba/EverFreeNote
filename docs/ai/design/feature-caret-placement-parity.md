---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

- High-level idea: replace “background click → focus(end)” with “background click → compute nearest ProseMirror position by coordinates” on both platforms.
- We implement a small shared core utility that operates on ProseMirror `EditorView`.

```mermaid
graph TD
  UserClick[User click/tap] --> HandlerWeb[Web: RichTextEditor handler]
  UserClick --> HandlerMobile[Mobile: WebView editor handler]
  HandlerWeb --> PM[ProseMirror EditorView]
  HandlerMobile --> PM
  PM --> Utility[Core util: placeCaretFromCoords]
  Utility --> Selection[Selection.near / setTextSelection]
```

- Key components and their responsibilities
  - Web `RichTextEditor`: intercepts background clicks and delegates to utility.
  - Mobile WebView editor: intercepts taps/clicks and delegates to the same utility (or via a bridge wrapper).
  - Core utility: turns (x, y) into the “best” caret position using ProseMirror APIs.

## Data Models
**What data do we need to manage?**

- No persistent data model changes.
- Runtime inputs
  - Pointer/touch coordinates (clientX/clientY or computed from touch).
  - EditorView instance.

## API Design
**How do components communicate?**

- Web
  - Direct call: handler has access to TipTap editor → `editor.view`.
- Mobile
  - Option A (preferred): run the logic inside WebView context where ProseMirror lives.
  - Option B: RN side sends a message with coordinates, WebView applies selection.

## Component Breakdown
**What are the major building blocks?**

- Frontend components (if applicable)
  - `ui/web/components/RichTextEditor.tsx` (adjust click handler)
- Backend services/modules
  - None
- Shared/core
  - New helper (proposed): `core/utils/prosemirrorCaret.ts` (name TBD)

## Design Decisions
**Why did we choose this approach?**

- Use ProseMirror-native APIs (`posAtCoords`, `Selection.near`) to get “expected editor” behavior.
- Avoid DOM heuristics (“if target is ProseMirror root → end”) which misclassify internal gaps.
- Make logic shared across platforms to guarantee parity.

Alternatives considered
- “Always focus end on background click” (current) → fails for internal gaps.
- DOM hit-testing (`closest('p')` etc.) → fragile across node types and styling.

## Non-Functional Requirements
**How should the system perform?**

- Performance targets
  - O(1) per click; should not add noticeable latency.
- Reliability
  - Must never throw on click; safe fallbacks to native focus or start/end.
- Security
  - No security impact.
