---
phase: planning
title: Project Planning & Task Breakdown - Note Copy Action
description: Plan implementation of web/mobile note copy actions with EverFreeNote self-copy round-trip support.
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Feature docs created and implementation path confirmed
- [x] Milestone 2: Shared copy pipeline and smart-paste self-copy support implemented
- [ ] Milestone 3: Web and mobile UI actions wired, tested, and manually smoke-verified

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Create shared `noteCopy` service to build rich/plain clipboard payloads from note body HTML
- [x] Task 1.2: Extend smart paste to detect EverFreeNote self-copy markers before sanitization
- [x] Task 1.3: Define self-copy sanitizer/style allowlist rules without weakening generic external-source behavior

### Phase 2: Core Features
- [x] Task 2.1: Add web reading-mode `Copy` action in `NoteView.tsx`
- [x] Task 2.2: Add web editing-mode `Copy` action in `NoteEditor.tsx`
- [x] Task 2.3: Add mobile header copy action in `ui/mobile/app/note/[id].tsx`
- [x] Task 2.4: Use the mobile editor WebView as the source of unsaved draft HTML during copy
- [x] Task 2.5: Implement native clipboard write logic with HTML-first and plain-text fallback on mobile

### Phase 3: Integration & Polish
- [x] Task 3.1: Add success/error feedback on web and mobile
- [x] Task 3.2: Add/extend unit and integration tests for smart paste, web actions, and mobile bridge
- [x] Task 3.3: Run validation commands for core, web, and mobile affected areas
- [x] Task 3.4: Update planning/testing docs with actual implementation details and residual gaps

## Dependencies
**What needs to happen in what order?**

- `noteCopy` payload design must be settled before UI wiring so web and mobile share one contract.
- Smart-paste self-copy detection must land before manual round-trip verification has value.
- Mobile rich clipboard path depends on Expo clipboard format support and the editor WebView supplying the latest unsaved HTML.
- Test updates depend on final payload shape and message names.

External dependencies:

- Browser clipboard support for dual-format copy on web.
- Expo clipboard HTML support on mobile, with plain-text fallback if HTML write is unavailable.

## Timeline & Estimates
**When will things be done?**

- Phase 1: small-to-medium effort
- Phase 2: medium effort
- Phase 3: medium effort with testing-heavy tail

Suggested implementation order:

1. Shared copy payload service
2. Smart paste self-copy branch
3. Web UI actions
4. Mobile bridge + UI action
5. Feedback + tests + manual verification

## Risks & Mitigation
**What could go wrong?**

- Risk: mobile WebView rich clipboard write is unreliable on some devices
  - Mitigation: keep plain-text fallback and explicit user feedback; verify on target devices early
- Risk: self-copy allowances accidentally weaken external paste sanitization
  - Mitigation: branch logic explicitly on EverFreeNote marker; add regression tests for external sources
- Risk: task-list or editor-specific markup is still partially stripped
  - Mitigation: add fixture-driven tests for editor-emitted HTML and refine allowed tags/attrs incrementally
- Risk: long mobile note bodies exceed message size
  - Mitigation: reuse existing chunked bridge helpers for copy payload transport

## Resources Needed
**What do we need to succeed?**

- Existing editor architecture docs:
  - `feature-smart-paste`
  - `feature-offline-webview-remote-first`
  - `feature-editor-undo-redo`
- Shared helpers already present:
  - `SmartPasteService`
  - `SanitizationService`
  - `editorWebViewBridge`
- Manual QA on:
  - web note read/edit flows
  - mobile note screen with remote and local WebView source paths
