---
phase: monitoring
title: Monitoring Notes - Export To WordPress
description: Observability notes for the mobile WordPress publish action
---

# Monitoring Notes

## Signals To Watch
- Existing `wordpress-bridge` failures by code:
  - `wp_auth_failed`
  - `slug_conflict`
  - `invalid_response`
  - timeout / upstream connectivity failures
- Mobile client reports or QA defects where the note menu action appears while settings are disabled.

## Regression Focus
- Compare mobile and web rates of WordPress publish failures after rollout.
- Watch for note-tag update failures after a successful publish, because mobile now mirrors the same post-success tag mutation used on web.

## Manual Checks
- Re-run a mobile publish smoke test after any WordPress credential, bridge, or note-tagging change.
- Include one validation of category preference persistence from mobile after release candidates.
