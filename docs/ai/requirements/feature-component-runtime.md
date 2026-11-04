---
phase: requirements
title: Component CI Runtime
description: Reduce component pipeline latency while preserving its behavioral evidence
---

# Component CI Runtime

The maintainer requested an autonomous investigation and implementation of
runtime improvements, including test setup, timers, connections and parallelism.

## Requirements

- Measure against successful PR run `41806363718` on `6dce09c6919`.
- Preserve all 143 spec files and 1,146 existing cases; discover new specs
  automatically rather than maintaining a manually selected test list.
- Preserve assertions, retries, timeout budgets, instrumentation, product
  coverage scope, isolated local authentication/RLS tests and failure propagation.
- Retain one complete Allure family and a union of raw coverage counters for
  Sonar and downloadable reports. Missing shards or artifacts must fail CI.
- Optimize PR, manual and main component execution without duplicate full runs.
- Do not re-enable Qodana/Codacy or modify production behavior for test speed.
- Preserve existing worktrees and local previews. Use a new sibling worktree
  based on merged main `3852946ebbab`.

## Acceptance

An exact-head GitHub run must demonstrate shorter component pipeline wall time,
all original test identities, complete reports and successful remaining checks.
Report measured tradeoffs separately from estimates or unimplemented ideas.
