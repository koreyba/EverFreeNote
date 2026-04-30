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
- Aggregate local report: `allure-report`.

## Implementation Notes

### Web Component Tests

- `cypress.config.ts` registers `allureCypress(on, config, ...)` in the component `setupNodeEvents`.
- The code coverage task remains registered in the same hook.
- Environment metadata records OS, Node.js, and `test_type=web-component`.

### Local Commands

- `npm run test:component` runs Cypress component tests and now emits Allure results.
- `npm run allure:generate:component` generates the component HTML report from existing results.
- `npm run test:component:allure` runs component tests, then generates the component report.
- `npm run allure:generate` generates an aggregate report from `allure-results`.

## Integration Points

- Component CI can upload `allure-results/component` immediately after the test step.
- CI report generation can run even when tests fail if the step uses `if: always()`.
