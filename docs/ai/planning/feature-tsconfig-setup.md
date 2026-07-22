---
phase: planning
title: Project Planning & Task Breakdown - TSConfig Architecture Setup
description: Task breakdown, implementation plan, and verification steps for TypeScript configuration refactoring.
---

# Project Planning & Task Breakdown - TSConfig Architecture Setup

## Milestones
- [x] Milestone 1: Create base configuration and modular project tsconfigs (`core`, `web tests`, `mobile tests`)
- [x] Milestone 2: Clean up Sonar workaround and align CI workflow
- [x] Milestone 3: Update root CLI scripts (`type-check`, `validate`) and verify full type-check pass

## Task Breakdown

### Phase 1: Base Configuration & Core Scope
- [x] Task 1.1: Create `tsconfig.base.json` at root with shared strict compiler flags.
- [x] Task 1.2: Refactor root `tsconfig.json` to extend `tsconfig.base.json`.
- [x] Task 1.3: Create `core/tsconfig.json` for platform-agnostic core library code.
- [x] Task 1.4: Create `core/tests/tsconfig.json` for Jest core unit and integration tests.

### Phase 2: Web & Mobile Scope
- [x] Task 2.1: Create `ui/web/tests/tsconfig.json` for Web Jest tests.
- [x] Task 2.2: Refactor `ui/mobile/tsconfig.json` to remove `"types": ["jest"]` and exclude `tests/`.
- [x] Task 2.3: Create `ui/mobile/tests/tsconfig.json` for Mobile Jest tests.
- [x] Task 2.4: Remove legacy root `tsconfig.tests.json`.

### Phase 3: Sonar & CI Cleanup
- [x] Task 3.1: Remove `ui/mobile/tsconfig.sonar.json`.
- [x] Task 3.2: Update `sonar-project.properties` to list canonical tsconfig paths.
- [x] Task 3.3: Update `.github/workflows/sonar.yml` to install dependencies before Sonar scan.

### Phase 4: CLI Scripts & Verification
- [x] Task 4.1: Update `type-check` script in root `package.json` to run sequential checks across all tsconfigs.
- [x] Task 4.2: Execute `npm run type-check` and `npm run validate` to confirm zero type errors across the entire codebase.

## Dependencies
- Phase 1 must precede Phase 2 (base config is required for inheritance).
- Phase 2 must precede Phase 3 & 4 (canonical tsconfig paths must exist before updating Sonar & CLI scripts).

## Risks & Mitigation
- **Risk:** Missing path alias resolutions in sub-configs causing IDE/tsc errors.
  - *Mitigation:* Explicitly verify `@core/*`, `@ui/web/*`, `@ui/mobile/*`, `@/*` in each module config.
- **Risk:** Sonar CI job failing due to missing Expo base config.
  - *Mitigation:* Ensure `npm --prefix ui/mobile ci --ignore-scripts` is executed in the Sonar workflow step.
