---
phase: planning
title: Allure Report v3 Plan
description: Incremental rollout plan for Allure reporting
---

# Allure Report v3 Plan

## Milestones

- [x] Milestone 1: Foundation and web component test reporting.
- [ ] Milestone 2: CI artifact publishing for web component reports.
- [ ] Milestone 3: Add remaining suites in priority order.

## Task Breakdown

### Phase 1: Web Component Tests

- [x] Task 1.1: Check current Allure v3 docs through Context7.
- [x] Task 1.2: Add root Allure v3 CLI and JavaScript adapter dependencies.
- [x] Task 1.3: Configure Cypress component tests to write `allure-results/component`.
- [x] Task 1.4: Add npm scripts to generate component and aggregate Allure reports.
- [x] Task 1.5: Ignore generated Allure result and report directories.

### Phase 2: Web Component CI

- [ ] Task 2.1: Generate Allure component report in `.github/workflows/component-tests.yml`.
- [ ] Task 2.2: Upload `allure-results/component` and `allure-report/component` artifacts.
- [ ] Task 2.3: Add CI summary link or artifact names to the workflow summary.

### Phase 3: Web E2E Tests

- [ ] Task 3.1: Update `koreyba/EverFreeNote-e2e` Playwright config with an Allure reporter.
- [ ] Task 3.2: Publish E2E Allure results alongside the existing Playwright HTML report.
- [ ] Task 3.3: Decide whether this repository should aggregate downloaded E2E Allure artifacts.

### Phase 4: Core Unit Tests

- [x] Task 4.1: Add Allure Jest environment to the root `unit-core` project.
- [x] Task 4.2: Use `allure-results/core-unit` and keep JSON summaries unchanged.
- [x] Task 4.3: Add report generation and CI artifact upload.

### Phase 5: Mobile Unit Tests

- [x] Task 5.1: Add Allure Jest dependencies to `ui/mobile`.
- [x] Task 5.2: Configure `ui/mobile/jest.config.js` for `allure-results/mobile-unit`.
- [x] Task 5.3: Update mobile unit CI artifacts.

### Phase 6: Web Unit Tests

- [x] Task 6.1: Add Allure Jest environment to the root `unit-web` project.
- [x] Task 6.2: Use `allure-results/web-unit` and keep JSON summaries unchanged.
- [x] Task 6.3: Add report generation and CI artifact upload.

## Dependencies

- Web component reporting depends only on root npm dependencies and `cypress.config.ts`.
- Root unit reporting depends on validating `allure-jest` with Jest multi-project configs.
- Mobile reporting depends on the separate mobile package lock.
- E2E reporting depends on changes outside this repository.

## Risks & Mitigation

- Risk: Allure adapters change test environment behavior.
  Mitigation: adopt one suite at a time and run existing suite commands after each change.
- Risk: CI reports become too large.
  Mitigation: upload raw results and generated reports with retention aligned to existing artifacts.
- Risk: E2E ownership spans repositories.
  Mitigation: keep E2E as its own tracked phase and do not block component reporting on it.

## Resources Needed

- Allure Report v3 CLI and JavaScript adapters.
- Context7 documentation checks for each runner before implementation.
- CI artifact storage in GitHub Actions.
