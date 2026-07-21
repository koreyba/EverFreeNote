---
phase: deployment
title: Sonar Test Coverage Deployment
description: One-time migration from Automatic Analysis to GitHub Actions
---

# Sonar Test Coverage Deployment

## Infrastructure

- GitHub Actions runs the scanner and coverage producers.
- SonarQube Cloud stores static-analysis and main coverage measures.
- GitHub Actions artifacts store independent root Jest, Cypress, and mobile Jest
  reports for 14 days.

## Deployment Pipeline

### Build Process

- PR: checkout full Git history and run only the Sonar scanner.
- Main: run root Jest, Cypress, and mobile Jest coverage in parallel, transfer
  all reports to a final job, then run the scanner.

### CI/CD Pipeline

The dedicated `.github/workflows/sonar.yml` does not replace the existing
application `.github/workflows/build.yml`.

## Environment Configuration

### Development

Local SonarQube keeps project key `EverFreeNote` through a scanner command-line
override. Local reports must be generated before a local scan.

### Production

- SonarQube Cloud project: `koreyba_EverFreeNote`.
- Organization: `koreyba`.
- GitHub secret: `SONAR_TOKEN`.

## Deployment Steps

1. Ensure `SONAR_TOKEN` exists in GitHub repository secrets.
2. Immediately before pushing/enabling this workflow, open SonarQube Cloud
   `Administration > Analysis Method` and disable Automatic Analysis. Do not
   leave both analysis methods active for the same commit.
3. Push the workflow branch or update its PR and confirm the scanner-only PR
   check behaves like the previous automatic check.
4. Merge to `main` and confirm the resulting workflow imports all three LCOV
   files before publishing the main analysis.
5. Confirm the analyzed revision in SonarQube Cloud matches the merged commit.
6. Update branch protection if the required-check identity changed from the
   SonarQube Cloud GitHub App check to the GitHub Actions job.

## Database Migrations

None.

## Secrets Management

`SONAR_TOKEN` is stored only in GitHub Secrets. Rotate it in SonarQube Cloud and
replace the GitHub secret if it is exposed or its owner changes.

## Rollback Plan

1. Disable the GitHub Actions Sonar workflow.
2. Re-enable Automatic Analysis in SonarQube Cloud.
3. Accept that coverage will no longer be imported while Automatic Analysis is
   active.
