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

- `unit-tests.yml` is split into three independent jobs:
  - `unit-tests-mobile`
  - `unit-tests-code`
  - `unit-tests-web`
- `component-tests.yml` installs root dependencies and runs the root Cypress component suite
- `e2e-tests.yml` runs Playwright tests from the external `EverFreeNote-e2e` repository, not from this repository

Important trigger details:

- `unit-tests.yml` and `component-tests.yml` run on `pull_request`
- on `push`, they run only for `main`, `develop`, and `github-actions-setup`
- `e2e-tests.yml` runs on pull requests and manual dispatch, and depends on a preview deployment plus the external E2E repo

### What CI Does Not Run Today

CI does not currently run:

- nothing is missing for the current Jest split between `mobile`, `code`, and `web`

The remaining CI gap is not about Jest ownership anymore. The remaining gap is only that Cypress component coverage and external E2E coverage still live in separate workflows, which is expected.

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

#### Post-restructuring verified local baseline

The repository has now been restructured and re-run locally from this worktree.

Existing Jest coverage was preserved exactly, but split by ownership:

- `unit-core`: `11` suites / `184` tests, all passed
- `integration-core`: `2` suites / `20` tests, all passed
- `unit-mobile`: `24` suites / `228` tests, all passed

Preserved existing total:

- `37` suites
- `432` tests

This confirms that the migration did not lose existing Jest coverage. It only moved ownership from the mobile project into dedicated root `core` projects.

#### Added tests after the preserved baseline

New dedicated web unit coverage has already been added on top of the preserved baseline:

- `unit-web`: `2` suites / `7` tests, all passed

Current total local Jest count after migration and new web coverage:

- `39` suites
- `439` tests

#### Worktree execution status

Local execution from this Windows worktree now works with the repository config.

Important fixes that made this reliable:

- `ui/mobile/jest.config.js` now uses `testRegex` instead of the path-sensitive `testMatch`
- the previously flaky `searchScreen.test.tsx` timeout was stabilized

This means the current local verification path is stable enough to act as a migration guardrail.

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
- `integration-core`: multi-service shared-domain flows from `core`
- `unit-web`: isolated browser/web logic from `ui/web`
- `unit-mobile`: RN/Expo-specific logic from `ui/mobile`
- Cypress component tests: composed web UI and browser behavior

This plan primarily covers the unit-test architecture. It also documents the small root-owned `integration-core` slice that was extracted from the old mobile Jest project because those tests are still clearly owned by `core`, not by mobile.

### Runner Strategy

Use Jest everywhere for unit tests.

The architecture should be:

- root-level Jest setup for `unit-core`, `integration-core`, and `unit-web`
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

#### `integration-core`

Purpose:

- test shared `core` workflows that span multiple shared services but still do not belong to a platform layer

Environment:

- `node`

Allowed:

- interactions across multiple `core/services`
- shared fixtures under `core/tests/fixtures`

Forbidden:

- RN/Expo runtime dependencies
- browser-only globals
- imports from platform test setup

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
- `core/tests/integration`
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
- a dedicated root `unit-core` project
- a dedicated root `integration-core` project
- a dedicated root `unit-web` project

### What Existing Mobile Jest Tests Told Us

The original mobile Jest suite was not hopelessly mixed. It proved to be separable.

There are three practical categories:

#### Category A: pure shared-core tests that were moved

These tests no longer live under `ui/mobile`. They were moved into root-owned `core` projects.

Moved into `core/tests/unit`:

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

Moved into `core/tests/integration`:

- `offlineSync.test.ts`
- `smartPaste.integration.test.ts`

These files are now owned by `core`, not by the mobile test project.

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

After the restructuring pass, the remaining files in `ui/mobile/tests` are mobile-owned or mixed mobile-plus-core tests. No pure shared-core Jest files remain there.

### Important Conclusion

The current test suite can be split by ownership, and the pure shared-core slice has already been separated out.

There is no evidence that current mobile Jest tests are so cross-coupled with web that the repo must keep them in one mixed project.

The real issue is ownership and location, not impossibility of separation.

## Command and Config Target

The intended command surface should be standardized and documented before implementation:

- `npm run test:unit`
- `npm run test:unit:core`
- `npm run test:integration:core`
- `npm run test:unit:web`
- optional root wrapper for mobile, such as `npm run test:unit:mobile`

Coverage should be reported separately for:

- `unit-core`
- `integration-core`
- `unit-web`
- `unit-mobile`

An aggregated summary can exist for reporting purposes, but ownership should remain separate.

The intended config split:

- root Jest config with projects for `unit-core`, `integration-core`, and `unit-web`
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
- `integration-core`
- `unit-web`

Keep `ui/mobile` unchanged at this stage.

Expected result:

- shared and web unit tests gain a proper home
- mobile remains stable while infrastructure is introduced

### Phase 3: Migrate the Pure Core Tests

Move the existing pure shared-core tests out of `ui/mobile/tests` and into root-owned `core` test directories.

Rules:

- preserve assertions and behavior
- change only location, setup, and imports needed for new ownership
- do not mix this step with broad refactors of implementation code

Expected result:

- `core` gains clear ownership of its unit tests
- mobile no longer hosts shared-core coverage
- pure shared-core integration tests also stop being hosted by mobile

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
  - preserved existing local baseline after restructuring: `37 suites / 432 tests`
  - current total after added web unit coverage: `39 suites / 439 tests`
  - component static baseline: `95 specs / 662 detected test blocks`

## Acceptance Criteria

This migration is successful when:

- shared `core` unit tests no longer live under mobile
- shared `core` integration tests no longer live under mobile
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
