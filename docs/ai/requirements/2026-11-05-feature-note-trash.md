---
phase: requirements
title: Trash with 30-day retention
description: Recover deleted notes and bound permanent cleanup on free infrastructure
---

# Trash — requirements

Status: approved for implementation by the user on 2026-11-05. Implemented locally; deployment and cloud runtime checks remain separate release steps.

## Problem Statement

Single and bulk deletion currently remove server notes immediately. Users need a recovery window, with the existing confirmation mechanisms and an explicit way to delete permanently.

## Goals & Objectives

- Every normal note deletion moves its content into **Trash** atomically.
- Keep a note for at least 30 days from server acceptance of the move; then delete it automatically. Small delays are acceptable. A monthly schedule is not the retention rule.
- Allow permanent deletion of one note, a selection, or the contents of Trash, with confirmation.
- Keep cleanup bounded and work within the existing free Supabase / Cloudflare infrastructure.
- Approved safety defaults: restore notes; retain titles, complete HTML, tags and images during the recovery window; keep Trash separate from active lists and search.
- Non-goals: configurable retention, folders, a general archive, Trash FTS/AI search, undo after permanent deletion, or retroactive recovery of notes deleted before rollout.

## User Stories & Use Cases

1. **R1 — Move:** confirm normal single/bulk Delete; the selected notes leave active views and appear in Trash.
2. **R2 — Recover:** view a trashed note read-only and restore one or several notes. Restore is part of the approved safety layer.
3. **R3 — Delete forever:** confirm a single item with the existing single-note dialog pattern. For a bulk action, type the exact selected count, as today.
4. **R4 — Empty Trash:** obtain a frozen set of Trash entry IDs and its count, then use the bulk confirmation pattern. New arrivals after confirmation preparation are not part of that action.
5. **R5 — Retention:** an eligible note is removed by scheduled cleanup, without keeping the application open. If scheduling is unavailable or delayed, authenticated activity can perform limited catch-up.
6. **R6 — Offline:** normal offline deletion remains recoverable, including notes never successfully created on the server and drafts with unsynced edits.
7. **R7 — Isolation:** an account sees and changes only its own Trash. Public links, AI search, tags, counts and normal exports do not include Trash.
8. **R8 — Reliability:** retries, lost responses, device/account switches and partial failures do not lose the only recoverable copy or make permanent deletion target a newer Trash entry.

## Success Criteria

- Single and bulk normal deletion retain their current confirmation strength, with copy explaining the 30-day recovery window.
- Trash reuses the Notes sidebar, list/grid cards (including excerpts and tags), and reader. It fits desktop and tablet layouts and opens the reader full width on phones.
- Trash supports Restore, Select all, Delete forever and Empty Trash. Restore makes the note editable again.
- Notes and Trash expose selection on desktop and mobile. The list toolbar shows the selection count and bulk actions, and Done returns to browsing.
- Select all follows the existing visible/loaded-set behavior; Empty Trash explicitly gathers all entry IDs across pages before showing the confirmation count.
- Destructive actions freeze entry IDs before confirmation, prevent duplicate submission and report actual per-entry outcomes. A failed action retains failed selections.
- Restoration returns the original content and tags. Old public links remain revoked; AI indexing can be regenerated through the existing indexing flow.
- The server stamps the first deletion time. Retries and reading Trash never extend it. Restore followed by a new deletion starts a new retention period and creates a new Trash entry ID.
- Retention means 720 elapsed hours, independent of browser clock, daylight saving changes or calendar months. No automatic deletion occurs earlier.
- Local pending deletion is durable before the active view is cleared. The 30-day server clock starts on acknowledgement; unacknowledged local content never expires automatically.
- Purge uses indexed candidates, at most 100 notes per database call, one cleanup runner and explicit timeouts. Bulk UI actions use sequential chunks rather than hundreds of concurrent requests.
- Permanent note deletion removes application access immediately; owned, unreferenced Storage files are removed asynchronously with durable retries. Shared or uncertain references must be retained until verified.
- The completed feature must pass real RLS, lifecycle, offline, browser/mobile and workload checks; the local SQL diagnostic is not acceptance evidence.

## Constraints & Assumptions

- Confirmed request: free plans; approximate 30-day cleanup is acceptable; permanent deletion must require the current confirmation patterns.
- **A1, approved:** restoring to the same note ID is useful for workspace continuity. A conflicting active row is never overwritten.
- **A2, approved:** viewing cached Trash is allowed offline; restore, Delete forever and Empty Trash require a connection in v1. Offline normal deletion remains supported.
- **A3, approved:** restore is allowed while the entry still exists, including a small post-expiry cleanup delay. The database lock decides a concurrent restore-versus-purge race.
- **A4, approved:** new public links require explicit sharing after restoration. Reindexing is not silently billed to an AI provider.
- Legacy clients can be protected for server content by a database trigger; they cannot gain new local-draft recovery behavior without an update.
- New notes created in another client are not automatically included in an already prepared Empty Trash action.
- Free database storage is limited. Inline images can make a small number of notes large; retaining Trash must be included in capacity monitoring.

## Questions & Open Items

The user approved the proposed feature and A1–A4 with “Понимаю, супер, делай”.

Local SQL tests cover account cascades, legacy authenticated/service-role deletes, ownership, replay safety, references and bounded workloads. Before release, verify the actual project extensions, Cron/Storage runtime, Stage performance and the rebuilt Android bundle. See the testing/deployment records for the exact evidence and remaining gaps.

The design is in [design](../design/2026-11-05-feature-note-trash.md); implementation tasks and validation scenarios are in [planning](../planning/2026-11-05-feature-note-trash.md) and [testing](../testing/2026-11-05-feature-note-trash.md).
