---
phase: monitoring
title: Offline queue and Android Back verification
description: Visible sync state and local diagnostic evidence
---

# Monitoring

Use the existing pending/failed sync indicator and durable queue status. Transport failures are retained for reconnect rather than emitted as per-attempt toasts. No new external telemetry is added and note contents must not be logged.

Manual smoke: create a note in airplane mode, type body/tags, use Back, restart, restore connectivity and confirm one remote note with the latest text. Check keyboard dismissal, an open formatting menu, expanded editor, note/list navigation and Settings return independently. A local-storage failure must keep the editor open. Browser/native-boundary mocks are separate evidence from an installed Android run.

Cold-start smoke must begin with the app fully stopped and a persisted expired session, then remove backend access before launching. Verify the local UI appears, create a note, restart again, restore connectivity and confirm token refresh plus exactly one synced note. Local identity is not proof of current server authorization. Never log auth cookies, access tokens or refresh tokens.
