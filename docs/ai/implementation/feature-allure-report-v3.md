---
phase: implementation
title: Allure Report v3 Implementation
description: Implementation notes for Allure reporting
---

# Allure Report v3 Implementation

## Development Setup

- Root dev dependencies include `allure`, `allure-cypress`, `allure-jest`, and `allure-js-commons`.
- Generated files are ignored through `/allure-results` and `/allure-report`.
- ESLint ignores generated Allure artifacts through `allure-results/**` and `allure-report/**`.

## Code Structure

- Cypress component results: `allure-results/component`.
- Cypress component report: `allure-report/component`.
- Core unit results: `allure-results/core-unit`.
- Core unit report: `allure-report/core-unit`.
- Core integration results: `allure-results/core-integration`.
- Core integration report: `allure-report/core-integration`.
- Mobile unit results: `ui/mobile/allure-results/mobile-unit`.
- Mobile unit report: `ui/mobile/allure-report/mobile-unit`.
- Web unit results: `allure-results/web-unit`.
- Web unit report: `allure-report/web-unit`.
- Aggregate local report: `allure-report`.
- GitHub Pages family reports:
  `reports/e2e/...`, `reports/component/...`, and `reports/unit/...`.
- GitHub Pages history store:
  `_history/<family>/<scope>.json`.

## Implementation Notes

### Web Component Tests

- `cypress.config.ts` registers `allureCypress(on, config, ...)` in the component `setupNodeEvents`.
- The code coverage task remains registered in the same hook.
- Environment metadata records OS, Node.js, and `test_type=web-component`.

### Local Commands

- `npm run test:component` runs Cypress component tests and now emits Allure results.
- `npm run allure:generate:component` generates the component HTML report from existing results.
- `npm run test:component:allure` runs component tests, then generates the component report.
- `npm run test:unit:core` now emits Allure results for the `unit-core` Jest project.
- `npm run allure:generate:core-unit` generates the core unit HTML report from existing results.
- `npm run test:unit:core:allure` runs the core unit suite, then generates the report.
- `npm run test:integration:core` now emits Allure results for the `integration-core` Jest project.
- `npm run allure:generate:core-integration` generates the core integration HTML report from existing results.
- `npm run test:integration:core:allure` preserves the original test exit code while still generating the report.
- `npm --prefix ui/mobile test` now emits Allure results for mobile unit tests.
- `npm --prefix ui/mobile run allure:generate` generates the mobile unit HTML report from existing results.
- `npm run test:unit:web` now emits Allure results for the `unit-web` Jest project.
- `npm run allure:generate:web-unit` generates the web unit HTML report from existing results.
- `npm run test:unit:web:allure` runs the web unit suite, then generates the report.
- `npm run allure:generate` generates an aggregate report from `allure-results`.

### Family Publication Model

- Architecture and rationale for family-based publication live in
  [allure-reporting-architecture.md](/C:/Projects/EverFreeNote/docs/ai/design/allure-reporting-architecture.md).
- CI assembles `component`, `unit`, and `e2e` family reports through `scripts/prepare-allure-family-report.js`.
- The `unit` family publish flow downloads raw results from `core-unit`, `core-integration`, `web-unit`, and `mobile-unit` before generating the final Pages report.
- Component CI runs `scripts/backfill-cypress-spec-failures-to-allure.js` before report generation so spec-level Cypress crashes still surface in the published Allure data.

## Integration Points

- Component CI can upload `allure-results/component` immediately after the test step.
- CI report generation can run even when tests fail if the step uses `if: always()`.
- `unit-tests.yml` now generates `allure-report/core-unit` and uploads both raw core unit results and the generated report as CI artifacts.
- `unit-tests.yml` now generates `allure-report/core-integration` and uploads both raw core integration results and the generated report as CI artifacts.
- `unit-tests.yml` now generates `ui/mobile/allure-report/mobile-unit` and uploads both raw mobile unit results and the generated report as CI artifacts.
- `unit-tests.yml` now generates `allure-report/web-unit` and uploads both raw web unit results and the generated report as CI artifacts.
- Component, unit, and E2E Pages publication consume raw Allure results rather than republishing the prebuilt per-suite HTML reports.
- The old `e2e-tests.yml` Playwright HTML Pages publication path has been replaced by the `e2e` Allure family publish job.
