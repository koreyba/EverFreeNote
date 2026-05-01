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
- Core integration results should join the published `unit` family through a dedicated suite label, even if they do not generate a separate local report script today.
- Mobile unit results: `ui/mobile/allure-results/mobile-unit`.
- Mobile unit report: `ui/mobile/allure-report/mobile-unit`.
- Web unit results: `allure-results/web-unit`.
- Web unit report: `allure-report/web-unit`.
- Aggregate local report: `allure-report`.
- GitHub Pages family reports:
  `reports/e2e/...`, `reports/component/...`, and `reports/unit/...`.
- GitHub Pages history store:
  `_history/<family>/<scope>.jsonl`.

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
- `npm --prefix ui/mobile test` now emits Allure results for mobile unit tests.
- `npm --prefix ui/mobile run allure:generate` generates the mobile unit HTML report from existing results.
- `npm run test:unit:web` now emits Allure results for the `unit-web` Jest project.
- `npm run allure:generate:web-unit` generates the web unit HTML report from existing results.
- `npm run test:unit:web:allure` runs the web unit suite, then generates the report.
- `npm run allure:generate` generates an aggregate report from `allure-results`.

### Family Publication Model

- `component` stays a single-suite family report built from `allure-results/component`.
- `unit` is assembled in CI by downloading Allure result artifacts from:
  `core-unit`, `core-integration`, `web-unit`, and `mobile-unit`.
- `e2e` is assembled from the external repository's `allure-results/e2e` artifact after the test run completes.
- Every family report gets injected `executor.json`, environment metadata, and a history path chosen from family plus scope.
- The shared Pages index reads a generated JSON catalog rather than crawling directories at runtime.

## Integration Points

- Component CI can upload `allure-results/component` immediately after the test step.
- CI report generation can run even when tests fail if the step uses `if: always()`.
- `unit-tests.yml` now generates `allure-report/core-unit` and uploads both raw core unit results and the generated report as CI artifacts.
- `unit-tests.yml` now generates `ui/mobile/allure-report/mobile-unit` and uploads both raw mobile unit results and the generated report as CI artifacts.
- `unit-tests.yml` now generates `allure-report/web-unit` and uploads both raw web unit results and the generated report as CI artifacts.
- Future Pages publication should consume raw Allure results rather than republishing the prebuilt per-suite HTML reports.
- The old `e2e-tests.yml` Playwright HTML Pages publication path should be removed once the `e2e` Allure family publish job is live.
