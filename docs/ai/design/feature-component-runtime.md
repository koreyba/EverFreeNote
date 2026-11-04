---
phase: design
title: Component Runtime Design
description: Preserve execution and reporting contracts while reducing repeated work
---

# Component Runtime Design

## Baseline and investigation

Successful run `41806363718` used one component job: 29m12s total, 27m33s in
the fixture/test step. Allure recorded 9m41s summed test duration; Cypress
reported 13m21s of spec execution. These measure different boundaries.
The configured coverage plugin invokes its report task after every spec and
generates NYC output repeatedly. Measure this separately before changing it.

`main` currently runs both Component Tests and Merge tests coverage, executing
the component suite twice. The coverage producer should call the same reusable
component workflow once, retaining Allure and Sonar consumers.

## Implemented pipeline

```mermaid
flowchart TD
  Discover[Discover every component spec] --> Plan[Deterministic balanced plan]
  Plan --> S1[Shard 1: isolated fixture and Electron/Xvfb]
  Plan --> S2[Shard 2: isolated fixture and Electron/Xvfb]
  Plan --> S3[Shard 3: isolated fixture and Electron/Xvfb]
  Plan --> S4[Shard 4: isolated fixture and Electron/Xvfb]
  S1 --> Join[Validate completeness and merge artifacts]
  S2 --> Join
  S3 --> Join
  S4 --> Join
  Join --> Coverage[Render coverage union once]
  Join --> Allure[Existing Allure publication]
  Coverage --> Sonar[Existing Sonar analysis]
```

Each runner owns its fixture, raw results and coverage. Do not run competing
browser processes against one fixture. Disable matrix fail-fast so a failure
still leaves evidence from the remaining shards. A final stable component job
must fail if any shard or merge fails. Preserve consumers' artifact names.

Use NYC's reporter configuration to defer presentation only when the workflow
guarantees a final report step. `nyc.config.cjs` supplies an empty intermediate
reporter list for `COMPONENT_COVERAGE_DEFER_REPORT=true`; Cypress still collects
and saves counters and unvisited source placeholders through its original
tasks. The final command explicitly requests HTML/text/LCOV. Without this flag,
the plugin's original local reporting defaults remain intact.

Known Linux requirements remain: headed Electron in Xvfb, disabled JIT
compilation, real timers for queue/write barrier concurrency cases. Explicit
wait removal or connection changes require evidence that behavior remains tested.
