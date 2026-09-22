---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Mobile editor layout plan

## Milestones
- [x] Requirements and design reviewed against all four requests.
- [x] Regression tests reproduce current failures.
- [x] Mobile layout and toolbar implemented.
- [x] Validation, implementation alignment and final review complete.

## Task Breakdown
- [x] 1. Reproduce long-note occlusion, tag/header stacking, static navigation and wrapping/top toolbar in Cypress.
- [x] 2. Implement shared mobile workspace, navigation direction handling and viewport sizing.
- [x] 3. Isolate editor scrolling below the header and dock mobile formatting outside it.
- [x] 4. Group mobile formatting controls; preserve desktop and selection/history behavior.
- [x] 5. Run focused Allure browser/unit checks, type checks and lint; review actual evidence and fix regressions.
- [x] 6. Reconcile implementation/testing docs and perform final code review.

- [x] 7. Apply requested toolbar refinements: combine inline formats, prioritize primary groups, compact the font trigger.
- [ ] 8. Verify refined toolbar, commit, publish PR, inspect checks/reviews and merge the verified head.

## Dependencies
Tasks 2–4 follow failing browser regressions; validation follows integration. Existing lockfile installation completed with npm ci. No subagents requested or needed.

## Timeline & Estimates
One integrated change; browser checks are the main execution cost.

## Risks & Mitigation
Keyboard viewport panning, nested/horizontal scroll events, bottom overscroll, Radix focus restoration, desktop sticky layout. Cover with targeted behavioral checks; report native-device gaps honestly.

## Progress
All 26 browser acceptance cases pass, including compact font/inline formats, drag suppression and expanded editing with a keyboard viewport. Final Android APK passed the docked Gboard keyboard and native swipe smoke checks; physical Android and iOS remain unverified. Source review, types and lint passed. PR #200 is open. The first-save fullscreen regression and Codacy test-fixture findings were corrected; final exact-head CI/quality checks precede merge.

## Requested follow-up
- [x] 9. Add mobile editor expansion/collapse and preserve draft/selection/history.
- [x] 10. Validate expanded editing with keyboard viewport and installed Android IME.
