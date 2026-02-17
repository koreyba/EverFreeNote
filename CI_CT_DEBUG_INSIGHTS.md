# CI Component Tests Debug Insights
_Last updated: 2026-02-17_

## Final Verdict
- Root cause: flaky race in Cypress Component Testing with `justInTimeCompile: true` on GitHub Actions.
- Manifestation: random specs with real tests occasionally end with empty Mocha graph and `cypress:server:project received runnables null`, then `Tests: 0`.
- Confirmation: after switching to `component.justInTimeCompile: false`, focused debug reruns stopped reproducing the issue.

## Verified Evidence
- Failing specs: compile/network were OK, but right before finish there was `received runnables null` and `0 passing`.
- Passing specs: `received runnables { ... }` was present.
- `normalizeAll(...)` path in Cypress returns empty/undefined when suite has no tests at normalization time.
- This points to runner lifecycle/spec registration timing, not to missing files or transport failure.
- Focused run after fix: `zero-tests = 0`, `received runnables null = 0`, `received runnables { = 10`.
- Second rerun after fix: passed (user-confirmed).

## Permanent Fix (Mandatory)
- File: `cypress.config.ts`
- Setting: `component.justInTimeCompile: false`
- Why mandatory for this project:
  - with JIT enabled, CI had intermittent spec-registration race that produced empty runnables (`Tests: 0`),
  - with JIT disabled, spec build/registration became deterministic and the flaky zero-tests symptom disappeared.

## Hypotheses Log
_Statuses: `confirmed` | `rejected`_

- `rejected` H-001: invalid/empty spec files.
- `rejected` H-002: global `uncaught:exception` suppression hides failures.
- `rejected` H-003: `Invalid Host/Origin` reconnect path is primary cause.
- `confirmed` H-004: failure is on registration/runner side after compile, before runnable normalization.
- `confirmed` H-005: issue occurs between `before:spec` and runnable creation.
- `confirmed` H-006: key runtime marker is `received runnables null`.
- `confirmed` H-007: upstream state before `normalizeAll` is empty suite.
- `rejected` H-008: dominant cause is top-level import crash in spec.
- `rejected` H-009: dominant cause is post-registration suite wipe/filtering.
- `confirmed` H-010: socket disconnect/error is not primary trigger in observed failures.
- `confirmed` H-011: part of browser-probe instrumentation was non-deterministic in runMode logs.
- `confirmed` H-012: summary parser could hide `received runnables null` lines.
- `confirmed` H-013: ANSI coloring could break naive marker grep counts.
- `rejected` H-014: hidden `results` payload carried a meaningful top-level test error for zero-tests cases.
- `confirmed` H-015: `justInTimeCompile` race hypothesis; disabling JIT removed flaky zero-tests in reruns.

## Cleanup After Debug
- Removed temporary CI marker-analysis step and focused `CT_DEBUG_SPEC_LIST` mode.
- Removed temporary server/browser probe logs (`ct-runnables-debug`).
- Removed temporary zero-tests meta dumping from Cypress node events.
- Kept only the permanent `justInTimeCompile: false` fix plus explanatory comment.
