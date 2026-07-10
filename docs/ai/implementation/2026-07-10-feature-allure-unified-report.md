---
phase: implementation
title: Implementation Guide - Allure Unified Report
description: Technical implementation details and instructions for unifying Allure reports.
---

# Implementation Guide

## Development Setup
- No special local setup is required. The Allure Report v3 CLI is invoked via `npx allure` in the GHA workflow, which uses the project's npm package lock dependencies.
- Ensure node modules are installed (`npm ci`).

## Code Structure
- **Workflow configuration**: `.github/workflows/tests.yml`
- **Allure scripts**:
  - `scripts/prepare-allure-family-report.js`
  - `scripts/render-pr-status-comment.js`
  - `scripts/allure-pages-utils.js` (keeps the mappings of suites to layers).

## Implementation Notes

### Allure Custom Layers (Testing Pyramid)
We will modify the dynamically generated `allurerc.cjs` in `scripts/prepare-allure-family-report.js`. The `awesome` plugin will be configured with a custom `charts` array that specifies the `testingPyramid` chart and defines the order of layers:
`layers: ["unit", "component", "integration", "e2e"]`

### PR Comments
In `scripts/render-pr-status-comment.js`, we change the array `REPORT_FAMILIES` to `["allure"]`. The script will now expect a single report metadata block under the `allure` key in `reports/index.json` and generate one row in the markdown table.

### GHA Workflow Consolidation
We consolidate the jobs:
- `unit-tests-mobile`
- `unit-tests-core`
- `unit-tests-web`
- `component-tests`
- `resolve-e2e-branch`
- `wait-cloudflare-preview`
- `run-e2e`
- `publish-report`

All test jobs upload their raw Allure results using the `upload-artifact` action. The `publish-report` job depends on all test jobs, downloads their artifacts, and calls the unified report generation:
```bash
node scripts/prepare-allure-family-report.js \
  --family allure \
  --work-dir .allure-publish/allure \
  --history-root .allure-history \
  --input core-unit=.artifacts/core/allure-results/core-unit \
  --input core-integration=.artifacts/core/allure-results/core-integration \
  --input web-unit=.artifacts/web/allure-results/web-unit \
  --input mobile-unit=.artifacts/mobile/allure-results/mobile-unit \
  --input component=.artifacts/component/allure-results/component \
  --input e2e=.artifacts/e2e/allure-results/e2e \
  --github-output "$GITHUB_OUTPUT"
```
The history will be restored from and saved to `_history/allure` in the `gh-pages` branch.
The PR comment will search for comment ID containing `everfreenote-pr-status-comment` and update it or create it.
