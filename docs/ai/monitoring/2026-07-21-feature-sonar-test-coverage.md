---
phase: monitoring
title: Sonar Test Coverage Monitoring
description: Operational checks for main coverage and PR Sonar analysis
---

# Sonar Test Coverage Monitoring

## Key Metrics

### Performance Metrics

- Duration of root Jest, Cypress, mobile Jest, and final Sonar jobs.
- GitHub Actions consumption per merged main revision.

### Business Metrics

- Main coverage reported by SonarQube Cloud.
- Independent root Jest, Cypress, and mobile Jest percentages from artifacts.
- Coverage on new code is observed after merge; it is not a PR gate.

### Error Metrics

- Failed coverage producers.
- Missing or empty LCOV files.
- Failed artifact downloads.
- Sonar scanner authentication or duplicate-analysis errors.

## Monitoring Tools

- GitHub Actions job logs and summaries.
- GitHub Actions artifacts.
- SonarQube Cloud project dashboard and activity history.
- Semgrep remains a separate security dashboard.

## Logging Strategy

Coverage commands print text summaries. The scanner log must identify all three
explicit LCOV paths on main. Tokens and other secrets must never be printed.

## Alerts & Notifications

### Critical Alerts

- Main Sonar job fails after a merge: inspect failed producer/scanner and rerun
  after correction.
- Sonar reports no coverage after a successful workflow: verify LCOV import
  lines and analysis revision.

### Warning Alerts

- Material drop in main or new-code coverage: inspect independent artifacts to
  identify the responsible test layer.
- Significant increase in main workflow duration: inspect Cypress duration and
  dependency-cache hits.

## Dashboards

- SonarQube Cloud is the aggregate main-code view.
- Root Jest, Cypress, and mobile Jest HTML artifacts are the layer-specific
  diagnostic views.

## Incident Response

1. Confirm the workflow analyzed the expected commit.
2. Inspect all producer jobs and verify non-empty LCOV artifacts.
3. Inspect scanner logs for all imported paths.
4. Re-run the failed workflow when the failure is transient.
5. Roll back to Automatic Analysis only if static PR analysis must be restored
   urgently; coverage will be unavailable in that mode.

## Health Checks

- Every main analysis date matches a merged main commit.
- All three artifacts exist for every successful main Sonar run.
- A representative PR update receives a Sonar new-code result without coverage
  jobs.
