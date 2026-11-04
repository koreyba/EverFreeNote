---
phase: deployment
title: Component Runtime Rollout
description: Roll out component CI changes through a measured pull request
---

# Component Runtime Rollout

Publish `codex/component-runtime` from an isolated worktree. The change affects
CI orchestration and report presentation; production application behavior and
test assertions remain unchanged. No cloud credentials or services are added.

Before merge, require successful Build (including helper contracts), core/web
unit, all four component shards and their stable aggregate job, E2E, CodeQL,
Semgrep, Cloudflare, Sonar and combined Allure publication. Inspect current-head
component evidence against the baseline 143 specs / 1,146 test identities.
Compare coverage source/statement/branch scope and measure the interval from
component planning to aggregate completion against the 29m12s baseline.

After merge, `Merge tests coverage` owns the single main component execution
with coverage and Allure enabled. `Component Tests` no longer independently
triggers on main; develop/manual behavior is retained. Verify the first main
run uploads the existing `component-coverage-*` artifacts for Sonar.

Intermediate shard artifacts retain every workflow attempt for 30 days.
Canonical merged artifact names point at the latest selected attempt of each
shard, allowing an addressed rerun without double counting or loss of raw
diagnostics. Reverting the CI change restores the previous orchestration and
report defaults; no data migration is involved.
