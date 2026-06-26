---
phase: deployment
title: Deployment Notes - Export To WordPress
description: Release notes for extending WordPress export to the mobile app
---

# Deployment Notes

## Scope
- No new backend functions, migrations, or secrets were added for mobile parity.
- Mobile reuses the existing `wordpress-settings-status`, `wordpress-settings-upsert`, and `wordpress-bridge` functions already used by web.

## Release Steps
1. Deploy the mobile build that includes the new `Export to WordPress` note action and dialog.
2. Verify the target Supabase project already has the WordPress integration migration and edge functions from the original web rollout.
3. Smoke-test one publish flow from mobile against the same WordPress environment used for web validation.

## Validation
- Confirm the mobile note options menu shows `Export to WordPress` only for users with enabled WordPress settings.
- Confirm category loading, publish success, slug validation, and published-tag update behavior match the existing web flow.

## Rollback
- If the mobile publish dialog regresses, ship a mobile-only rollback build removing the note menu action.
- Backend rollback is not required because no backend contracts changed in this extension.
