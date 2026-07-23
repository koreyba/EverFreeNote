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
  npx allure agent --goal "Validate Component tests" -- npm run test:component
  ```

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
