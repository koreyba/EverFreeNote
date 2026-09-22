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

## Offline cold-start correction
SupabaseProvider restores the local UI identity from the existing project-scoped SSR session cookie before waiting for SDK refresh. It accepts expired local sessions for offline access, checks issuer and subject, and does not add another token store or bypass remote Supabase/RLS checks. Missing or malformed storage exposes sign-in instead of an endless spinner. Auth events take precedence over older bootstrap requests; sign-out clears local access, while an empty initial event caused by unavailable transport does not discard the saved identity. useNoteAuth consumes the provider instead of making a second blocking session lookup.

Retaining synced cached notes also requires successful online single/bulk deletion to remove the local copy and overlay. Failed deletions preserve their data. Updated controller fixtures supply the provider identity explicitly, and compaction tests assert per-item writes rather than replacing the entire queue.

## Android pull-to-refresh
`PullToRefresh` listens only in the native Android shell. One downward touch starting at the top of every scroll ancestor can arm a refresh; it runs on release after 120 CSS pixels. Nested virtual-list scrolling, horizontal movement, controls, text selection and multiple touches retain their normal behavior. A consumed pull suppresses the synthetic click. The indicator is below reading actions; the editor has no refresh wrapper.

`useNoteRefresh` replaces the main query with the newest first page or refreshes the current reading snapshot. Local pending writes take priority. Responses are ignored after cancellation, account/tab/note changes or entry into editing. Requests receive an AbortSignal through NoteService and the real Supabase transport. The surface aborts on unmount or after ten seconds; even an SDK auth wait cannot keep the indicator spinning. Failure leaves existing content visible and emits one toast. Remote deletion uses existing tab/cache cleanup.

Review found no schema/auth/storage changes or expansion to full-library offline caching. Native validation used the existing separate development application and local Supabase. Production uses the same source with production endpoint and test login disabled.

## Follow-up diagnosis
The refresh hook replaces React Query pages but applyNoteOverlay intentionally retains synced cached rows absent from those pages. Opening a note separately detects deletion. The list also returns a skeleton unconditionally for isLoading, hiding cached notes already merged by useNoteData while Supabase waits/retries. Fix both at their respective boundaries; do not infer deletion from pagination.

Implemented account-scoped, abortable, bounded ID verification with exact count validation; atomic conditional cache removal checks the queue and saved revision. Controller removes only the matching overlay revisions and protects editing tabs, including an editor opened during the transaction. NoteList renders existing local rows during network loading. No database migration or additional native plugin is needed.

## Saved hidden editor reconciliation correction
The previous guard treated every editing tab as pending work. Real UI creation leaves a saved editing tab after Android Back, so even a synced cache revision with an empty queue was excluded from deletion verification. The controller now guards unsaved tab states (dirty/saving/error), durable pending writes, and the currently visible editing pane. A saved hidden tab can be reset after the existing conditional cache deletion succeeds. No storage, server or signing changes.
