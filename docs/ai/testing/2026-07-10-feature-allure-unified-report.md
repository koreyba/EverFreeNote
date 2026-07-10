---
phase: testing
title: Testing Strategy - Allure Unified Report
description: Define testing approach and validation details for unified Allure reports.
---

# Testing Strategy

## Test Coverage Goals
Since the changes are mostly in GitHub Actions YAML configurations and Node.js helper scripts:
- Validate that modified Node.js scripts compile and run locally without errors.
- Test the script output with dry-run/mock directories.
- Check the syntax of the consolidated workflow file.

## Test Cases

### 1. Script Execution with Simulated Inputs
- **Test Scenario**: Run `prepare-allure-family-report.js` with simulated input paths.
- **Expected Outcome**: The script runs successfully, merges directories, and writes `allurerc.cjs` with the custom `charts` configuration including `layers: ["unit", "component", "integration", "e2e"]`.

### 2. PR Comment Renderer Validation
- **Test Scenario**: Run `render-pr-status-comment.js` with a mock reports index file.
- **Expected Outcome**: The script correctly reads the reports index and outputs a markdown table containing only a single entry for the `allure` family.

### 3. GHA Workflow Syntax Validation
- **Test Scenario**: Validate the new workflow file using `action-validator` or dry-run.
- **Expected Outcome**: The YAML is valid and matches GHA schema.

## Manual Verification
After deploying to GitHub:
- Check that the GHA run creates a single unified Allure report.
- Verify that the Testing Pyramid widget contains 4 tiers.
- Check that the PR comment has a single link.

## Verification Results & Status

- **prepare-allure-family-report.js Execution**:
  - **Status**: PASSED
  - **Results**: Verified via local mock run. Config file generated successfully containing the reordered layers array: `["unit", "integration", "component", "e2e"]`. Subprocess spawn handles Windows environments correctly using `shell: true`.
- **render-pr-status-comment.js & Tests**:
  - **Status**: PASSED
  - **Results**: Refactored to render a clean PR status commenter dashboard with a single primary report link and a detailed workflow status grid. Automated unit tests inside `scripts/render-pr-status-comment.test.js` updated to verify the new signature, layout, escaping behavior, and URL security protocol filtering. All tests pass successfully.
- **Workflow YAML Security & Command Injection**:
  - **Status**: PASSED
  - **Results**: CodeQL template injection warnings fixed by passing step outputs as step-level environment variables in all three YAML files. Command execution in `download-other-workflow-artifacts.js` secured by migrating `execSync(commandString)` to `execFileSync("gh", argumentsArray)`.
- **Type Checking and Linting**:
  - **Status**: PASSED
  - **Results**: Project-wide `npm run eslint` and TypeScript `type-check` / `type-check:tests` compilation checks run locally and pass successfully with zero warnings/errors.
