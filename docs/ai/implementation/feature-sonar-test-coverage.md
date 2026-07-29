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
- `.github/workflows/merge-tests-coverage.yml`: main-branch coverage,
  Codacy upload, and analysis orchestration.
- `.github/workflows/pr-coverage-analysis.yml`: PR coverage, Codacy upload, and
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
- Component result reconciliation uses Cypress exit status for job gating,
  top-level JUnit `testsuites` totals for completed test counts, and the
  Allure Cypress output for test-level presentation. `fast-xml-parser` reads
  the JUnit reports. Console summary parsing is only a fallback because Cypress
  wraps long spec paths at terminal width. If Cypress exits before JUnit is
  written, the last active spec or the runner itself receives one synthetic
  broken Allure result. Existing project-prefixed Allure package/full-name
  identifiers prevent duplicate synthetic failures. Retry JUnit files are
  deduplicated by spec using the latest file, synthetic result filenames reuse
  their payload UUID, and stored traces are limited to 500 lines.
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
- GitHub secret: `CODACY_API_TOKEN`.
- Codacy project identity: provider `gh`, username `koreyba`, project
  `EverFreeNote`.
- Codacy Coverage Reporter version: `14.1.3`.
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
- The component workflow builds its GitHub summary and Allure backfill from the
  same parsed JUnit model. Nested Mocha suites are not added to the top-level
  totals, and a failed Cypress process cannot publish a green component Allure
  artifact merely because the adapter stopped before persisting a test result.
  All CLI-provided report paths must remain inside the current workspace,
  including through existing symlink ancestors.
- CI does not need a cleanup hook because each producer starts on a clean
  runner. Local interrupted Cypress runs may be cleaned manually by removing
  `.nyc_output` and `coverage/component` before rerunning coverage.
- Main artifact download failure prevents the main scanner from publishing
  partial coverage. PR artifact download failure does not suppress analysis.
- Scanner failures remain visible as the SonarCloud code-analysis check.
- Codacy upload is skipped when a required coverage producer fails, preventing
  partial reports from replacing a complete commit or pull-request report.
- Codacy runs as a sibling job of Sonar and Qodana in each orchestrator. Its
  `needs` reference only coverage producers, so an analyzer failure does not
  suppress a valid Codacy upload.
- Codacy jobs do not checkout or execute the PR repository. They download only
  coverage artifacts, restrict PR uploads to same-repository PRs, and pass the
  checked-in commit SHA to the pinned reporter binary.

## Performance Considerations

- Coverage producers run concurrently.
- npm caching uses `package-lock.json`.
- PR coverage producers install dependencies and execute tests; PR scan jobs
  only download artifacts and run their analyzers.

## Security Notes

- `SONAR_TOKEN` is read from GitHub Secrets and is never stored in the repo.
- `CODACY_API_TOKEN` is read only in the upload step and is never stored in the
  repo or written to workflow output.
- The reporter binary and its SHA-512 manifest are downloaded without secrets,
  verified before execution, and run from the runner temporary directory.
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
- The combined Allure publisher authenticates its clean GitHub remote through
  the GitHub CLI credential helper; credentials are never embedded in the
  remote URL. PR status rendering separates state normalization, report
  selection, and row formatting so scanner-driven maintainability fixes do not
  change the comment contract.
