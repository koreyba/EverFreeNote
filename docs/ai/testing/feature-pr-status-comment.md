---
phase: testing
title: PR Status Comment Testing
description: Verification notes for the reusable PR status comment
---

# PR Status Comment Testing

## Test Coverage Goals

- Verify latest report selection by PR number and head SHA.
- Verify the comment marker and headings are generic.
- Verify missing reports render as `Not published yet`.

## Verification Commands

- `node --test scripts/update-pr-status-comment.test.js`
- `npm run validate`

## Current Status

- [x] Added renderer tests for latest-report selection.
- [x] Added renderer tests for generic PR status shape and missing report fallback.
- [x] Ran local renderer tests.
- [x] Ran repository validation.

## Manual Testing

- After the next PR publish run, confirm the PR has one comment containing `PR Status` and `Test Reports`.
- Confirm subsequent family publish jobs update that same comment instead of creating duplicates.
