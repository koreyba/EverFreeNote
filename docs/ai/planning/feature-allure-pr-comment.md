---
phase: planning
title: Allure PR Comment Plan
description: Plan for publishing final-only Allure report links into one PR comment
---

# Allure PR Comment Plan

## Milestones

- [x] Milestone 1: Document the final-only PR comment architecture and rollout plan.
- [x] Milestone 2: Implement a reusable renderer/updater script for the PR comment body.
- [x] Milestone 3: Add a `workflow_run` aggregator workflow that updates one PR comment after all relevant test workflows complete.
- [x] Milestone 4: Verify local script behavior and document workflow-run testing limits plus follow-up validation steps.

## Task Breakdown

### Phase 1: Documentation

- [x] Task 1.1: Capture requirements for a single durable PR comment that lists all Allure report families.
- [x] Task 1.2: Document the final-only architecture, trigger model, and data sources.
- [x] Task 1.3: Record rollout risks around stale SHAs, fork PR publication gaps, and `workflow_run` testing limits.

### Phase 2: Comment Rendering

- [x] Task 2.1: Add a local script that loads `gh-pages` report metadata and selects the latest report per family for the active PR head SHA.
- [x] Task 2.2: Render one markdown comment body with stable marker, report rows, catalog link, and workflow links.
- [x] Task 2.3: Add upsert logic so the bot updates one existing PR comment instead of posting duplicates.

### Phase 3: Workflow Integration

- [x] Task 3.1: Add a new aggregator workflow triggered by completed `Component Tests`, `Unit Tests`, and `E2E Tests (PR Preview)` runs.
- [x] Task 3.2: Gate the workflow so it exits for non-PR runs, stale SHAs, or incomplete workflow sets.
- [x] Task 3.3: Read `gh-pages` metadata, render the comment, and update the PR only once the full workflow set is complete.

### Phase 4: Verification & Reconciliation

- [x] Task 4.1: Run local validation for the new script and repository checks affected by the change.
- [x] Task 4.2: Update implementation and testing docs with the delivered behavior and known limitations.
- [x] Task 4.3: Reconcile this planning doc with completed work and note any remaining follow-up validation after merge.

## Dependencies

- The PR comment workflow depends on existing `gh-pages` publication and `reports/index.json` staying current.
- The aggregator workflow depends on the three test workflows keeping stable workflow names.
- End-to-end live validation of the `workflow_run` trigger depends on the workflow file existing on the default branch.

## Risks & Mitigation

- Risk: a stale workflow completion updates the comment for an older commit.
  Mitigation: compare the triggering workflow SHA against the current PR head SHA and exit on mismatch.
- Risk: one family does not publish a report even though its workflow completed.
  Mitigation: render explicit fallback states such as `Not published` instead of failing comment generation.
- Risk: comment logic becomes hard to extend later.
  Mitigation: keep rendering and upsert logic in a local Node script with a stable marker and simple data model.
- Risk: pre-merge verification of `workflow_run` is limited.
  Mitigation: keep the script locally testable and document the need for post-merge live validation.

## Resources Needed

- Existing Pages catalog metadata under `gh-pages/reports/index.json`.
- GitHub Actions `workflow_run` trigger and PR comment write permission.
- Local Node runtime already present in repository workflows.

## Progress Summary

The final-only PR comment flow is implemented with dedicated requirements, design, implementation, and testing docs; a reusable Node renderer; and a new `workflow_run` aggregator workflow that upserts one durable PR comment from `gh-pages` metadata once all three test workflows complete for the current PR head SHA. Local validation passed, while live end-to-end confirmation of the `workflow_run` trigger remains a post-merge check because GitHub only evaluates that trigger from workflows present on the default branch.
