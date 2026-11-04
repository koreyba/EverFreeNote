---
phase: planning
title: Main Sonar Quality Gate Plan
---

# Work plan

- [x] Refresh exact main SHA, quality-gate conditions and all 15 bug/security issues.
- [x] Preserve worktrees/preview and create sibling codex/sonar-main-green.
- [x] Reproduce OAuth completion/rejection loss with two failing tests; implement await.
- [x] Make existing handled background promise ownership explicit at the other 12 sites.
- [x] Add PR/main quality-gate waiting without changing criteria or coverage.
- [ ] Review two false-positive candidates with auditable evidence in owner Sonar session.
- [x] Validate 29 unit cases and 32 unchanged browser cases, types/lint/workflows.
- [ ] Publish PR, require fresh full CI, merge with exact-head guard.
- [ ] Confirm actual main Sonar gate OK, external check success, and complete tests.
