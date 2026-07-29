---
phase: testing
title: Sonar and Qodana Analysis and Coverage Testing Strategy
description: Validation strategy for deterministic coverage production and import
---

# Sonar and Qodana Analysis and Coverage Testing Strategy

## Test Coverage Goals

This is CI infrastructure. Validation targets report correctness, event routing,
failure behavior, and compatibility with existing tests rather than adding
application test cases.

## Unit Tests

- [x] Full Jest coverage command succeeds with root unit and integration
  projects: 55 suites and 508 tests.
- [x] Jest emits a non-empty `coverage/jest/lcov.info` covering `app`, `core`,
  and `ui/web`.
- [x] Existing unit test suites remain green.
- [x] Full mobile Jest coverage command succeeds in-band: 44 suites and 390
  tests.
- [x] Mobile Jest emits a non-empty `ui/mobile/coverage/lcov.info` with
  repository-relative `SF:ui/mobile/...` paths.

## Integration Tests

- [x] Cypress coverage instrumentation runs in its dedicated Babel environment;
  the focused auth/controller coverage run passed 26 tests (7 auth and 19
  controller tests).
- [x] Auth-hook component tests use explicit fixture configuration instead of
  Stage or Production environment variables; controller tests do not exercise
  deployment-gated login handlers.
- [x] NYC emits its independent component report under `coverage/component`.
- [x] Root Jest, Cypress, and mobile Jest outputs use separate directories.
- [x] PR coverage orchestration calls the existing Unit and Component
  workflows with coverage enabled.
- [x] PR coverage orchestration updates one PR status comment after each
  producer finishes, then runs one combined publisher against current-run Unit
  and Component Allure artifacts.
- [x] Unit, Component, combined Allure, and E2E updates use one PR-scoped
  serialized writer and preserve statuses written by earlier suites.
- [x] The network updater accepts a validated published URL and does not read
  `reports/index.json`, preventing report file data from entering the outbound
  GitHub API request.
- [x] PR Sonar and Qodana analysis jobs depend on both coverage workflows and
  use `always()` so test failures do not suppress analysis.
- [x] Main and PR Codacy jobs depend only on their coverage producers, so
  analyzer failures do not suppress a valid Codacy upload.
- [x] Sonar main analysis receives all three explicit paths only in the main
  coverage workflow.
- [x] Qodana receives one merged LCOV built from all three raw Istanbul maps.
- [x] Qodana merge normalizes Windows absolute paths and deduplicates shared
  files before writing `.qodana/code-coverage/lcov.info`.
- [x] The PR coverage workflow runs on `opened`, `synchronize`, and `reopened`
  and keeps Sonar/Qodana restricted to trusted PRs targeting `main`.
- [x] The dependency-free mobile Sonar TSConfig parses successfully.
- [x] Qodana remains a separate reusable analysis workflow and receives the
  merged PR coverage artifact.
- [x] Component JUnit totals are read once from each top-level `testsuites`
  element; nested Mocha suites do not inflate test counts.
- [x] Component Allure reconciliation covers dash-form zero counts, wrapped
  spec paths, project-prefixed failure deduplication, active-spec hard crashes,
  runner startup failures, nested JUnit suites, retry report deduplication,
  workspace path validation, the external GitHub step-summary command file,
  bounded traces, UUID consistency, idempotency, and summary HTML encoding.
- [x] Captured artifacts from run `30394192034` reconcile to 674 component
  results: 673 passed and one broken `ThemeToggle` spec with the original
  `ChunkLoadError`.

The full Cypress coverage suite was not completed locally: an earlier full run
was intentionally interrupted, and a later cold focused webpack build exceeded
the five-minute local command window. The main workflow intentionally has no
such application-level timeout and remains the authoritative full-suite check.

## End-to-End Tests

- [ ] First merged `merge-tests-coverage.yml` workflow publishes main coverage to
  SonarQube Cloud and Qodana Cloud from the same producer artifacts.
- [ ] First merged `merge-tests-coverage.yml` workflow publishes main coverage to
  Codacy from the same producer artifacts.
- [ ] A later PR push produces a Sonar new-code result without running coverage.
- [ ] A later PR push starts Qodana analysis without running coverage.
- [ ] A later trusted PR push publishes its four LCOV reports to Codacy.
- [ ] SonarQube Cloud PR decoration/check naming is compatible with branch
  protection.

These deployment checks require repository secrets and SonarQube Cloud state and
cannot be completed solely in the local checkout.

## Test Data

- Existing root Jest, Cypress component, and mobile Jest tests are the coverage
  input.
- No production data or external test accounts are required.

## Test Reporting & Coverage

- Jest command: `npm run test:unit:coverage`.
- Cypress commands: `npm run test:component:coverage` followed by
  `npm run coverage:component`.
- Mobile command: `npm --prefix ui/mobile run test:coverage`.
- CI artifacts: root Jest, Cypress component, and mobile Jest reports retained
  independently for 14 days.
- Sonar PR coverage: derived union of available PR Jest and Cypress LCOV files.
- Qodana PR coverage: available PR raw Istanbul maps converted to one LCOV
  report by `scripts/merge-coverage.cjs`.
- Sonar main coverage: derived union of all three LCOV files.
- Qodana main coverage: derived union of all three Istanbul JSON files,
  converted to one LCOV report by `scripts/merge-coverage.cjs`.
- Codacy main coverage: root Jest, Cypress component, and mobile Jest LCOV
  reports uploaded directly by the main orchestrator.
- Codacy PR coverage: core Jest, web Jest, mobile Jest, and Cypress component
  LCOV reports uploaded directly by the PR orchestrator.

## Manual Testing

- Disable Automatic Analysis in SonarQube Cloud.
- Add `SONAR_TOKEN` to GitHub repository secrets.
- Confirm the first main run reports all three LCOV files in scanner logs.
- Confirm the first main run has a successful `Codacy main coverage` job and the
  Codacy dashboard updates the analyzed main revision.
- Confirm the Sonar dashboard updates coverage for the analyzed main revision.
- Add `QODANA_TOKEN` to GitHub repository secrets.
- Confirm a PR update runs coverage before Sonar/Qodana, and that both analyses
  still start when a coverage test job fails.
- Confirm the PR Allure report contains Core Unit, Core Integration, Web Unit,
  Mobile Unit, and Web Component results from the same orchestration run.
- Confirm the PR status comment is created or updated after Unit Tests finish,
  again after Component Tests finish, and finally contains the combined Allure
  report link.
- Confirm a completed E2E publisher preserves the Unit and Component statuses
  while updating the E2E row and final Allure link.
- Confirm the Qodana main job consumes the same artifacts as Sonar and displays
  coverage for the merged main revision.
- Confirm the trusted PR Codacy job uploads coverage using the PR head SHA, and
  that fork or Dependabot PRs skip the upload job.

## Performance Testing

- Record total main workflow duration and individual producer durations after
  the first deployment run.
- No nightly benchmark is required.

## Local Validation Results

- `npm run type-check`: passed.
- `npm run type-check:tests`: passed.
- `npm --prefix ui/mobile run type-check`: passed.
- `npx eslint . --max-warnings=0`: passed.
- The feature documentation lint passed.
- All workflow YAML files parse successfully, and the PR reusable-workflow
  dependency structure passed the targeted static check.
- The focused PR status-comment regression suite passes 6 tests after the
  Sonar/Qodana remediation, and targeted ESLint reports zero warnings.
- The component reconciliation regression suite passes 10 tests; all root
  script tests pass 16 tests.
- Allure inspection of the captured component artifacts models all 674 logical
  results and matches the expected broken
  `providers/ThemeToggle.cy.tsx#spec crash` result.
- `npx tsc -p ui/mobile/tsconfig.sonar.json --noEmit`: passed.
- `git diff --check`: passed apart from Git's informational LF/CRLF warnings.
- No production TypeScript files were changed in this workflow-only task.

The previous root coverage run discovered 53 suites and 488 tests while the
coverage command selected only `unit-core` and `unit-web`. The current command
also selects `integration-core`, intentionally adding its 2 suites and 20
tests; all 55 suites and 508 tests pass. This count is synchronized with
`feature-sonar-reliability.md`.

## Bug Tracking

- Missing or stale reports are release-blocking for this workflow.
- Missing raw Cypress coverage is release-blocking for the main Qodana merge
  job; PR analysis falls back to running without coverage when artifacts are
  unavailable.
- A PR coverage or analyzer-ordering regression is treated as a
  behavior-preservation defect.
