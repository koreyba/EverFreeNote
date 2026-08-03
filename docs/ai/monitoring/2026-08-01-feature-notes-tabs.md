---
phase: monitoring
title: Monitoring & Observability
description: Define monitoring strategy, metrics, alerts, and incident response
---

# Monitoring & Observability

## Key Metrics

- Client-side autosave failures while a tab is dirty.
- Workspace storage read/write failures and rejected snapshot versions.
- Duplicate-note prevention and tab close-confirmation paths, if product analytics are enabled.
- UI errors during tab activation/restoration.

## Logging Strategy

- Keep storage and restoration diagnostics non-sensitive and bounded; never log note body contents or tokens.
- Reuse existing autosave/offline error reporting and toast behavior.
- Use warnings for recoverable storage failures and errors for unhandled activation/save failures.

## Alerts & Notifications

- Warning: elevated autosave failure rate or repeated workspace restore failures.
- Critical: a regression causes Notes to fail to render or silently discard dirty drafts.

## Health Checks

- Existing web/native smoke checks must open Notes and render one blank or restored tab.
- Focused regression tests cover the loss-safety paths before release.

## Incident Response

1. Triage whether the failure is storage-only, editor-session-only, or write-path-related.
2. Disable/roll back the UI bundle if dirty drafts can be lost.
3. Preserve existing offline queue data and use the reducer's safe fallback.
4. Add a regression test for the observed transition before re-release.
