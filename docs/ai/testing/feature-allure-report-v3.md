---
phase: testing
title: Allure Report v3 Testing
description: Verification approach for Allure reporting
---

# Allure Report v3 Testing

## Test Coverage Goals

- Verify that adopted suites still execute through their existing commands.
- Verify that adopted suites produce Allure result files.
- Verify that Allure v3 can generate an HTML report from the result files.
- Verify that family publication jobs can generate Pages-ready Allure reports from raw uploaded results.
- Verify that history is preserved within one family across PR, branch, and manual runs, but not leaked across unrelated families.

## Test Reporting & Coverage

- Web component results directory: `allure-results/component`.
- Web component report directory: `allure-report/component`.
- Core unit results directory: `allure-results/core-unit`.
- Core unit report directory: `allure-report/core-unit`.
- Mobile unit results directory: `ui/mobile/allure-results/mobile-unit`.
- Mobile unit report directory: `ui/mobile/allure-report/mobile-unit`.
- Web unit results directory: `allure-results/web-unit`.
- Web unit report directory: `allure-report/web-unit`.
- Existing Cypress coverage and JUnit outputs remain separate from Allure outputs.
- Pages family report directories:
  `reports/e2e/...`, `reports/component/...`, `reports/unit/...`.
- Pages history files:
  `_history/<family>/history.jsonl`.

## Verification Commands

- `npm run type-check:tests`
- `npm run test:component -- --spec cypress/component/ui/Button.cy.tsx`
- `npm run allure:generate:component`
- `npm run test:unit:core -- --runTestsByPath core/tests/unit/core-utils-search.test.ts`
- `npm run allure:generate:core-unit`
- `npm --prefix ui/mobile test -- --runTestsByPath tests/unit/input.test.tsx`
- `npm --prefix ui/mobile run allure:generate`
- `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/lib/aiIndexNavigationState.test.ts`
- `npm run allure:generate:web-unit`
- `act -W .github/workflows/component-tests.yml`
- `act -W .github/workflows/unit-tests.yml`
- `act -W .github/workflows/e2e-tests.yml`

## Current Status

- [x] Root dependency installation completed.
- [x] Cypress component Allure adapter configured.
- [x] Core unit Allure Jest environment configured.
- [x] Type-check after configuration change.
- [x] Smoke component test with Allure result generation.
- [x] Allure report generation from smoke results.
- [x] ESLint ignores generated Allure reports.
- [x] Smoke core unit test with Allure result generation.
- [x] Core unit Allure report generation from smoke results.
- [x] Mobile unit Allure Jest environment configured.
- [x] Smoke mobile unit test with Allure result generation.
- [x] Mobile unit Allure report generation from smoke results.
- [x] Web unit Allure Jest environment configured.
- [x] Smoke web unit test with Allure result generation.
- [x] Web unit Allure report generation from smoke results.
- [x] Family-report architecture selected:
  separate `e2e`, `component`, and merged `unit`.

## Outstanding Gaps

- Component spec-level crashes can bypass `allure-cypress`, so CI now backfills a synthetic Allure failure from the captured Cypress log; this path still deserves a focused regression check on future Cypress upgrades.
- Trusted-event guards intentionally skip `gh-pages` publication for fork PRs and read-only bot PRs, so those runs keep artifacts in Actions without publishing Pages output.
