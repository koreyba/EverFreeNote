---
phase: planning
title: PR Status Comment Plan
description: Plan for the reusable PR status comment
---

# PR Status Comment Plan

## Milestones

- [x] Milestone 1: Define the generic PR status comment architecture.
- [x] Milestone 2: Replace the Allure-specific comment workflow with a generic updater script.
- [x] Milestone 3: Wire the updater into serialized Pages publish jobs.
- [x] Milestone 4: Verify rendering, validation, and branch-safe behavior.

## Task Breakdown

### Phase 1: Architecture

- [x] Task 1.1: Document why `workflow_run` is not sufficient for this PR branch.
- [x] Task 1.2: Select publish-job updates as the working model.
- [x] Task 1.3: Rename the feature from Allure-specific comment publishing to generic PR status comment publishing.

### Phase 2: Implementation

- [x] Task 2.1: Add `scripts/update-pr-status-comment.js`.
- [x] Task 2.2: Add local renderer tests.
- [x] Task 2.3: Remove the branch-local `workflow_run` aggregator.
- [x] Task 2.4: Add PR comment update steps to `unit`, `component`, and `e2e` publish jobs.

### Phase 3: Verification

- [x] Task 3.1: Run local unit tests for comment rendering.
- [x] Task 3.2: Run repository validation.
- [x] Task 3.3: Confirm the updater can create/update the PR comment through GitHub API after publish jobs.

## Risks & Mitigation

- Risk: comment updates happen before every family publishes.
  Mitigation: each update renders all known reports and the last serialized publish job produces the complete final state.
- Risk: future non-report checks need different data sources.
  Mitigation: keep the script generic and add data-provider sections incrementally.
- Risk: fork PRs lack write permissions.
  Mitigation: trusted publish guards already skip Pages/comment updates for those runs.
