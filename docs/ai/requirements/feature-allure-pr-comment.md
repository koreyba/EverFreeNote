---
phase: requirements
title: Allure PR Comment Requirements
description: Requirements for publishing Allure report links into a single PR comment
---

# Allure PR Comment Requirements

## Problem Statement

- GitHub Pages already publishes separate Allure reports for the `unit`, `component`, and `e2e` families, but reviewers must manually open the shared catalog or Actions summaries to find them.
- Pull request discussion currently has no stable place that surfaces test-report links for the latest PR commit.
- The team wants one durable PR comment that can later expand into a broader CI readiness panel, but the first increment should only show Allure report links.

## Goals & Objectives

- Publish one stable PR comment that lists the latest available Allure report links for `unit`, `component`, and `e2e`.
- Update that comment only after all relevant test workflows for the current PR head SHA have finished.
- Reuse existing GitHub Pages metadata instead of inventing a second source of truth for report URLs.

## User Stories & Use Cases

- As a reviewer, I want one PR comment with links to all test reports so I can inspect failures without hunting through workflow tabs.
- As an author, I want the comment to stay in one place and refresh for the latest commit so the PR thread stays tidy.
- As a future maintainer, I want this comment format to be easy to extend into a broader PR status summary.

## Success Criteria

- A pull request run produces or updates exactly one bot-authored comment marked as the Allure report comment.
- The comment contains entries for `unit`, `component`, and `e2e`, with a published link when available and a clear fallback state when not published.
- Older workflow completions for stale PR SHAs do not overwrite the comment for the latest PR head commit.

## Constraints & Assumptions

- Initial rollout uses a `final-only` update model: the comment renders after all three relevant workflows have completed for the same PR head SHA.
- Existing Pages publication remains the source of truth for report metadata.
- Fork PRs and read-only bot runs may not publish Pages reports; the comment must reflect missing publications without failing the overall workflow.
- GitHub `workflow_run` workflows only run when the workflow file exists on the default branch, so branch-only testing of that trigger is limited before merge.

## Questions & Open Items

- Future expansion of the same comment into a general PR readiness panel is intentionally out of scope for this increment.
- The first version will show one latest report per family, not a history list.
