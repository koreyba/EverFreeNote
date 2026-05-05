---
phase: design
title: Allure Reporting Architecture
description: Family-based publication architecture for Allure Pages reporting
---

# Allure Reporting Architecture

## Architectural Decisions

- GitHub Pages publishes report families instead of one global merged Allure report.
- The active families are `component`, `unit`, and `e2e`.
- Each family keeps its own history namespace and Pages path layout so unrelated runs do not pollute trend charts or retention behavior.

## Family-Based Publication Model

- `component` remains a single-suite family built from `allure-results/component`.
- `unit` is assembled from multiple artifact sources:
  `core-unit`, `core-integration`, `web-unit`, and `mobile-unit`.
- `e2e` is assembled from the downloaded `EverFreeNote-e2e` workflow artifact inside this repository's publish workflow.

## Rationale

- Family-level publication keeps navigation simple without collapsing every suite into one noisy report.
- `unit` is grouped from multiple sources because readers usually want one place for core, web, mobile, and integration regressions while still preserving suite identity via labels.
- Keeping `component`, `unit`, and `e2e` separate preserves useful history boundaries and avoids misleading cross-surface aggregation.

## History And Catalog Strategy

- `scripts/allure-pages-utils.js` selects history paths from family plus scope:
  PR-specific paths for pull requests, branch-specific paths for `main` and `develop`, and history-less manual runs for `workflow_dispatch`.
- `scripts/generate-allure-report-index.js` produces the shared Pages catalog as root `index.html` plus report metadata under `reports/index.json`.
- `scripts/prune-allure-pages.js` removes stale run directories and stale history files after catalog generation determines the retained set.

## Synthetic Failure Backfill

- Cypress component runs can crash at the spec level before `allure-cypress` writes a failing `*-result.json`.
- `scripts/backfill-cypress-spec-failures-to-allure.js` reads the captured Cypress runner log, detects crash-only failures that already-finished tests do not cover, and emits a synthetic `broken` Allure result.
- This backfill keeps published Allure output aligned with the failure signal that GitHub Actions and JUnit summaries already expose.
