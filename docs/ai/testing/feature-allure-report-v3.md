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

## Outstanding Gaps

- Web E2E Allure requires changes in the external E2E repository.
- Component test CI and any optional cross-repository E2E aggregation remain planned follow-up work.
