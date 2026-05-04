---
phase: testing
title: Allure PR Comment Testing
description: Verification strategy for final-only Allure PR comment publication
---

# Allure PR Comment Testing

## Test Coverage Goals

- Verify the comment renderer selects the latest report per family for the active PR head SHA.
- Verify stale workflow SHAs do not update the PR comment.
- Verify missing family reports render as explicit fallback states instead of breaking the workflow.

## Integration Tests

- [ ] Render comment from synthetic `reports/index.json` data with all three families present.
- [ ] Render comment from synthetic `reports/index.json` data with one or more families missing.
- [ ] Verify readiness gating rejects incomplete workflow sets.
- [ ] Verify readiness gating rejects stale workflow completions for older SHAs.

## Test Reporting & Coverage

- Repository validation:
  `npm run validate`
- Script smoke verification:
  run the new PR comment updater script against fixture data or local synthetic metadata.
- Workflow validation:
  YAML review plus post-merge live validation, because `workflow_run` only executes when the workflow file exists on the default branch.

## Current Status

- [x] Added local renderer tests for latest-report selection and missing-report fallback rendering.
- [x] Ran `node --test scripts/render-allure-pr-comment.test.js`.
- [x] Ran `npm run validate`.
- [ ] Live `workflow_run` validation after merge to the default branch.

## Manual Testing

- After merge, open a PR from the main repository and confirm that the comment appears only after `Component Tests`, `Unit Tests`, and `E2E Tests (PR Preview)` all complete for the same head SHA.
- Confirm rerunning a single workflow on the same SHA updates the existing comment rather than posting a duplicate.
- Confirm a suite without a published report shows a readable fallback state.

## Outstanding Gaps

- Full end-to-end verification of the `workflow_run` trigger cannot be completed entirely from a feature branch before merge.
