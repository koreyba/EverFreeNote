---
phase: monitoring
title: Offline queue and Android Back verification
description: Visible sync state and local diagnostic evidence
---

# Monitoring

Use the existing pending/failed sync indicator and durable queue status. Transport failures are retained for reconnect rather than emitted as per-attempt toasts. No new external telemetry is added and note contents must not be logged.

Manual smoke: create a note in airplane mode, type body/tags, use Back, restart, restore connectivity and confirm one remote note with the latest text. Check keyboard dismissal, an open formatting menu, expanded editor, note/list navigation and Settings return independently. A local-storage failure must keep the editor open. Browser/native-boundary mocks are separate evidence from an installed Android run.
