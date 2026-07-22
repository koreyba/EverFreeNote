---
phase: implementation
title: Implementation Guide - TSConfig Architecture Setup
description: Technical implementation notes for modular TypeScript configurations and Sonar CI integration.
---

# Implementation Guide - TSConfig Architecture Setup

## Development Setup
- Project uses Node.js 24 and npm workspaces / modular package layout.
- TypeScript version: 5.9.x.

## Code Structure
- Base config: `tsconfig.base.json`
- Module configs:
  - Core: `core/tsconfig.json`, `core/tests/tsconfig.json`
  - Web: `tsconfig.json` (Next.js), `ui/web/tests/tsconfig.json`
  - Mobile: `ui/mobile/tsconfig.json` (Expo), `ui/mobile/tests/tsconfig.json`
- CI integration: `.github/workflows/sonar.yml`, `sonar-project.properties`

## Implementation Notes
1. `tsconfig.base.json`: Base strict options shared across all projects.
2. Core isolation: `@everfreenote/core` has its own tsconfig without DOM types.
3. Test type isolation: Jest types in `tests/tsconfig.json` only.
4. Sonar cleanup: Remove `ui/mobile/tsconfig.sonar.json` and run `npm ci` in Sonar workflow.
