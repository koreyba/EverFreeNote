---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Requirements + design drafted and reviewed
- [ ] Milestone 2: Implement shared caret-placement helper + web integration
- [ ] Milestone 3: Mobile/WebView integration + regression tests + validation

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [ ] Task 1.1: Confirm exact UX rules for background clicks (in-document gaps vs bottom area)
- [ ] Task 1.2: Identify Mobile WebView integration point (where ProseMirror view is accessible)

### Phase 2: Core Features
- [ ] Task 2.1: Implement shared utility `placeCaretFromCoords(view, x, y)` using `posAtCoords` + `Selection.near`
- [ ] Task 2.2: Update Web `RichTextEditor` to use the utility for background clicks
- [ ] Task 2.3: Update Mobile WebView editor to use the same utility (Option A preferred)

### Phase 3: Integration & Polish
- [ ] Task 3.1: Add/adjust Cypress component tests for Web caret behavior (gaps vs bottom)
- [ ] Task 3.2: Add/adjust component tests for Mobile/WebView editor caret behavior
- [ ] Task 3.3: Run `npm run validate` and targeted test suites; fix regressions

## Dependencies
**What needs to happen in what order?**

- Web can be implemented once the core utility exists.
- Mobile depends on where ProseMirror lives (WebView vs RN bridge).

## Timeline & Estimates
**When will things be done?**

- Task 1.x: 0.5–1h (repo inspection + decisions)
- Task 2.x: 1–2h (core + web + mobile integration)
- Task 3.x: 1–2h (tests + stabilization)

## Risks & Mitigation
**What could go wrong?**

- Risk: Mobile WebView doesn’t expose `EditorView` cleanly.
  - Mitigation: implement coordinates bridge message; keep logic in WebView where ProseMirror is.
- Risk: Differences in pointer vs touch coordinates.
  - Mitigation: normalize to clientX/clientY; add a small adapter for touch.
- Risk: Tests become flaky due to coordinate-based behavior.
  - Mitigation: use deterministic content + click in a known gap; assert “not end-of-doc” rather than exact offset.

## Resources Needed
**What do we need to succeed?**

- Access to the mobile WebView editor source and existing tests.
- Cypress component test environment.
