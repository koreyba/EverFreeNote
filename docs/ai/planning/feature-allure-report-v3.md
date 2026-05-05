---
phase: planning
title: Allure Report v3 Plan
description: Incremental rollout plan for Allure reporting
---

# Allure Report v3 Plan

## Milestones

- [x] Milestone 1: Foundation and suite-level Allure generation.
- [x] Milestone 2: Family-level GitHub Pages architecture and docs.
- [x] Milestone 3: Family-level publication for component and unit workflows.
- [x] Milestone 4: Replace the old E2E Pages publication with Allure family publication.

## Task Breakdown

### Phase 1: Web Component Tests

- [x] Task 1.1: Check current Allure v3 docs through Context7.
- [x] Task 1.2: Add root Allure v3 CLI and JavaScript adapter dependencies.
- [x] Task 1.3: Configure Cypress component tests to write `allure-results/component`.
- [x] Task 1.4: Add npm scripts to generate component and aggregate Allure reports.
- [x] Task 1.5: Ignore generated Allure result and report directories.

### Phase 2: Web Component CI

- [x] Task 2.1: Add a shared Pages catalog model for Allure family reports.
- [x] Task 2.2: Define history-key rules for `PR`, `main`, `develop`, and manual scopes.
- [x] Task 2.3: Add scripts/templates for a shared Allure Pages index.

### Phase 3: Component and Unit Family Publication

- [x] Task 3.1: Generate and upload component Allure artifacts in `.github/workflows/component-tests.yml`.
- [x] Task 3.2: Merge core, integration, web, and mobile Allure results into a single `unit` family report.
- [x] Task 3.3: Publish `component` and `unit` family reports plus the shared Pages index.
- [x] Task 3.4: Add summary links to published family reports.

### Phase 4: Web E2E Family Publication

- [x] Task 4.1: Update `koreyba/EverFreeNote-e2e` Playwright config with an Allure reporter.
- [x] Task 4.2: Replace the old Playwright HTML Pages publish with `e2e` Allure family publication.
- [x] Task 4.3: Route E2E publication through the same shared Pages catalog and history logic.

### Phase 5: Existing Suite Enablement

- [x] Task 5.1: Add Allure Jest environment to the root `unit-core` project.
- [x] Task 5.2: Add Allure Jest environment to the root `unit-web` project.
- [x] Task 5.3: Add Allure Jest environment to the mobile Jest package.
- [x] Task 5.4: Preserve existing JSON and JUnit outputs across enabled suites.

## Dependencies

- Web component reporting depends only on root npm dependencies and `cypress.config.ts`.
- Root unit reporting depends on validating `allure-jest` with Jest multi-project configs.
- Mobile reporting depends on the separate mobile package lock.
- E2E reporting depends on changes outside this repository.
- Family-level Pages publication depends on shared scripts for catalog generation, history-path selection, and report metadata injection.
- The `unit` family publish step depends on downloading artifacts from multiple jobs before running Allure generation.

## Risks & Mitigation

- Risk: Allure adapters change test environment behavior.
  Mitigation: adopt one suite at a time and run existing suite commands after each change.
- Risk: CI reports become too large.
  Mitigation: publish only family reports to Pages and keep raw artifacts under Actions retention.
- Risk: E2E ownership spans repositories.
  Mitigation: keep E2E as its own tracked phase and do not block component reporting on it.
- Risk: merged unit reports lose per-suite clarity.
  Mitigation: standardize Allure labels and environment metadata before publication.
- Risk: family publish jobs overwrite each other on `gh-pages`.
  Mitigation: use family-specific destination directories, family-specific retained-path manifests, and serialized publish concurrency.

## Resources Needed

- Allure Report v3 CLI and JavaScript adapters.
- Context7 documentation checks for each runner before implementation.
- CI artifact storage in GitHub Actions.
