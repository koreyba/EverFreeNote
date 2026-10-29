# Allure Agent Mode Guide for EverFreeNote

This guide describes how AI coding agents (Antigravity, Claude, Codex, Cursor, etc.) interact with test execution and reporting in EverFreeNote using **Allure Agent Mode** (`allure agent`).

## Overview

Allure Agent Mode turns test runs into structured, agent-readable reports (`index.md`, `manifest/`, `findings.jsonl`, `tests/`) that provide complete runtime evidence (steps, logs, assertions, retries, attachments) without having to scrape raw terminal output.

## Recommended Commands

### Live Test Runs
To run tests with intent and produce agent-readable reports:
- **Core Unit Tests**:
  ```bash
  npx allure agent --goal "Validate Core unit tests" -- npm run test:unit:core
  ```
- **Web Unit Tests**:
  ```bash
  npx allure agent --goal "Validate Web unit tests" -- npm run test:unit:web
  ```
- **Mobile Unit Tests**:
  ```bash
  npx allure agent --goal "Validate Mobile unit tests" -- npm --prefix ui/mobile test
  ```
- **Component Tests (Cypress)**:
  ```bash
  npx allure agent --goal "Validate Component tests" -- python3 scripts/run-component-ci-isolated.py -- npm run test:component:ci
  ```

  The component suite includes real authentication and row-level-security checks. This command starts a disposable local Supabase instance with the notes schema and RLS policies, supplies its synthetic credentials only to the test process, then stops its own instance and deletes its temporary data. It never uses Stage. Before starting Supabase it checks a credential-free container on a dedicated Docker bridge using the [Supabase-recommended loopback bind](https://supabase.com/docs/guides/local-development); afterwards it checks all running fixture containers' port mappings. The probe uses `alpine:3.22.1` (pulled if absent) and an automatically assigned port. Docker Engine 28 or newer is required: older engines have a known localhost publishing limitation. Docker Desktop additionally requires `lsof` to verify host listeners: its VM can expose a wildcard host port despite the bridge setting. If these checks fail, the runner stops without changing Docker settings. Set `COMPONENT_FIXTURE_API_PORT` if the default `63421` is occupied. For a focused run, replace the npm command with `npx cypress run --component --browser electron --spec path/to/spec.cy.tsx`; keep the fixture wrapper for specs that exercise authentication.

  When a local preview must remain responsive, set `COMPONENT_FIXTURE_MONITOR_URL` to its loopback HTTP URL. Two consecutive failed checks stop this test process and its disposable fixture.

### Inspecting Existing Results
To analyze existing `allure-results` (local or downloaded CI artifacts) without re-running tests:
```bash
npx allure agent inspect allure-results --output agent-output
```

### Triaging & Re-running Failed Tests
To re-run only the failing or flaky tests from the previous agent run:
```bash
npx allure agent --rerun-latest -- npm run test:unit:core
```

### Inspecting Latest Agent Output
To recover the latest agent output summary:
```bash
npx allure agent latest
```

## Agent Workflows & Best Practices
1. **Always read `index.md` or output summary** before attempting to fix failed tests.
2. **Do not weaken assertions** or delete tests to make a run pass.
3. **Use `--report off`** during rapid iterative debugging loops to save time, and `--report auto` or `--report awesome` for final verification.
