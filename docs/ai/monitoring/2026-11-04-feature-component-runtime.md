---
phase: monitoring
title: Component Runtime Monitoring
description: Compare latency and completeness without trading away quality signals
---

# Component Runtime Monitoring

Record each shard's setup, fixture/test, upload and aggregate durations. Compare
the slowest shard and total component path with successful baseline PR run
41806363718: component job 29m12s, fixture/test step 27m33s. Runner time/cost and
elapsed latency are separate measurements; parallel runners do not remove work.

The committed timing map uses successful four-shard Cypress spec wall times
from run 41817685674. First-spec cold compilation is replaced with its Allure
envelope plus the 4,549ms median observed spec overhead. These are balancing hints. Discovery remains
authoritative: new specs receive a median fallback weight, deleted files are
not scheduled, and every current spec must appear once in the plan.

Monitor missing/duplicate/foreign specs, stale SHA/version metadata, incomplete
coverage inputs, Allure modeling, retries/flaky/skipped results and source scope.
Missing evidence fails the aggregate even if the available shards passed.
Failures retain their raw artifacts and the available combined diagnostics.

Do not lower assertions, retries, timeouts, source inclusion or failure gates to
meet a runtime target. Profile material regressions from current artifacts
before changing scheduling or test mechanics. No recurring monitor is created
as part of this configuration change.
