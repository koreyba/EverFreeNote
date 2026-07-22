---
phase: requirements
title: Requirements & Problem Understanding - TSConfig Architecture Setup
description: Define requirements for clean, modular TypeScript configuration across core, web, mobile, and test suites.
---

# Requirements & Problem Understanding - TSConfig Architecture Setup

## Problem Statement
**What problem are we solving?**
Currently, TypeScript configuration in EverFreeNote suffers from structural duplication, type scope contamination, and missing project boundaries:
1. **Type Scope Contamination:** `ui/mobile/tsconfig.json` includes `"types": ["jest"]`, polluting mobile production code with global Jest test types (`describe`, `it`, `expect`). `core/` has no dedicated `tsconfig.json`, forcing it to inherit Next.js web/DOM types.
2. **CI Workaround Duplication:** `ui/mobile/tsconfig.sonar.json` exists solely as a workaround for SonarQube CI running without `npm ci` (unable to resolve `expo/tsconfig.base`). This creates a split source-of-truth.
3. **Monolithic Test Config:** `tsconfig.tests.json` in the root aggregates core and web test paths without clear environment isolation.
4. **Incomplete CLI Verification:** `npm run type-check` only checks root `tsconfig.json`, ignoring `ui/mobile`, `core/tests`, and `ui/web/tests`.

## Goals & Objectives
**What do we want to achieve?**
- **Primary goals:**
  - Create a clean base configuration `tsconfig.base.json` with shared strict compiler flags.
  - Define clear modular `tsconfig.json` boundaries for `core`, `ui/web`, `ui/mobile`, and their respective `tests/` directories.
  - Isolate Jest and Node types exclusively to `tests/tsconfig.json` files.
  - Eliminate `ui/mobile/tsconfig.sonar.json` by updating `.github/workflows/sonar.yml` to install dependencies prior to scanning.
  - Ensure IDEs (VS Code / Visual Studio) and CLI commands (`npm run type-check`, `npm run validate`) accurately check 100% of codebase TypeScript files.
- **Non-goals:**
  - Reorganizing physical repository folder paths into formal `apps/` or `packages/` monorepo directories.
  - Modifying Supabase Deno Edge Functions (`supabase/functions/*/deno.json`), which operate in the Deno runtime ecosystem.

## User Stories & Use Cases
- **As a Developer working in VS Code / Visual Studio:**
  - When I open a file in `core/`, I want clean TS type checking without DOM or React Native interference.
  - When I open a production file in `ui/mobile/`, I do not want test functions (`describe`, `it`) auto-completed or allowed.
  - When I open a test file in `core/tests`, `ui/web/tests`, or `ui/mobile/tests`, all test framework types (`jest`, `@types/node`, `@testing-library/*`) should resolve cleanly without manual setup.
- **As a CI Pipeline / SonarQube Scanner:**
  - SonarQube uses the single canonical `ui/mobile/tsconfig.json` without failing or relying on separate workaround files.
- **As a Developer running `npm run type-check`:**
  - CLI type-checking runs across all project modules (`core`, `ui/web`, `ui/mobile`, tests) sequentially and reports any type error anywhere in the codebase.

## Success Criteria
- [ ] `tsconfig.base.json` created with base compiler options.
- [ ] `core/tsconfig.json` and `core/tests/tsconfig.json` created.
- [ ] `ui/web/tests/tsconfig.json` created.
- [ ] `ui/mobile/tsconfig.json` updated to remove `"types": ["jest"]`.
- [ ] `ui/mobile/tests/tsconfig.json` created for mobile tests.
- [ ] `ui/mobile/tsconfig.sonar.json` deleted and `sonar-project.properties` updated.
- [ ] `.github/workflows/sonar.yml` updated to run `npm ci` before Sonar scan.
- [ ] Root `package.json` `type-check` script updated to sequentially verify all TS configs.
- [ ] `npm run validate` passes cleanly with zero errors.

## Constraints & Assumptions
- Next.js and Expo bundlers (Turbopack/Webpack and Metro) must continue building cleanly without breaking their expected module resolution.
- Deno functions continue using `deno.json` and `deno check`.
