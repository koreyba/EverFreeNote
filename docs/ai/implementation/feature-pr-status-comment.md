---
phase: implementation
title: PR Status Comment Implementation
description: Implementation notes for the reusable PR status comment
---

# PR Status Comment Implementation

## Code Structure

- `scripts/render-pr-status-comment.js` reads report metadata and renders the PR status body.
- `scripts/render-pr-status-comment.test.js` verifies report selection, generic comment rendering, and markdown/URL sanitization.
- The three Pages publish jobs render the body after `.pages-existing/reports/index.json` has been refreshed, then use `gh api` to update the marked bot-owned PR comment.

## Implementation Notes

- The renderer filters report metadata by PR number and current head SHA so stale reports do not appear in the comment.
- The comment uses `Not published yet` for missing report families.
- Existing publish jobs now request `issues: write` and `pull-requests: write` in addition to `contents: write`.
- The removed `workflow_run` workflow is intentionally not used because it cannot run from this PR until merged to the default branch.
- Update steps select an existing marker comment only when it is authored by `github-actions[bot]`; otherwise they create a new bot-owned comment.

## Security Notes

- The renderer requires `GITHUB_REPOSITORY`, PR number, and head SHA; it does not require a token.
- Network writes happen in workflow shell through `gh api` with `GH_TOKEN`.
- The workflow only writes issue comments and does not modify repository contents through the comment step.
