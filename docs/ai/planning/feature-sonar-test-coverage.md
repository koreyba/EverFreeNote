---
phase: planning
title: Sonar Test Coverage Plan
description: Delivery plan for deterministic main coverage in SonarQube Cloud
---

# Sonar Test Coverage Plan

## Milestones

- [x] Milestone 1: Coverage producers emit independent deterministic LCOV files.
- [x] Milestone 2: GitHub Actions preserves fast PR analysis and is configured
  to publish main coverage.
- [ ] Milestone 3: Documentation, validation, and rollout guidance are complete.

## Task Breakdown

### Phase 1: Foundation

- [x] Task 1.1: Record event cadence, report semantics, and non-goals.
- [x] Task 1.2: Align Sonar source, test, and coverage scopes.
- [x] Task 1.3: Ensure component reporting emits
  `coverage/component/lcov.info` independently from Jest.
- [x] Task 1.4: Configure mobile Jest to emit an independent complete LCOV
  report under `ui/mobile/coverage`.

### Phase 2: Core Features

- [x] Task 2.1: Add a lightweight PR Sonar job without coverage commands.
- [x] Task 2.2: Add parallel root Jest, Cypress, and mobile Jest coverage jobs
  for pushes to `main`.
- [x] Task 2.3: Upload each report separately and make the main scanner depend on
  all three successful producers.
- [x] Task 2.4: Pass cloud project identity and all three LCOV paths explicitly.
- [x] Task 2.5: Analyze root, tests, and mobile with their respective TypeScript
  configurations in one Sonar project.

### Phase 3: Integration & Polish

- [x] Task 3.1: Document the SonarCloud Automatic Analysis migration sequence
  and required secret.
- [x] Task 3.2: Record the Semgrep capability decision.
- [ ] Task 3.3: Validate YAML, DevKit docs, lint, report generation, and scanner
  configuration without publishing an unrequested cloud analysis.
- [x] Task 3.4: Perform implementation conformance and code review.

The implementation validation is otherwise complete, with the Cypress
limitation recorded in the testing document. DevKit recognizes all seven
feature documents and the required branch-name check passes on
`feature-sonar-test-coverage`. Phase 3 remains incomplete only because the
deployment checks require GitHub Actions and SonarQube Cloud state.

## Dependencies

- Tasks 1.1-1.4 precede workflow implementation.
- All three coverage jobs must succeed before the main scanner job.
- SonarQube Cloud Automatic Analysis must be disabled and `SONAR_TOKEN` must be
  configured before the workflow is enabled remotely.

## Timeline & Estimates

- Configuration and documentation: one implementation session.
- Local verification: dominated by the full Jest, Cypress, and mobile coverage
  suites.
- Deployment verification: first merged `main` workflow after SonarCloud setup.

## Risks & Mitigation

- **Duplicate analysis:** disable Automatic Analysis before CI-based scans.
- **Stale LCOV:** use clean jobs, explicit artifact names, and existence checks.
- **Slow main feedback:** run producers in parallel and cache npm dependencies.
- **Fork secret exposure:** skip authenticated Sonar jobs for untrusted PR heads.
- **Misleading aggregate:** keep independent artifacts and document Sonar as a
  union metric.
- **Coverage regression after merge:** accept this intentionally; PR coverage
  enforcement is outside the approved operating model.

## Resources Needed

- SonarQube Cloud project administrator for the one-time analysis-method switch.
- GitHub repository administrator for the `SONAR_TOKEN` secret and, if needed,
  required-check migration.
- GitHub-hosted Ubuntu runners.
