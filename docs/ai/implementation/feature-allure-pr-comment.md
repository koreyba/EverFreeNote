---
phase: implementation
title: Allure PR Comment Implementation
description: Implementation notes for the final-only Allure PR comment workflow
---

# Allure PR Comment Implementation

## Development Setup

- No new package dependencies are required.
- The workflow uses the repository Node runtime already available on `ubuntu-latest`.

## Code Structure

- Comment rendering and GitHub API interaction live in a dedicated script under `scripts/`.
- Workflow orchestration lives in a new `.github/workflows` file and reuses the existing `gh-pages` fetch pattern.

## Implementation Notes

### Core Features

- The aggregator workflow listens to completed test workflow runs and only proceeds for pull request runs.
- The script reads `gh-pages/reports/index.json`, filters entries by `prNumber` and current PR head SHA, and selects the latest available report for each family.
- The script renders one durable markdown comment and upserts it by HTML marker.

### Patterns & Best Practices

- Keep workflow-level branching minimal and let the script own readiness checks and rendering.
- Treat missing reports as expected states in the comment body rather than workflow errors.
- Keep the comment shape future-friendly so a later PR readiness panel can add more sections without replacing the marker strategy.

## Integration Points

- GitHub REST API for pull request lookup, workflow-run lookup, issue comment list/create/update.
- `gh-pages` branch contents for `reports/index.json`.
- Existing family publish workflows remain untouched except as data producers.

## Error Handling

- The updater exits cleanly when the triggering run is stale or the workflow set is incomplete.
- Missing `reports/index.json` or missing family entries render fallback states instead of crashing when possible.
- GitHub API failures should fail the aggregator workflow so comment publication problems remain visible.

## Security Notes

- The new workflow needs `issues: write` to update PR comments and `actions: read` to inspect workflow completion state.
- Existing publish workflows do not gain new comment-write permissions.
