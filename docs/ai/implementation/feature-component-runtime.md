---
phase: implementation
title: Component Runtime Implementation
description: Implementation decisions and measured results for component CI optimization
---

# Component Runtime Implementation

Active branch: `codex/component-runtime`, based on main `3852946ebbab`.
Report deferral, four parallel runners and main-run consolidation are implemented.
No application or existing component test behavior has been changed. Fresh GitHub
execution and its wall-time comparison remain the rollout gate.

The baseline fixture starts once per runner and cleans up its own local stack.
The large DesktopSplitView suite already disables Supabase session persistence,
automatic refresh and URL session detection, and intercepts its invalid-host
requests. Only CachePrivacySubset directly references fixture audit credentials;
real authentication coverage must remain enabled.

The initial inventory found 11 literal `cy.wait(number)` sites totalling 2,690ms
if each executes once. This inventory is not an execution-time measurement and
does not justify removing negative-observation or debounce assertions.

Baseline Allure commands recorded 193.4s in 1,796 clicks, 105.0s in 447 typing
commands and 11.0s in 25 waits (including network aliases). These are nested
command durations, not exclusive wall time. They include useful browser
actionability and behavioral synchronization; globally disabling them would
change the tested behavior. The longest wait is the intentional 5s initial
cache-list response. The local authenticated fixture starts once per runner;
CachePrivacySubset creates/logs in its accounts once per spec, then clears data
between cases to preserve ownership and isolation checks. No redundant connection
per transaction was found in these reviewed expensive suites.

## Coverage reporting experiment

The real Cypress coverage task was exercised against the complete 298-file CI
coverage snapshot. Median native report time was 381.9ms; deferred report time
was 135.1ms (three warm local iterations per mode). Final LCOV was byte-identical
(431,447 bytes). These are local task timings, not a promised CI speedup.

Three regression cases use the installed coverage plugin and NYC: deferred
collection, unchanged local defaults, and exact final counter/LCOV equivalence
including an unvisited source file. The deferred case failed before the change;
all three now pass through Allure with matched scope and zero findings.

## Parallel execution and aggregation

The planner discovers current spec files and assigns each exactly once using
longest-first balancing. The checked-in baseline timings are scheduling hints;
new files receive a median fallback. Four separate VMs each run the same isolated
fixture and headed Electron/Xvfb command. A stable aggregate job fails on a failed
runner, missing/foreign spec evidence, invalid metadata or missing raw coverage.

Per-attempt artifacts are immutable. Addressed retries replace only their shard
in the aggregate; previous attempts remain downloadable and their coverage is
not double-counted. Allure results and attachments are combined before the
existing report publisher. Raw Istanbul maps are unioned before one final report.
Consumer artifact names stay compatible with PR publication and Sonar.

`main` uses this covered reusable execution through Merge tests coverage. Its
second standalone component push trigger is removed. Other branch/manual
triggers remain, and remaining quality services are unchanged.

All 26 Python helper regressions passed through Allure with matched scope,
complete modeling and zero findings. A replay of the existing baseline through
the assembler retained all 143 specs, 1,146 logical tests and 298 coverage files;
statement/function/branch counters and maps matched exactly. This replay is
an artifact integration check, not a fresh product test execution. Actionlint,
project TypeScript checks and ESLint passed locally. DevKit feature lint uses a
`feature-*` branch lookup; this repository task follows the required `codex/`
branch prefix instead, without creating a misleading alias.

Artifact files use atomic exclusive copying. A concurrent writer cannot replace
evidence between a preliminary existence check and a copy; a regression injects
that exact interleaving and verifies both failure and preservation of the rival
file. Identical existing files are accepted, conflicting content fails. Cypress
is invoked directly with the planned `--spec` selection so the npm script's full
glob cannot introduce a second competing selection flag.

## First GitHub measurement

Run `41817685674` at `d017e82dda6` completed component planning through aggregation
in **11m47s** (10:57:48–11:09:35 UTC), versus **29m12s** for the baseline job:
59.6% less elapsed time. Shard jobs took 8m55s, 7m22s, 9m53s and 10m17s. Total
component runner time including planning/aggregation was 37m58s, up 30.0% from
29m12s; parallelism trades concurrent resources for latency. Main additionally
avoids its formerly duplicated full execution. These are observed samples,
not a guaranteed fourfold speedup.

Allure inspection found all **1,146 baseline identities**, 143 specs, complete
modeling, zero retries/flaky/skipped cases and no extra runner failures. The raw
coverage union retained all 298 source files and identical instrumentation maps:
13,036 statements, 2,981 functions and 9,151 branch points. Covered counts were
9,960 → 9,964 statements, 2,321 → 2,321 functions and 6,467 → 6,472 branches.
Individual runtime counters vary: the early return after cancellation at
`useRestoredNoteValidation.ts:105` ran eight times in the baseline and zero in
this sample. Its statement and branch remain instrumented; no assertion or source
scope was removed. Byte-identical counters are required for artifact replay,
not claimed across independent browser executions.

This first component benchmark succeeded, while its overall PR had the CodeQL
copy-race finding addressed above. Acceptance still requires fresh full CI on
the final SHA. Current gate and rollout evidence is recorded in PR #208.
