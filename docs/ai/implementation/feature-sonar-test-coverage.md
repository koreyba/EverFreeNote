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

- `.github/workflows/sonar.yml`: PR and main analysis orchestration.
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
- The workflow has five jobs: scanner-only PR analysis, three parallel main
  coverage producers, and one main scanner that requires all producers.
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

- Coverage producers fail if tests fail or their LCOV output is missing/empty.
- CI does not need a cleanup hook because each producer starts on a clean
  runner. Local interrupted Cypress runs may be cleaned manually by removing
  `.nyc_output` and `coverage/component` before rerunning coverage.
- Artifact download failure prevents the main scanner from publishing partial
  coverage.
- Scanner failures remain visible as the SonarCloud code-analysis check.

## Performance Considerations

- Coverage producers run concurrently.
- npm caching uses `package-lock.json`.
- PR scanning does not install dependencies or execute tests.

## Security Notes

- `SONAR_TOKEN` is read from GitHub Secrets and is never stored in the repo.
- Authenticated PR scans are restricted to branches in the same repository and
  exclude Dependabot.
- `pull_request_target` is not used, so untrusted code cannot execute with the
  Sonar secret.
