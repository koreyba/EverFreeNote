# Unit Tests Migration Plan

## Summary

This document defines the target architecture for unit tests in the repository and the migration path from the current state to that target.

The goal is to make unit tests an owned, predictable, low-level layer:

- `core` owns shared domain unit tests
- `web` owns browser-specific unit tests
- `mobile` owns RN/Expo-specific unit tests
- Cypress component tests remain the higher-level web testing layer and do not replace unit tests

The repo should use one unit-testing philosophy and one runner family, with Jest as the standard across all unit-test layers.

## Why We Are Doing This

The current situation mixes responsibilities:

- web relies heavily on Cypress component tests, including some logic-heavy coverage
- mobile already has Jest tests, but part of them tests shared `core`
- shared `core` behavior is therefore partially owned by the mobile test project, which is the wrong long-term boundary

This creates several problems:

- shared logic does not have its own clear test owner
- web has no dedicated low-level unit-test layer for isolated logic
- mobile becomes the host for tests that are not actually mobile-specific
- CI and coverage reporting do not reflect architectural ownership

The desired result is a clean testing structure where each layer owns its own low-level tests and higher-level tests remain intentionally separate.

## Current CI Baseline

### What CI Runs Today

The current repository has three test-related GitHub Actions workflows:

- `unit-tests.yml`
- `component-tests.yml`
- `e2e-tests.yml`

Current behavior:

- `unit-tests.yml` installs root and mobile dependencies, then runs Jest only in `ui/mobile`
- `component-tests.yml` installs root dependencies and runs the root Cypress component suite
- `e2e-tests.yml` runs Playwright tests from the external `EverFreeNote-e2e` repository, not from this repository

Important trigger details:

- `unit-tests.yml` and `component-tests.yml` run on `pull_request`
- on `push`, they run only for `main`, `develop`, and `github-actions-setup`
- `e2e-tests.yml` runs on pull requests and manual dispatch, and depends on a preview deployment plus the external E2E repo

### What CI Does Not Run Today

CI does not currently run:

- a dedicated root `core` unit test project
- a dedicated root `web` unit test project

That is not a CI omission in the narrow sense; those projects do not exist yet. But it means shared `core` and isolated `web` unit ownership are still missing as first-class pipeline stages.

### Current Test Count Baseline

This baseline should be treated as the pre-migration reference point.

#### Mobile Jest baseline from CI

User-provided CI summary confirms that the current mobile Jest workflow executes:

- `37` test suites total
- `37` test suites passed
- `432` tests total
- `432` tests passed
- `0` failed
- `0` skipped

This is the authoritative current baseline for the mobile Jest suite and should be preserved or intentionally exceeded during migration.

#### Mobile Jest local execution from this worktree

The suite was also launched locally from this worktree, but only after bypassing the current path and matcher issues:

- direct `npm test` from the worktree failed to discover tests
- the root cause is the combination of Windows worktree path handling and the current Jest matcher behavior
- a temporary external Jest config using `testRegex` was required to run the suite from this worktree without modifying repository files

Local runnable baseline from the worktree:

- `37` test suites total
- `36` test suites passed
- `1` test suite failed
- `432` tests total
- `431` tests passed
- `1` test failed
- `0` skipped

Observed failing test during the local audit run:

- `tests/integration/searchScreen.test.tsx`
- failing case: `SearchScreen - Delete Functionality > Delete from search results > renders delete buttons for each search result`
- failure mode: Jest timeout after `5000 ms`

This means the suite is real and runnable from the worktree, but the current default launch path is not stable there. The migration work should preserve the CI baseline and should also leave local execution in a better state than it is today.

#### Mobile Jest local launch issue

Default local execution from this worktree still has a known discovery problem:

- `npm test -- --ci --verbose --json --outputFile=results.json` in `ui/mobile` reports `No tests found`

This points to an environment-sensitive mismatch in the current Jest file matching configuration. The most likely culprit is the current `testMatch` in `ui/mobile/jest.config.js`.

This issue does not change the migration target, but it should be documented and investigated separately so local verification is consistent with CI and with worktree-based development.

#### Cypress component baseline without execution

Per user request, the component suite was not executed locally because it is too slow for this audit pass.

Static repository baseline for the current root component suite:

- `95` Cypress component spec files under `cypress/component`
- `662` statically detected `it` / `specify` / `test` blocks across those spec files

These static counts are useful as a migration guardrail, but they are not equivalent to an executed CI total. If an exact runtime baseline for component tests is needed later, it should be taken from the `component-tests.yml` CI summary or from a dedicated audit run.

## Target Architecture

### Testing Layers

The repository should have the following automated testing layers:

- `unit-core`: shared domain logic from `core`
- `unit-web`: isolated browser/web logic from `ui/web`
- `unit-mobile`: RN/Expo-specific logic from `ui/mobile`
- Cypress component tests: composed web UI and browser behavior

This plan only covers the unit-test architecture. It does not replace existing Cypress component coverage or redefine mobile integration coverage.

### Runner Strategy

Use Jest everywhere for unit tests.

The architecture should be:

- root-level Jest setup for `unit-core` and `unit-web`
- existing mobile Jest setup remains in `ui/mobile`

This keeps one consistent unit-testing model while still respecting different runtime environments.

### Runtime Boundaries

#### `unit-core`

Purpose:

- test shared logic that remains meaningful even if both UI layers disappear

Environment:

- `node`

Allowed:

- `core/services`
- `core/utils`
- pure constants, transforms, domain helpers, adapter contracts

Forbidden:

- `react-native`
- Expo modules
- browser globals such as `window` or `document`
- imports from `@ui/mobile`
- imports from `@ui/web`

#### `unit-web`

Purpose:

- test isolated web-specific logic and browser-bound behavior

Environment:

- `jsdom`

Allowed:

- `ui/web/hooks`
- `ui/web/adapters`
- isolated web helpers
- React/DOM test helpers where needed

Not intended for:

- large composed UI behavior already validated by Cypress component tests
- full feature flow testing

#### `unit-mobile`

Purpose:

- test RN/Expo-specific logic and mobile-owned composition over shared code

Environment:

- `jest-expo`

Allowed:

- `ui/mobile` hooks, adapters, utilities, components
- mobile-specific code that uses shared `core`

This project remains separate because it requires RN/Expo mocks and setup that should not leak into `core` or `web`.

## Directory Strategy

The target directory layout should be:

- `core/tests/unit`
- `ui/web/tests/unit`
- `ui/mobile/tests/unit`

Supporting conventions:

- shared fixtures and builders for shared-domain logic should live under `core/tests`
- platform-specific setup helpers should remain local to their platform
- one test project must not depend on another project’s setup helpers

## Test Ownership Rules

Use these rules to decide where a unit test belongs:

### Put a test in `unit-core` when

- the subject under test lives in `core`
- the behavior is platform-agnostic
- the code should not depend on browser or mobile runtime

Examples:

- query builders
- search normalization
- sanitizer behavior
- offline queue/cache algorithms
- note service request/response shaping
- smart paste logic
- editor bridge chunking helpers

### Put a test in `unit-web` when

- the subject under test lives in `ui/web`
- the logic depends on browser APIs, jsdom, or web-specific hooks
- the test validates isolated state transitions or adapter behavior rather than fully composed UI behavior

Examples:

- AI search hooks
- browser persistence helpers
- web adapters
- extracted controller/helper logic from search flows

### Put a test in `unit-mobile` when

- the subject under test lives in `ui/mobile`
- the behavior is RN/Expo-specific
- mobile code composes shared `core`, but the owner is still mobile

Examples:

- local bundle resolution
- RN WebView helpers
- mobile-only utilities
- mobile hooks and component logic

### Keep behavior in Cypress component tests when

- the value comes from composed web UI
- the scenario depends on browser rendering, focus, hover, click-through composition, or provider wiring
- the test is closer to interaction regression than isolated unit behavior

## Current State Assessment

### What We Already Have

The repository currently has:

- a broad Cypress component suite at the root
- a mobile Jest project in `ui/mobile`
- no dedicated root unit-test project for shared `core`
- no dedicated web unit-test project for isolated `ui/web` logic

### What Existing Mobile Jest Tests Tell Us

The current mobile Jest suite is not hopelessly mixed. It is actually separable.

There are three practical categories:

#### Category A: pure shared-core tests that should move

These are currently located under `ui/mobile/tests/unit`, but they are logically `unit-core`:

- `core-services-notes-delete.test.ts`
- `core-services-offlineCache.test.ts`
- `core-services-offlineQueue.test.ts`
- `core-services-sanitizer.test.ts`
- `core-services-search.test.ts`
- `core-services-smartPaste.test.ts`
- `core-utils-normalize-html.test.ts`
- `core-utils-prosemirrorCaret.test.ts`
- `core-utils-search.test.ts`
- `editorWebViewBridge.test.ts`
- `search.test.ts`

These tests are the first migration batch because they already avoid mobile ownership in practice.

#### Category B: mobile-only unit tests that should stay

These remain in `unit-mobile`:

- `localBundle.test.ts`
- `ui-mobile-utils-htmlToPlainText.test.ts`

Also included by rule:

- mobile component tests
- mobile hook tests
- RN/Expo adapter tests

#### Category C: mixed mobile-plus-core tests that should still stay in mobile

Some tests use shared domain types or shared cache data but still test mobile-owned code.

Example:

- `noteCache.test.ts`

These should remain in mobile because the unit under test is not shared `core`; it is mobile behavior built on top of shared objects.

### Important Conclusion

The current test suite can be split by ownership.

There is no evidence that current mobile Jest tests are so cross-coupled with web that the repo must keep them in one mixed project.

The real issue is ownership and location, not impossibility of separation.

## Command and Config Target

The intended command surface should be standardized and documented before implementation:

- `npm run test:unit`
- `npm run test:unit:core`
- `npm run test:unit:web`
- optional root wrapper for mobile, such as `npm run test:unit:mobile`

Coverage should be reported separately for:

- `unit-core`
- `unit-web`
- `unit-mobile`

An aggregated summary can exist for reporting purposes, but ownership should remain separate.

The intended config split:

- root Jest config with projects for `unit-core` and `unit-web`
- `ui/mobile/jest.config.js` remains mobile-specific
- separate setup files per environment

No cross-platform global setup should be shared unless it is explicitly runtime-neutral.

## Coverage Expectations

### `unit-core`

The target baseline for shared-domain unit coverage includes:

- search/query building
- language detection and search normalization
- sanitizer logic
- smart paste behavior
- offline queue/cache algorithms
- note service request shaping
- result normalization
- pure bridge helpers

### `unit-web`

The target baseline for web unit coverage includes:

- AI search hook state transitions
- query identity and reset logic
- local persistence helpers
- browser adapters with mocks
- isolated web controllers/helpers extracted from large components where needed

### `unit-mobile`

The target baseline for mobile unit coverage includes:

- RN/Expo adapters
- local bundle logic
- mobile WebView helpers
- mobile hook logic
- mobile-only utility behavior

## Migration Roadmap

### Phase 1: Freeze the Canon

Publish this document as the source of truth for unit-test architecture.

Expected result:

- future test placement decisions stop being ad hoc
- all new unit tests follow the target ownership model even before full migration is complete

### Phase 2: Introduce Root Unit-Test Infrastructure

Add root-level Jest support for:

- `unit-core`
- `unit-web`

Keep `ui/mobile` unchanged at this stage.

Expected result:

- shared and web unit tests gain a proper home
- mobile remains stable while infrastructure is introduced

### Phase 3: Migrate the Pure Core Tests

Move the existing pure shared-core tests out of `ui/mobile/tests/unit` and into `core/tests/unit`.

Rules:

- preserve assertions and behavior
- change only location, setup, and imports needed for new ownership
- do not mix this step with broad refactors of implementation code

Expected result:

- `core` gains clear ownership of its unit tests
- mobile no longer hosts shared-core coverage

### Phase 4: Start Web Unit Coverage

Add the first dedicated `unit-web` suite for logic-heavy isolated web targets.

Priority areas:

- AI search hooks
- browser-bound search state helpers
- persistence and adapter logic
- extracted controller-style helpers from search flows

Expected result:

- Cypress is no longer the lowest test layer for web search behavior
- web gets a true low-level regression safety net

### Phase 5: Reclassify the Remaining Mobile Tests

Audit the remaining mobile Jest suite and explicitly mark what stays in mobile.

Keep in mobile:

- RN/Expo-specific tests
- mobile-composed tests using shared domain objects

Expected result:

- mobile keeps only tests it should own
- the split becomes stable and obvious to contributors

### Phase 6: CI and Reporting

Add CI execution and separate reporting for:

- `unit-core`
- `unit-web`
- `unit-mobile`

Expected result:

- failures point to the correct architectural owner
- coverage becomes interpretable by subsystem
- baseline counts can be compared against the pre-migration reference:
  - mobile Jest CI baseline: `37 suites / 432 tests`
  - mobile Jest local worktree audit: `37 suites / 432 tests`, with `1` timeout failure in `searchScreen.test.tsx`
  - component static baseline: `95 specs / 662 detected test blocks`

## Acceptance Criteria

This migration is successful when:

- shared `core` unit tests no longer live under mobile
- web has a dedicated isolated unit-test layer
- mobile owns only mobile-specific or mobile-composed unit behavior
- Cypress component tests remain the higher-level web layer, not the lowest one
- commands, configs, and ownership rules are documented and stable
- future contributors can decide test placement without inventing new rules

## Non-Goals

This plan does not aim to:

- replace Cypress component tests
- redesign mobile integration testing
- fully unify all test execution into a single runtime
- migrate every higher-level existing test immediately

## Defaults and Assumptions

- Jest is the unit-test runner standard across the repository
- mobile keeps its current `jest-expo` setup
- root Jest config will cover `core` and `web`
- migration should happen in batches, not as a single large rewrite
- this document is normative and should be used as the expected end state during future implementation work
