---
phase: requirements
title: Requirements & Problem Understanding - Mobile Search Remote Delete Consistency
description: Keep mobile search, note opening, and local storage consistent when notes are deleted on another device
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Mobile users can see stale search results after notes were deleted from the web app or another device.
- In some cases, mobile users can still open a deleted note because the app falls back to stale local state in React Query and SQLite.
- The local mobile database can remain polluted with remotely deleted notes because remote deletions are not reconciled back into local storage.
- Affected users: mobile users who work across devices or switch between web and mobile.
- Current workaround: manually refresh, restart the app, or avoid trusting search results after cross-device deletion. None of these are reliable.

## Goals & Objectives
**What do we want to achieve?**

- Primary goals:
  - Distinguish between "the server is temporarily unavailable" and "the note does not exist on the server".
  - Prevent deleted-on-server notes from being opened as if they still exist when the app is online.
  - Reconcile remotely deleted notes out of mobile search results, note detail state, and local SQLite storage.
  - Preserve offline fallback for genuine transient failures and offline usage.
  - Preserve the ability for valid local changes to sync back to the cloud once connectivity returns.
- Secondary goals:
  - Keep the search query and active tag filter intact while stale deleted notes are removed from results.
  - Reduce ghost-note confusion and restore trust in cross-device behavior.
- Non-goals:
  - Rewriting the full offline architecture.
  - Redesigning AI search, except where shared stale/deleted-state handling naturally applies.
  - Adding full realtime sync for every entity in the app.
  - Changing the standard mobile delete UX beyond stale-result and remote-delete consistency.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a mobile user, I want notes deleted on another device to disappear from mobile search results so that I do not act on stale data.
- As a mobile user, I want the app to tell me when a note was deleted elsewhere so that I understand why it can no longer be opened.
- As a mobile user, I want the app to distinguish between temporary server issues and true remote deletion so that offline fallback remains useful without being misleading.
- As a mobile user, I want local storage to be cleaned up after remote deletions so that ghost notes do not keep resurfacing.

Key workflows:
1. User runs a regular search on mobile.
2. The same note is deleted on web or another device.
3. User returns to the already-open search screen, refreshes, or attempts to open the note.
4. Mobile detects whether the note is truly gone on the server or whether the server is temporarily unavailable.
5. If the note is truly gone, the app removes it from visible state and local storage, then communicates that the note was deleted elsewhere.
6. If the server is temporarily unavailable, the app may still use local fallback, and pending valid local changes must sync later when connectivity returns.

Required behavior scenarios:
1. If the app is online and the note no longer exists on the server, the app must not open the stale local copy as if it were current. It must communicate clearly that the note was already deleted and return the user to the notes list or search context they came from.
2. If the server is temporarily unavailable, mobile may use the local copy as fallback. That fallback must represent temporary degraded mode, not confirmed server truth.
3. If a note is deleted on another device while search results are already open, the stale entry may remain visible until the next confirmed refresh point. In v1, those refresh points are manual refresh, full app close and reopen, or a repeated search execution. If the user taps the stale entry before refresh, the app must show that the note was deleted and return the user back to their prior context. The app does not need to remove the stale item from the already-open results list immediately.
4. If the user made valid local changes while offline, those changes must still attempt to sync later. Conflict handling for remote deletion versus local edits must follow the existing project policy, with the expected result for this feature being restoration of the note from the locally edited version rather than silent data loss.
5. AI search must follow the same product behavior as regular search for remotely deleted notes. A stale AI result may remain visible in already-open results until the next confirmed refresh point, but opening it must show the deleted-note message and return the user to their prior context. After manual refresh, full app reopen, or repeated search, the deleted note must no longer appear in AI search results.

Edge cases:
- Deleted note is still present in React Query cache but missing on the server.
- Deleted note exists in SQLite and matches local FTS search.
- Search screen is open while deletion happens elsewhere.
- User is offline and opens a locally cached note that was deleted remotely after the last sync.
- User has pending local edits or queued mutations for a note that was deleted remotely.

## Success Criteria
**How will we know when we're done?**

- Online note opening no longer treats server-side "not found" as a generic fallback case.
- Deleted-on-server notes are removed from search results after manual refresh, full app reopen, or repeated search without resetting the active query or tag filter.
- Already-open search results are allowed to keep showing stale entries until the next confirmed refresh point; attempting to open such an entry must show the deleted-note message instead of a normal note open.
- The same stale-open and refreshed-result rules apply to both regular search and AI search.
- Remotely deleted notes are eventually marked removed in mobile SQLite and stop resurfacing in local search/list fallbacks.
- Temporary network failures still permit appropriate local fallback behavior.
- Pending valid local changes continue syncing to the cloud after connectivity returns.
- Conflict cases involving remote deletion and local edits follow the existing conflict policy and do not silently lose user work; the expected outcome is recovery of the locally edited note version.
- The refreshed-data and stale-open rules apply consistently to both web and mobile product behavior.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints:
  - The current mobile app uses React Query, Expo SQLite, Supabase, and existing `useNote`, `useSearch`, `useNotes`, and `useDeleteNote` hooks.
  - The current offline stack already includes queueing and sync primitives that should be reused instead of replaced wholesale.
  - Search and note detail behavior currently depend on both cached server results and local SQLite fallback.
- Assumptions:
  - Existing conflict handling is conceptually last-write-wins based and should remain the governing policy unless review reveals a stronger existing rule.
  - The feature can be delivered without a full realtime subscription system because the confirmed refresh points are manual refresh, full app reopen, and repeated search.
  - A targeted cleanup path for remotely deleted notes is acceptable even if full local-database compaction remains a separate concern.
- Priority:
  - Medium.

## Questions & Open Items
**What do we still need to clarify?**

- User-facing deleted-note message text can be implemented as: `This note was deleted on another device.`
