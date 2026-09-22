---
phase: deployment
title: Offline notes and native Back delivery
description: Shared web code and production Android shell
---

# Deployment

Build the production Capacitor shell after tests and review. The APK embeds the web bundle and must be installed as an app update; website deployment alone does not update it. Keep the existing production package and signing certificate. The available local certificate is Android debug, so label the artifact accurately. No database migration or new environment flag is required.

Read production backend variables only from local configuration; verify the expected production host before building. Test-auth and performance harness flags remain disabled in the delivered production artifact. Record commit, APK hash, application ID and signer in the build receipt.

Rollback is a rebuild from the previous commit with the same package/signature. Never clear app data to install an update: unsynchronized notes live there. New queue/cache records remain compatible with the existing storage version.

For the offline cold-start follow-up, build from the updated commit and preserve the same package/certificate. The fix reads the existing project-scoped SSR cookie; it requires neither a migration nor signing in again. Keep the previous APK receipt, and generate a separate commit-named APK and receipt for the update.
