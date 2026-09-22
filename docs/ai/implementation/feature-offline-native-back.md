---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation

Every new/edit save writes the local cache and mutation queue before returning to the editor, including when navigator.onLine is stale. Concurrent creation shares one promise/ID. Remote mutations run in the background with silent callbacks; sync preserves the local ID and recovers an insert whose response was lost by updating that same ID. Missing remotely deleted notes retain existing recreate behavior.

While visible, a 15-second retry plus focus/visibility restoration recovers transport without requiring an online event. Sync starts after authentication restoration and tears down its network listener on unmount/account change. New cache/queue records include the owner; known foreign-owned drafts are excluded from the overlay and cannot be uploaded by the current account. Legacy unowned records retain their prior behavior.

Queue compaction upserts retained snapshot items and removes only superseded snapshot IDs, preserving concurrently enqueued edits. Acknowledgement conditionally marks only the matching cache revision synced in an IndexedDB transaction; synced cached copies remain usable offline but never override a server row. Refresh does not delete pending cache entries merely because a queue snapshot is temporarily empty.

`appBack.ts` registers screen handlers. The Capacitor provider handles keyboard state, serializes Back events, dismisses the existing Radix top layer via Escape, then invokes fullscreen/menu/navigation handlers. Notes flush the current editor before leaving. Settings use the existing return state; the notes root exits even when Settings left browser history. Browser history/navigation is unchanged because only Capacitor invokes native dispatch.

Tests reproduce each original failure before its fix. See the testing document for current receipts and proof limits.

## Final review
Requirements/design/code comparison completed. Local-first acknowledgement, stable IDs, quiet retry, account ownership, non-destructive queue compaction and Back ordering match the design. No schema changes. The shared web package declares the same `@capacitor/keyboard` 8.0.5 dependency already used by the Android shell, because the provider is also compiled in clean web builds. Existing interfaces retain optional compatibility for cache acknowledgement. All changed callers and mocked contracts were checked; actual IndexedDB and Android events were exercised.

AI DevKit base lint passes. Feature lint validates every document but assumes a `feature-...` branch; the actual `codex/offline-native-back` prefix follows the host instruction. This naming-only mismatch is not a source/test failure.

PR: https://github.com/koreyba/EverFreeNote/pull/201. Initial cloud checks exposed the missing root keyboard dependency in both web tests and preview compilation; it was added to the root package and lockfile. The two cloud Codacy annotations were addressed. Local Codacy's ten HTML-rule findings refer to unchanged test-fixture lines verified against the base; its security tools and type-aware rules were not all available locally. CodeRabbit skipped automatic review due to repository eligibility. The existing `merge-tests-coverage.yml` has a trailing `&&` in its job condition and already fails on base main; that unrelated workflow is unchanged.
