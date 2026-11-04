---
phase: planning
title: Component Runtime Plan
description: Evidence-driven performance improvements for component CI
---

# Component Runtime Plan

- [x] Create isolated worktree from merged main; inspect baseline CI and Allure.
- [x] Identify duplicate main runs and per-spec coverage rendering.
- [x] Measure report-generation overhead and audit timers/connections.
- [x] Add failing regression coverage for report deferral and final equivalence.
- [x] Implement and benchmark deferred presentation without lost coverage.
- [x] Add deterministic four-shard planning and fail-closed artifact aggregation.
- [x] Reuse one component execution on main and preserve consumer contracts.
- [x] Verify helper error paths, full spec membership, coverage union and Allure.
- [x] Review and publish PR #208; measure fresh GitHub latency and full test scope.
- [x] Resolve observed artifact security/permissions and OfflineNotes acknowledgement races.
- [x] Rebalance scheduling using successful per-spec GitHub wall times.
- [ ] Confirm all remaining gates and full corpus on the final SHA, then merge and verify main.

Task tracking name: `component-runtime`. Timing and correctness evidence lives
outside git; commit only code, workflow configuration and durable documentation.
