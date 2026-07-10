---
phase: design
title: System Design & Architecture - Allure Unified Report
description: Define the technical architecture, workflow changes, and design decisions for the unified Allure reporting.
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

The new architecture consolidated three separate workflows (`unit-tests.yml`, `component-tests.yml`, `e2e-tests.yml`) into a single GitHub Actions workflow (`.github/workflows/tests.yml`). 
This allows us to run all tests in parallel jobs, upload their respective Allure raw results as artifacts, and then run a final `publish-report` job that downloads all available artifacts, merges them, and generates a single unified Allure report.

```mermaid
flowchart TD
  %% Test Jobs
  JestMobile["Mobile Jest tests"] -->|allure-jest| RawMobile["allure-results/mobile-unit"]
  JestCore["Core Jest tests"] -->|allure-jest| RawCore["allure-results/core-unit & core-integration"]
  JestWeb["Web Jest tests"] -->|allure-jest| RawWeb["allure-results/web-unit"]
  CypressCT["Cypress component tests"] -->|allure-cypress| RawComponent["allure-results/component"]
  PlaywrightE2E["Playwright E2E tests"] -->|playwright-allure| RawE2E["allure-results/e2e"]

  %% Artifacts
  RawMobile -->|Upload| ArtMobile[Artifact: mobile-allure]
  RawCore -->|Upload| ArtCore[Artifact: core-allure]
  RawWeb -->|Upload| ArtWeb[Artifact: web-allure]
  RawComponent -->|Upload| ArtComponent[Artifact: component-allure]
  RawE2E -->|Upload| ArtE2E[Artifact: e2e-allure]

  %% Merge Job
  ArtMobile -->|Download| MergeJob["publish-report job"]
  ArtCore -->|Download| MergeJob
  ArtWeb -->|Download| MergeJob
  ArtComponent -->|Download| MergeJob
  ArtE2E -->|Download (if run)| MergeJob

  %% Publish
  MergeJob -->|prepare-allure-family-report.js| UnifiedResults["Merged allure-results/allure"]
  UnifiedResults -->|Allure v3 CLI with custom layers| HTMLReport["allure-report/allure"]
  HTMLReport -->|Push| GHPages["GitHub Pages (gh-pages)"]
  GHPages -->|render-pr-status-comment.js| PRComment["PR Status Comment (Single Link)"]
```

## Component Breakdown

1. **GitHub Actions Workflow (`.github/workflows/tests.yml`)**:
   - Replaces the three old workflows.
   - Coordinates the triggers: runs unit & component tests on every push/PR, and runs E2E tests only on PRs (once Cloudflare Preview is ready) or manual `workflow_dispatch`.
   - The final `publish-report` job depends on all test jobs, downloads their artifacts, merges them, and publishes the unified report to the `allure` family.

2. **Allure Configuration (`scripts/prepare-allure-family-report.js`)**:
   - Generates the `allurerc.cjs` configuration dynamically.
   - We will add the `charts` option to the `awesome` plugin configuration, explicitly configuring the `testingPyramid` widget to include `layers: ["unit", "component", "integration", "e2e"]`.

3. **PR Comment Renderer (`scripts/render-pr-status-comment.js`)**:
   - Updated to only check and link the `allure` family report.
   - Renders a clean comment with a single table row pointing to the unified report.

4. **Allure Family Merge Script (`scripts/prepare-allure-family-report.js`)**:
   - Executes with `--family allure` and takes up to six `--input` arguments.
   - Maps the suites correctly and injects the `layer` label dynamically for each test result.

## Design Decisions

- **Why a Single Workflow File?**: 
  GitHub Actions doesn't support clean native dependency coordination across separate workflow runs. By merging them into a single workflow file, we can use native `needs: [job1, job2, ...]` to block the publisher until all test jobs are complete, and securely download artifacts from the *same* run.
- **Handling Skipped Jobs (Resiliency)**:
  On push to `main` or `develop`, the E2E jobs are skipped because there is no PR preview deployment. The `publish-report` job will download artifacts with `continue-on-error: true`. If E2E results are missing, `prepare-allure-family-report.js` will simply skip that suite input and build the report with unit & component tests. The Testing Pyramid will automatically adapt and show 0 E2E tests.
- **Unified History**:
  Report history will be maintained under `_history/allure/history.jsonl` on the `gh-pages` branch. When a new report is generated, it will load this history file, ensuring the history trend charts display all tests combined.

## Non-Functional Requirements

- **Pipeline Performance**: Jobs run in parallel on separate runner instances to keep CI time minimal.
- **Aesthetics & UX**: The Testing Pyramid widget displays component tests cleanly as a middle tier between unit and integration tests.
- **Traceability**: Allure `executor.json` points to the unified workflow run in GitHub Actions.
