---
phase: requirements
title: Allure Report v3 Requirements
description: Add Allure Report v3 across project test suites incrementally
---

# Allure Report v3 Requirements

## Problem Statement

The project has several independent test surfaces, but reporting is split between Cypress/JUnit, Playwright HTML/JSON in the external E2E repository, and Jest JSON summaries. This makes it harder to compare failures across web, core, and mobile test suites from one reporting format.

## Goals & Objectives

- Add Allure Report v3 as the shared reporting layer for automated tests.
- Roll out the integration incrementally by test-suite priority.
- Preserve existing test commands, JSON/JUnit outputs, coverage outputs, and CI summaries.
- Keep generated Allure result and report directories out of git.

## Priority Order

1. Web component tests.
2. Web E2E tests.
3. Core unit tests.
4. Mobile unit tests.
5. Web unit tests.

## Success Criteria

- Each adopted suite writes Allure result files to a suite-specific directory under `allure-results`.
- Allure Report v3 can generate HTML reports from those results with npm scripts.
- CI can upload Allure result/report artifacts without replacing existing summary artifacts.
- The plan documents pending suites and ownership boundaries.

## Constraints & Assumptions

- Web component tests are Cypress component tests in this repository.
- Web E2E tests live in `koreyba/EverFreeNote-e2e` and need a separate repository change.
- Core and web unit tests share the root Jest multi-project config.
- Mobile tests use a separate `ui/mobile` package and package lock.
- Allure docs were checked through Context7 on 2026-04-30.

## Questions & Open Items

- Decide whether E2E Allure artifacts should be generated in the external E2E repo only, or downloaded and republished by this repo's workflow.
- Decide whether mobile component/integration Jest tests should be grouped with mobile unit reporting or handled as separate Allure suites.
