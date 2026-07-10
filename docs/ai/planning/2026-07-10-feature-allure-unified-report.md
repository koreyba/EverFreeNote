---
phase: planning
title: Project Planning & Task Breakdown - Allure Unified Report
description: Break down work into actionable tasks and estimate timeline for unifying Allure reports.
---

# Project Planning & Task Breakdown

## Milestones

- [ ] **Milestone 1: Configuration & Commenter Updates**
  Configure the Allure Report custom layers for the Testing Pyramid widget and update the PR comment renderer script.
- [ ] **Milestone 2: GHA Workflow Consolidation**
  Consolidate `unit-tests.yml`, `component-tests.yml`, and `e2e-tests.yml` into a single `tests.yml` workflow, and delete the redundant workflow files.
- [ ] **Milestone 3: Verification & Cleanup**
  Verify the changes locally by simulating report merges and checking workflow syntax, and clean up any remaining config files.

## Task Breakdown

### Phase 1: Configuration & Commenter Updates
- [ ] **Task 1.1**: Update `scripts/prepare-allure-family-report.js` to write custom `charts` configuration in the `awesome` plugin block, including the `component` layer in the `testingPyramid` chart.
- [ ] **Task 1.2**: Update `scripts/render-pr-status-comment.js` to change `REPORT_FAMILIES` to `["allure"]` and `FAMILY_LABELS` to `allure: "Allure Report"`.
- [ ] **Task 1.3**: Validate that the JS scripts compile and pass basic linting/checks.

### Phase 2: Workflow Consolidation
- [ ] **Task 2.1**: Create `.github/workflows/tests.yml` by combining the jobs from the three old files:
  - Include push/pull_request triggers.
  - Jobs: `unit-tests-mobile`, `unit-tests-core`, `unit-tests-web`, `component-tests`, `resolve-e2e-branch`, `wait-cloudflare-preview`, `run-e2e`, and `publish-report`.
  - Ensure `publish-report` uses `--family allure` and downloads all available test artifacts.
  - Setup concurrency groups and permissions appropriately.
- [ ] **Task 2.2**: Delete `.github/workflows/unit-tests.yml`, `.github/workflows/component-tests.yml`, and `.github/workflows/e2e-tests.yml`.

### Phase 3: Verification & Local Testing
- [ ] **Task 3.1**: Run `npm run validate` to ensure TypeScript, ESLint, and Next.js builds are not broken by the scripts updates.
- [ ] **Task 3.2**: Run a local mock execution of `prepare-allure-family-report.js` with simulated results paths to verify that `allurerc.cjs` is generated correctly.
- [ ] **Task 3.3**: Run `npx ai-devkit@latest lint --feature allure-unified-report` to ensure all AI phase documentation is complete.

## Dependencies

- **Task 1.1 & 1.2** must be done before **Task 2.1**, so the GHA workflow points to the correct parameters for the script.
- The `gh-pages` branch must exist and have the folder structure for `reports/allure` and `_history/allure` (created automatically on the first run of the new workflow).

## Timeline & Estimates

- **Phase 1**: 1-2 hours
- **Phase 2**: 2-3 hours
- **Phase 3**: 1 hour
- Total: ~1 dev day

## Risks & Mitigation

- **Risk**: A test run in a parallel job fails, causing the entire workflow to cancel before report generation.
  - *Mitigation*: Ensure `publish-report` runs with `if: always()` and checks `has_results` output, so a report is still generated even if some tests fail (reflecting the failures in the unified dashboard).
- **Risk**: GitHub Pages size limit exceeded due to storing large Allure history files.
  - *Mitigation*: The `trimHistoryFile` routine in `prepare-allure-family-report.js` already enforces a limit of 20 runs, keeping the storage size small.
