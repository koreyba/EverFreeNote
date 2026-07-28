---
phase: implementation
title: Sonar Test Coverage Implementation
description: Implementation notes for SonarQube Cloud coverage reporting
---

# Sonar Test Coverage Implementation

## Development Setup

- Node.js 24 and `npm ci` match the existing GitHub Actions workflows.
- A local scan may continue to use project key `EverFreeNote` and
  `http://localhost:9000` by passing both values as scanner overrides.
- Cloud deployment requires GitHub secret `SONAR_TOKEN` and disabled SonarQube
  Cloud Automatic Analysis.

## Code Structure

- `.github/workflows/pr-coverage-analysis.yml`: PR coverage and analysis
  orchestration, including progressive status-comment jobs.
- `.github/workflows/pr-status-comment.yml`: serialized reusable updater for
  the single PR status comment.
- `.github/workflows/allure-pr-publish.yml`: single-owner combined PR Allure
  publisher for artifacts from the current orchestration run.
- `.github/workflows/sonar-coverage.yml`: unchanged main-branch coverage and
  analysis orchestration.
- `jest.config.cjs`: Jest coverage scope and output directory.
- `ui/mobile/jest.config.js`: mobile coverage scope and output directory.
- `ui/mobile/tsconfig.sonar.json`: dependency-free mobile TypeScript program
  for scanner-only jobs.
- `package.json`: independent coverage commands and NYC report configuration.
- `sonar-project.properties`: static-analysis scope and test classification.

## Implementation Notes

- Mobile coverage runs in-band to avoid CPU-contention timeouts from Expo/Jest
  transforms on small CI runners.
- The mobile LCOV reporter uses the repository root as `projectRoot`, producing
  `SF:ui/mobile/...` paths that the root Sonar scan can resolve.
- Root and component coverage include `app`, `core`, and `ui/web`; mobile Jest
  owns `ui/mobile` while also recording imported shared-core modules.
- `useNoteAuth` accepts an explicit test configuration for component tests;
  production callers continue to use the environment-derived default. This
  keeps auth coverage deterministic and independent from GitHub Environments.
- PR uses the existing Unit and Component workflows as reusable coverage
  producers. Their `publish_allure` input is disabled for this call, so they
  only produce test artifacts. Separate status-comment jobs update the same PR
  comment as each producer finishes. `allure-pr-publish.yml` then downloads
  the current run's unit and component Allure artifacts and publishes one
  combined report. It exposes the published URL to a follow-up
  `pr-status-comment.yml` call; E2E publication uses the same serialized writer.
  SonarQube and Qodana use `always()` after both producers. Main keeps its three
  parallel coverage producers, existing Allure publishers, and dependent
  scanners unchanged.
- The combined Allure publisher installs dependencies with
  `npm ci --ignore-scripts`; it only needs the checked-in report tooling and
  must not execute arbitrary dependency lifecycle hooks. The progressive PR
  status updater calls the GitHub REST API directly with Node's `fetch` rather
  than passing values through a shell command. It accepts only validated status
  fields and trusted `koreyba.github.io/EverFreeNote` report URLs; report-index
  file contents never flow into an outbound request.
- Semgrep was left unchanged because it has no supported runtime LCOV ingestion
  path; its existing workflow remains an independent SAST signal.

## Integration Points

- SonarQube Cloud project: `koreyba_EverFreeNote`.
- SonarQube Cloud organization: `koreyba`.
- GitHub secret: `SONAR_TOKEN`.
- TypeScript programs: `tsconfig.json`, `tsconfig.tests.json`, and
  `ui/mobile/tsconfig.sonar.json`.
- Semgrep remains connected only through `.github/workflows/semgrep.yml`.

## Error Handling

- Coverage test jobs still report test failures. PR analyzer jobs use
  `always()` and fall back to analysis without coverage when no report artifact
  is available.
- The PR Allure publisher also uses `always()` at the caller boundary and
  downloads artifacts with `github.run_id`, so a producer failure cannot make
  the other producer's Allure results overwrite or hide the available report.
- CI does not need a cleanup hook because each producer starts on a clean
  runner. Local interrupted Cypress runs may be cleaned manually by removing
  `.nyc_output` and `coverage/component` before rerunning coverage.
- Main artifact download failure prevents the main scanner from publishing
  partial coverage. PR artifact download failure does not suppress analysis.
- Scanner failures remain visible as the SonarCloud code-analysis check.

## Performance Considerations

- Coverage producers run concurrently.
- npm caching uses `package-lock.json`.
- PR coverage producers install dependencies and execute tests; PR scan jobs
  only download artifacts and run their analyzers.

## Security Notes

- `SONAR_TOKEN` is read from GitHub Secrets and is never stored in the repo.
- Authenticated PR scans are restricted to branches in the same repository and
  exclude Dependabot.
- `pull_request_target` is not used, so untrusted code cannot execute with the
  Sonar secret.
- The Allure publisher does not persist checkout credentials and does not run
  dependency lifecycle scripts. The PR comment updater validates repository and
  pull-request identifiers before using the authenticated GitHub REST API.
- Every PR status mutation runs through the same PR-scoped concurrency group,
  so Unit, Component, combined Allure, and E2E updates cannot overwrite one
  another with stale state.
