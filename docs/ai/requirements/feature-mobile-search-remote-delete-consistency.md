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
- As a web user, I want the same stale-open protection and refreshed-result rules so that notes deleted from mobile do not appear as openable on the web.
- As a web user, I want the app to tell me when a note was deleted on another device so that I understand why it can no longer be opened.

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
3. If a note is deleted on another device while search results are already open, the stale entry may remain visible until the next confirmed refresh point. In v1, those refresh points are manual refresh, cold start (full process kill and relaunch — background-to-foreground resume does not count), or a repeated search execution. If the user taps the stale entry before refresh, the app must show that the note was deleted and return the user back to their prior context. The stale item is allowed to remain in the list after the user returns from the deleted-note alert; it will disappear at the next confirmed refresh point. The app does not need to remove the stale item from the already-open results list immediately.
4. If the user made valid local changes while offline, those changes must still attempt to sync later. When a remote deletion conflicts with unsynced local edits, the local edits win: the note is restored from the locally edited version rather than silently lost. This is the authoritative conflict policy for this feature.
5. AI search must follow the same product behavior as regular search for remotely deleted notes. This applies to both AI note-grouped view and AI chunk view. A stale AI result may remain visible in already-open results until the next confirmed refresh point, but opening it (whether tapping a note card or a chunk card) must show the deleted-note message and return the user to their prior context. After manual refresh, cold start, or repeated search, the deleted note must no longer appear in AI search results.
6. Bulk delete must silently skip notes that no longer exist on the server and delete the remaining ones without error messages or interruption. The user does not need to be informed about already-deleted notes in the batch.

Edge cases:
- Deleted note is still present in React Query cache but missing on the server.
- Deleted note exists in SQLite and matches local FTS search.
- Search screen is open while deletion happens elsewhere.
- User is offline and opens a locally cached note that was deleted remotely after the last sync.
- User has pending local edits or queued mutations for a note that was deleted remotely.
- Bulk delete selection includes notes already deleted on the server.
- Web user clicks a note in list or search results that was deleted from mobile.

## Success Criteria
**How will we know when we're done?**

- Online note opening no longer treats server-side "not found" as a generic fallback case.
- Deleted-on-server notes are removed from search results after manual refresh, full app reopen, or repeated search without resetting the active query or tag filter.
- Already-open search results are allowed to keep showing stale entries until the next confirmed refresh point; attempting to open such an entry must show the deleted-note message instead of a normal note open.
- The same stale-open and refreshed-result rules apply to both regular search and AI search.
- Remotely deleted notes are eventually marked removed in mobile SQLite and stop resurfacing in local search/list fallbacks.
- Temporary network failures still permit appropriate local fallback behavior.
- Pending valid local changes continue syncing to the cloud after connectivity returns.
- Conflict cases involving remote deletion and unsynced local edits are resolved in favor of the local edits: the note is restored from the locally edited version, not silently lost.
- The refreshed-data and stale-open rules apply consistently to both web and mobile product behavior. Web must revalidate notes against the server before opening them from list or search results when online, and show deleted-note feedback when a note is confirmed gone.
- Bulk delete silently skips already-deleted notes and completes the operation for the remaining ones without error messages.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints:
  - The current mobile app uses React Query, Expo SQLite, Supabase, and existing `useNote`, `useSearch`, `useNotes`, and `useDeleteNote` hooks.
  - The current offline stack already includes queueing and sync primitives that should be reused instead of replaced wholesale.
  - Search and note detail behavior currently depend on both cached server results and local SQLite fallback.
- Assumptions:
  - Conflict handling for remote deletion vs local edits: local edits win. The note is restored from the locally edited version.
  - The feature can be delivered without a full realtime subscription system because the confirmed refresh points are manual refresh, cold start (full process kill and relaunch), and repeated search. Background-to-foreground resume is not a refresh point in v1.
  - A targeted cleanup path for remotely deleted notes is acceptable even if full local-database compaction remains a separate concern.
- Priority:
  - Medium.

## Questions & Open Items
**What do we still need to clarify?**

- User-facing deleted-note message text can be implemented as: `This note was deleted on another device.`
