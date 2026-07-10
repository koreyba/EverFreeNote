---
phase: deployment
title: Deployment & Infrastructure - Allure Unified Report
description: Deployment steps for unified Allure reporting.
---

# Deployment & Infrastructure

## Deployment Steps
- The deployment is fully handled by GitHub Actions when code is pushed to `main`/`develop` or when a PR is merged.
- Once merged, the new `.github/workflows/tests.yml` will replace the old workflows and automatically publish the unified reports to the `gh-pages` branch.
- The old `reports/unit`, `reports/component`, and `reports/e2e` directories will eventually be pruned as new runs update the reports index and history.
