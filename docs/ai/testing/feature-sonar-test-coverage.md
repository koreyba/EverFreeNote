---
phase: testing
title: Sonar Test Coverage Testing Strategy
description: Validation strategy for deterministic coverage production and import
---

# Sonar Test Coverage Testing Strategy

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
  an earlier focused coverage run passed four tests.
- [x] NYC emits its independent component report under `coverage/component`.
- [x] Root Jest, Cypress, and mobile Jest outputs use separate directories.
- [x] Sonar analysis receives all three explicit paths only in the main job.
- [x] The dependency-free mobile Sonar TSConfig parses successfully.
- [x] PR workflow contains no coverage test command.

The full Cypress coverage suite was not completed locally: an earlier full run
was intentionally interrupted, and a later cold focused webpack build exceeded
the five-minute local command window. The main workflow intentionally has no
such application-level timeout and remains the authoritative full-suite check.

## End-to-End Tests

- [ ] First merged workflow publishes main coverage to SonarQube Cloud.
- [ ] A later PR push produces a Sonar new-code result without running coverage.
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
- Sonar main coverage: derived union of all three LCOV files.

## Manual Testing

- Disable Automatic Analysis in SonarQube Cloud.
- Add `SONAR_TOKEN` to GitHub repository secrets.
- Confirm the first main run reports all three LCOV files in scanner logs.
- Confirm the Sonar dashboard updates coverage for the analyzed main revision.

## Performance Testing

- Record total main workflow duration and individual producer durations after
  the first deployment run.
- No nightly benchmark is required.

## Local Validation Results

- `npm run type-check`: passed.
- `npm run type-check:tests`: passed.
- `npm --prefix ui/mobile run type-check`: passed.
- `npx eslint . --max-warnings=0`: passed.
- Sonar workflow YAML and five-job dependency structure: passed.
- `npx tsc -p ui/mobile/tsconfig.sonar.json --noEmit`: passed.
- `git diff --check`: passed apart from Git's informational LF/CRLF warnings.

The previous root coverage run discovered 53 suites and 488 tests while the
coverage command selected only `unit-core` and `unit-web`. The current command
also selects `integration-core`, intentionally adding its 2 suites and 20
tests; all 55 suites and 508 tests pass. This count is synchronized with
`feature-sonar-reliability.md`.

## Bug Tracking

- Missing or stale reports are release-blocking for this workflow.
- A scanner-only PR regression is treated as a behavior-preservation defect.
