---
phase: requirements
title: Requirements & Problem Understanding - Allure Unified Report
description: Clarify the problem space, gather requirements, and define success criteria for unifying Allure reports and configuring the Testing Pyramid.
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**
- Currently, Allure reports are split into three independent families: `unit` (which includes unit and integration tests), `component` (Cypress component tests), and `e2e` (Playwright E2E tests).
- Each family generates its own report, has its own history, and is published separately to GitHub Pages.
- Because of this separation, the built-in Allure **Testing Pyramid** widget cannot display a holistic view of the test suite. It only shows the layers present in each individual report (e.g. the unit report only shows unit and integration, while E2E and component tests are completely invisible on it).
- Developers also have to open three different links from their PR status comments to inspect different test results.

## Goals & Objectives
**What do we want to achieve?**
- **Primary Goals**:
  1. Merge all Allure results (`core-unit`, `core-integration`, `web-unit`, `mobile-unit`, `component`, and `e2e`) into a single unified Allure report family (let's call it `allure` or `unified`).
  2. Configure the Allure `testingPyramid` chart in the unified report to include the `component` layer, displaying four layers: `unit`, `component`, `integration`, and `e2e` (from bottom to top).
  3. Combine/coordinate the CI pipelines (`unit-tests.yml`, `component-tests.yml`, `e2e-tests.yml`) to upload test results as artifacts and have a final job that merges them and publishes a single report.
  4. Update the PR status comment script to render a single unified report link instead of three.
- **Secondary Goals**:
  - Keep historical trends intact in the new unified report.
  - Keep the PR status comment clean and concise.
- **Non-Goals**:
  - Modifying how Jest, Cypress, or Playwright tests are executed locally.
  - Changing test code/logic.

## User Stories & Use Cases
**How will users interact with the solution?**
- **As a Developer**, I want to see a single Allure report link on my PR comment, so that I can inspect all test results (unit, integration, component, and E2E) in one dashboard.
- **As a Developer / QA Engineer**, I want to view the Testing Pyramid widget in the Allure report, so that I can verify the proportion and health of each testing layer (`unit` $\rightarrow$ `component` $\rightarrow$ `integration` $\rightarrow$ `e2e`).
- **As a CI Maintainer**, I want the pipeline to be resilient, so that if E2E tests are skipped (e.g. on push to `main` where no preview URL exists), the unified report is still generated with the available unit and component results.

## Success Criteria
**How will we know when we're done?**
- The CI pipeline runs successfully and uploads all test results.
- A single Allure report is generated and published to GitHub Pages under `reports/allure/pr-<number>/...` or `reports/allure/branch-<name>/...`.
- The Testing Pyramid widget is visible on the dashboard and contains:
  - `Layer: e2e`
  - `Layer: integration`
  - `Layer: component`
  - `Layer: unit`
  - Correct test counts for each layer.
- The PR status comment contains a single table row for the unified Allure report.

## Constraints & Assumptions
- **E2E Repository**: Playwright E2E tests reside in a separate repository (`koreyba/EverFreeNote-e2e`) but are executed in the GHA workflow of this repository. Their results are uploaded as an artifact, which we must continue to download.
- **Workflow Triggers**: Since E2E tests depend on the Cloudflare Preview deployment (which only happens on PRs), the E2E job will only run on PRs. On push to long-lived branches (`main`/`develop`), E2E is skipped, meaning the unified report will only contain unit and component tests. The merging script must handle missing suites gracefully.
- **Pages Path**: The published URL structure on GitHub Pages must be updated to reference the new unified family (e.g. `allure`).

## Questions & Open Items
- Do we merge all three GHA workflow files into a single workflow file, or trigger a downstream publisher workflow?
  - *Decision*: Merging them into a single workflow file (e.g. `tests.yml` or `ci.yml`) is the most robust and standard way to coordinate job dependencies (using `needs`). It simplifies downloading artifacts from the same run.
- What name should we use for the unified family?
  - *Decision*: Let's use `allure` as the unified family name.
