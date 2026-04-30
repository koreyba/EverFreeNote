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
- Existing Cypress coverage and JUnit outputs remain separate from Allure outputs.

## Verification Commands

- `npm run type-check:tests`
- `npm run test:component -- --spec cypress/component/ui/Button.cy.tsx`
- `npm run allure:generate:component`

## Current Status

- [x] Root dependency installation completed.
- [x] Cypress component Allure adapter configured.
- [x] Type-check after configuration change.
- [x] Smoke component test with Allure result generation.
- [x] Allure report generation from smoke results.
- [x] ESLint ignores generated Allure reports.

## Outstanding Gaps

- Web E2E Allure requires changes in the external E2E repository.
- Core unit, mobile unit, and web unit Allure adoption remains planned for later increments.
