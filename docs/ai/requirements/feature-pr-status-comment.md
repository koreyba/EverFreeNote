---
phase: requirements
title: PR Status Comment Requirements
description: Requirements for a single durable PR status comment
---

# PR Status Comment Requirements

## Problem Statement

- Reviewers need one stable PR location that links to the latest generated test reports.
- GitHub Pages already has `unit`, `component`, and `e2e` Allure reports, but those links are scattered across Actions summaries and the Pages catalog.
- The first increment should show report links only, while leaving room for build, analysis, and deployment readiness later.

## Goals & Objectives

- Maintain one bot-authored PR comment marked with `<!-- everfreenote-pr-status-comment -->`.
- Populate the comment with links to the latest available test reports for the active PR head SHA.
- Keep the implementation generic: Allure is only the first report source, not the name or ownership boundary of the comment.

## Success Criteria

- Publishing any family report updates or creates the same PR status comment.
- After `unit`, `component`, and `e2e` publish jobs finish, the comment lists all available report links for the latest PR SHA.
- Missing reports appear as `Not published yet` instead of breaking the workflow.
- The comment can later grow into a broader PR readiness panel without replacing the marker or script.

## Constraints & Assumptions

- The implementation must work before merge, so it cannot depend on a newly added `workflow_run` file being present on the default branch.
- Existing report publish jobs are serialized by `gh-pages-allure-publish`, so comment updates can safely happen at the end of those jobs.
- Publication is already guarded to trusted PRs; fork PRs may keep artifacts without Pages or comment updates.
