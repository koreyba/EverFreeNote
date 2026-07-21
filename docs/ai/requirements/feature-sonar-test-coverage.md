---
phase: requirements
title: Sonar Test Coverage Requirements
description: Make web, core, component, and mobile coverage deterministic and visible in SonarQube Cloud
---

# Sonar Test Coverage Requirements

## Problem Statement

Test coverage is currently visible only accidentally in the local SonarQube
instance. The npm Sonar scanner can discover a previously generated
`coverage/lcov.info`, so a local scan can publish stale or ambiguously sourced
data if generated artifacts are left in the workspace.
SonarQube Cloud uses Automatic Analysis, which cannot import LCOV reports.

Maintainers need a deterministic main-branch coverage baseline without adding
the cost of root Jest, Cypress, and mobile Jest coverage runs to every
pull-request update.

## Goals & Objectives

- Preserve automatic Sonar analysis of new code on every pull-request push,
  without running coverage tests in that path.
- After a merge to `main`, produce fresh root Jest, Cypress component, and
  mobile Jest LCOV reports before running the Sonar scanner.
- Keep all three reports independent and downloadable as separate CI artifacts.
- Import all reports into one main-branch Sonar analysis. Sonar's single
  project-level coverage measure is a derived union, not a sum or average of
  the producer percentages.
- Analyze the repository as one EverFreeNote product with multiple TypeScript
  configurations: root application/core, root tests, and mobile.
- Document why Semgrep remains independent from runtime test coverage.

### Non-goals

- Running coverage on every pull request.
- Making coverage a required pull-request quality gate.
- Adding scheduled or nightly coverage runs.
- Adding browser E2E or mobile E2E coverage to this feature.
- Creating separate SonarQube Cloud projects for each test layer.

## User Stories & Use Cases

- As a maintainer, I want fast Sonar feedback after every PR push so that the
  existing new-code review behavior remains available.
- As a maintainer, I want every merged `main` revision to publish fresh coverage
  so that the Sonar dashboard reflects the repository baseline.
- As a developer, I want separate root Jest, Cypress, and mobile Jest artifacts
  so that I can diagnose gaps in the appropriate product area and test layer.
- As a maintainer, I want a failed or missing coverage producer to prevent the
  main Sonar scan so that stale coverage is never uploaded.

## Success Criteria

- A PR event runs one SonarQube Cloud project scan without invoking any coverage
  command.
- A push to `main` runs root Jest, Cypress, and mobile Jest coverage in parallel
  and runs Sonar only after all three jobs succeed.
- Main-branch analysis imports `coverage/jest/lcov.info` and
  `coverage/component/lcov.info` plus `ui/mobile/coverage/lcov.info` explicitly.
- Each coverage directory is uploaded as a separate artifact with a finite
  retention period.
- A missing LCOV file fails its producer job.
- The workflow uses the existing public SonarQube Cloud project
  `koreyba_EverFreeNote` in organization `koreyba`.
- Semgrep configuration is not presented as a test-coverage integration.

## Constraints & Assumptions

- SonarQube Cloud Automatic Analysis and CI-based analysis cannot coexist for
  the same project. Automatic Analysis must be disabled before enabling the new
  workflow.
- GitHub must contain a `SONAR_TOKEN` repository secret.
- PR scans from forks and Dependabot cannot safely receive the repository
  secret and may therefore be skipped.
- The repository remains on a SonarQube Cloud plan that supports its existing
  public-project PR analysis.
- One Sonar project owns one PR Quality Gate. Multiple TSConfig files do not
  create separate Sonar projects.
- CI work is performed on clean GitHub-hosted runners, but report paths are
  still explicit to prevent accidental stale-report discovery.
- Local generated coverage artifacts are not managed by the test command; a
  developer removes them manually when an interrupted rerun must be isolated.

## Questions & Open Items

- After deployment, measure the duration and Actions usage of the main coverage
  workflow before considering further optimization.
- A coverage Quality Gate may be introduced later for main/new code after the
  baseline is stable; it is not part of this feature.
