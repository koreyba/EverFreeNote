---
phase: implementation
title: PR Status Comment Implementation
description: Implementation notes for the reusable PR status comment
---

# PR Status Comment Implementation

## Code Structure

- `scripts/update-pr-status-comment.js` reads report metadata, renders the PR status body, and upserts the marked PR comment through GitHub REST API.
- `scripts/update-pr-status-comment.test.js` verifies report selection and generic comment rendering.
- The three Pages publish jobs call the updater after `.pages-existing/reports/index.json` has been refreshed.

## Implementation Notes

- The updater filters report metadata by PR number and current head SHA so stale reports do not appear in the comment.
- The comment uses `Not published yet` for missing report families.
- Existing publish jobs now request `issues: write` in addition to `contents: write`.
- The removed `workflow_run` workflow is intentionally not used because it cannot run from this PR until merged to the default branch.

## Security Notes

- The script requires `GITHUB_TOKEN`, `GITHUB_REPOSITORY`, PR number, and head SHA.
- It only writes issue comments and does not modify repository contents.
