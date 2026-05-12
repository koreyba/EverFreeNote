---
phase: planning
title: Project Planning & Task Breakdown - Web Note Copy Action
description: Plan implementation of web note copy actions with EverFreeNote self-copy round-trip support.
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Feature docs created and implementation path confirmed
- [x] Milestone 2: Shared copy pipeline and smart-paste self-copy support implemented
- [x] Milestone 3: Web UI actions wired, tested, and validated

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Create shared `noteCopy` service to build rich/plain clipboard payloads from note body HTML
- [x] Task 1.2: Extend smart paste to detect EverFreeNote self-copy markers before sanitization
- [x] Task 1.3: Define self-copy sanitizer/style allowlist rules without weakening generic external-source behavior

### Phase 2: Web Core Features
- [x] Task 2.1: Add web reading-mode `Copy` action in `NoteView.tsx`
- [x] Task 2.2: Add web editing-mode `Copy` action in `NoteEditor.tsx`
- [x] Task 2.3: Implement browser clipboard write logic with rich HTML and plain-text fallback
- [x] Task 2.4: Align reading/editing header action button styling

### Phase 3: Integration & Polish
- [x] Task 3.1: Add success/error feedback on web
- [x] Task 3.2: Add/extend unit and integration tests for smart paste and web actions
- [x] Task 3.3: Run validation commands for core and web affected areas
- [x] Task 3.4: Update planning/testing docs with the web-only implementation scope

## Dependencies
**What needs to happen in what order?**

- `noteCopy` payload design must be settled before UI wiring so web actions share one contract.
- Smart-paste self-copy detection must land before manual round-trip verification has value.
- Test updates depend on final payload shape and clipboard fallback behavior.

External dependencies:

- Browser clipboard support for dual-format copy on web.
- Browser `writeText` support for plain-text fallback when rich clipboard writes fail.

## Timeline & Estimates
**When will things be done?**

- Phase 1: small-to-medium effort
- Phase 2: small-to-medium effort
- Phase 3: medium effort with testing-heavy tail

Suggested implementation order:

1. Shared copy payload service
2. Smart paste self-copy branch
3. Web UI actions
4. Feedback + tests + manual verification

## Risks & Mitigation
**What could go wrong?**

- Risk: self-copy allowances accidentally weaken external paste sanitization
  - Mitigation: branch logic explicitly on EverFreeNote marker; add regression tests for external sources
- Risk: task-list or editor-specific markup is still partially stripped
  - Mitigation: add fixture-driven tests for editor-emitted HTML and refine allowed tags/attrs incrementally
- Risk: rich clipboard writes fail in a browser that otherwise supports the Clipboard API
  - Mitigation: catch rich write failures and fall back to `navigator.clipboard.writeText`

## Resources Needed
**What do we need to succeed?**

- Existing editor architecture docs:
  - `feature-smart-paste`
  - `feature-editor-undo-redo`
- Shared helpers already present:
  - `SmartPasteService`
  - `SanitizationService`
- Manual QA on:
  - web note read/edit flows
  - EverFreeNote self-copy round-trip paste
