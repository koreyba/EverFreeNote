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
- Replace the existing GitHub Pages publication of standalone Playwright HTML reports with a Pages catalog of Allure reports.
- Keep GitHub Pages navigation convenient without collapsing every suite into one global report.

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
- GitHub Pages exposes one shared landing page for published Allure report families.
- Published reports are grouped into the report families `e2e`, `component`, and `unit`.
- The `unit` family combines core unit, core integration, web unit, and mobile unit results into one Allure report while preserving suite identity via labels.
- Report history is retained separately per report family and per scope (`PR`, `main`, `develop`, manual runs) instead of one global trend.
- The existing Playwright HTML Pages publication flow is removed after the Allure replacement is in place.

## Constraints & Assumptions

- Web component tests are Cypress component tests in this repository.
- Web E2E tests live in `koreyba/EverFreeNote-e2e` and need a separate repository change.
- Core and web unit tests share the root Jest multi-project config.
- Mobile tests use a separate `ui/mobile` package and package lock.
- Allure docs were checked through Context7 on 2026-04-30.
- GitHub Pages should preserve the current run URL pattern model of `PR/manual + run id + attempt`, even after the underlying report format changes.
- Allure history storage should be Git-friendly and workflow-safe for concurrent report families.
- Mainline history should be long-lived for `main` and `develop`, while PR history should stay isolated to each PR.

## Questions & Open Items

- E2E Allure artifacts are generated during `.github/workflows/e2e-tests.yml` in the `run-e2e` job, uploaded as a workflow artifact, then downloaded and republished by `publish-e2e-report` so the Pages catalog stays centralized in this repository.
- No cross-repository publish handoff is required beyond checking out the `koreyba/EverFreeNote-e2e` test repository for execution.
- Mobile component or future mobile integration suites are out of scope unless they join the `unit` family under the same labeling strategy.
