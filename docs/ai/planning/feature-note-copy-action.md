---
phase: planning
title: Project Planning & Task Breakdown - Note Copy Action
description: Plan implementation of web/mobile note copy actions with EverFreeNote self-copy round-trip support.
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Feature docs created and implementation path confirmed
- [ ] Milestone 2: Shared copy pipeline and smart-paste self-copy support implemented
- [ ] Milestone 3: Web and mobile UI actions wired, tested, and manually verified

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Task 1.1: Create shared `noteCopy` service to build rich/plain clipboard payloads from note body HTML
- [ ] Task 1.2: Extend smart paste to detect EverFreeNote self-copy markers before sanitization
- [ ] Task 1.3: Define self-copy sanitizer/style allowlist rules without weakening generic external-source behavior

### Phase 2: Core Features
- [ ] Task 2.1: Add web reading-mode `Copy` action in `NoteView.tsx`
- [ ] Task 2.2: Add web editing-mode `Copy` action in `NoteEditor.tsx`
- [ ] Task 2.3: Add mobile header copy action in `ui/mobile/app/note/[id].tsx`
- [ ] Task 2.4: Add mobile bridge messages for `COPY_NOTE` and copy result feedback
- [ ] Task 2.5: Implement clipboard write logic in `app/editor-webview/page.tsx`

### Phase 3: Integration & Polish
- [ ] Task 3.1: Add success/error feedback on web and mobile
- [ ] Task 3.2: Add/extend unit and integration tests for smart paste, web actions, and mobile bridge
- [ ] Task 3.3: Run validation commands and perform manual round-trip testing in EverFreeNote
- [ ] Task 3.4: Update planning/testing docs with actual results and residual gaps

## Dependencies
**What needs to happen in what order?**

- `noteCopy` payload design must be settled before UI wiring so web and mobile share one contract.
- Smart-paste self-copy detection must land before manual round-trip verification has value.
- Mobile rich clipboard path depends on new WebView bridge messages and page-level handler support.
- Test updates depend on final payload shape and message names.

External dependencies:

- Browser clipboard support for HTML on web.
- Mobile WebView clipboard API support for rich write attempts.

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
