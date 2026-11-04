---
phase: testing
title: Large Inline Image Validation
description: Keep large ENEX inline images valid without relying on regexp optimization
---

# Large Inline Image Validation

## Test Coverage Goals

Preserve supported image types, base64 alphabet/grouping/padding checks, export
resource fields and embedded-image proxy/privacy behavior. Preserve the existing
14,000,000-character valid-image case and every existing assertion/timeout.

## Unit Tests

The ten-case ENEX image suite includes a new isolated Node subprocess with V8
regexp optimization disabled. It calls the real TypeScript ImageDownloader through
Node 24's native type stripping, uses synthetic fetch bytes and checks the filename,
MIME, encoded data and one fetch call. It does not change parent process flags.
The new case failed against the original validator (null resource) and passes
with constant-stack validation. All ten cases pass through Allure with matched
expectations, complete modeling and no findings.

Existing extraction checks additionally exercise no/one/two padding characters,
misplaced/excess padding, invalid characters and unsupported formats.

## Integration Tests

Run the unchanged combined main command: all three Jest projects, coverage and
runInBand. Verify native Jest JSON reports 2,179 cases, no failures and only the
six existing skips, retaining all 2,178 baseline identities plus the new case.
Allure expects 2,119 visible cases: eleven existing plain-jsdom docblock files
account for the other 60 native cases and remain verified in Jest JSON. This
pre-existing reporting boundary is not a test exclusion.

## Test Reporting & Coverage

Store red/green Allure output and native Jest JSON outside git in the chat's
component-runtime evidence directory. A main coverage run exposed the original
failure; a focused default-engine run alone did not reproduce it. The disabled
regexp-optimization subprocess provides a deterministic regression without
weakening the original data size, assertions, timeout or failure propagation.

## Acceptance

Require fresh exact-head GitHub tests and quality checks, then verify the main
coverage producer and existing component/Allure/Sonar consumers. No quality gate
or source inclusion setting is changed.
