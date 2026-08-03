---
phase: monitoring
title: Monitoring & Observability
description: Define monitoring strategy, metrics, alerts, and incident response
---

# Mobile Tag Management Monitoring Notes

## Key Signals

- Tag screen load failures and empty/error-state frequency.
- Rename/delete mutation failures, retries, and sync queue age.
- Number of queued bulk/per-note tag mutations and replay failures.
- Search-to-filter navigation failures.
- Mobile crashes or exceptions originating in the Tags screen, modal flow, or tab-bar controller.

## Logging and Privacy

Use the existing mobile logging and error-reporting conventions. Log operation type, retry state, and safe identifiers only; never log tag contents if they may contain user-authored sensitive text. Do not log authentication tokens or full note bodies.

## Alerts and Triage

- Alert on a sustained increase in tag mutation or sync replay failures.
- Treat repeated queue growth without successful replay as a warning requiring investigation.
- Triage client errors separately from expected offline transitions.
- Compare the local tag summary with a refreshed server summary when diagnosing count/casing drift.

## Health Checks

Validate after release that the Tags tab opens, cached tags render offline, rename/delete queue correctly, reconnect replay completes, and the bottom bar remains reachable after scroll transitions. Capture platform-specific regressions through the existing mobile crash and test-reporting channels.
