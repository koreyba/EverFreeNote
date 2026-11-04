---
phase: testing
title: Component Runtime Validation
description: Scope, coverage equivalence and latency acceptance for component CI
---

# Component Runtime Validation

## Test Coverage Goals

Preserve every existing component behavior check, all source coverage and CI
failure propagation. Baseline: 143 specs / 1,146 cases, zero retries or skipped
cases in successful run 41806363718. Runtime improvements require measurements.

## Unit Tests

- [x] Real coverage plugin saves all counters/unvisited scope without an intermediate report.
- [x] Default local reporting stays active.
- [x] Final explicit report is byte-identical to original LCOV and produces HTML.
- [x] Planner discovers all current/new specs exactly once and balances measured work.
- [x] Invalid/stale plans and missing/duplicate/foreign shard evidence fail closed.
- [x] Aggregation preserves Allure attachments and unions overlapping coverage counters.

## Integration Tests

- [x] Three coverage regressions passed with matched Allure scope and zero findings.
- [x] Complete 298-file coverage snapshot produced byte-identical final LCOV.
- [x] Replay existing baseline through four artifacts: 143 specs, 1,146 results, 298 coverage files, exact counters/maps.
- [x] Validate reusable workflow calls and artifact names with actionlint and contract review.
- [x] All 25 helper cases pass with matched Allure expectations and complete modeling; project lint/type checks pass.
- [ ] Confirm matrix failure propagation and helper execution in the real GitHub workflow.

## End-to-End Tests

- [ ] Fresh GitHub component run contains the same 1,146 logical identities.
- [ ] Four shards complete; combined Allure and Sonar consume the full union.
- [ ] Remaining PR checks pass without weakening their configuration.

## Test Data

Use synthetic local files/counters for helper contracts and the existing isolated
Supabase fixture for component authentication/RLS. No Stage/production data.

## Test Reporting & Coverage

Allure agent outputs and benchmarks live outside git under the current chat's
component-runtime evidence directory. Keep raw shard artifacts and one final
combined report. Compare source and covered-statement/branch scope with baseline.

## Manual Testing

No product UI changes are planned. Preserve the existing preview and worktrees.

## Performance Testing

Baseline component job: 29m12s; fixture/test step: 27m33s. Compare real GitHub wall
time with runner count/setup costs reported separately. The local report-task
benchmark improved median 381.9ms to 135.1ms; it does not establish CI latency.

## Bug Tracking

Track failures by their current SHA and evidence. Keep retries/timeouts/assertions
unchanged. Durable task: component-runtime.
