---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- The mobile note editor can restore stale title/body/tag values into an active editing session when the same note refetches during autosave.
- The current reconciliation logic treats "draft differs from incoming snapshot" as if it always means "preserve local draft", which is incorrect for clean editors and background sync scenarios.
- As a result, the editor can show stale UI when the server has newer content, or overwrite newer remote content after the next blur/autosave.

## Goals & Objectives
**What do we want to achieve?**

- Introduce a shared autosave session model that distinguishes between:
  - real note switches
  - same-note refreshes
  - create-note ID assignment after autosave
- Reuse that shared autosave session logic in both mobile and web during this iteration, while allowing each client to keep its own editor bindings.
- Reconcile same-note refreshes per field (`title`, `description`, `tags`) using a true dirty check against the accepted baseline, not a whole-snapshot equality shortcut.
- Preserve local dirty fields during concurrent updates while still accepting newer external values for clean fields.
- Update the debounced autosave baseline without canceling or corrupting pending local work.

Non-goals:
- No server-side conflict resolution changes; last-write-wins remains the backend rule.
- No new user-facing conflict UI in this change.
- No forced unification of web and mobile editor bindings; the shared logic should be platform-agnostic while bindings may stay separate.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a mobile note author, if I type a first title, erase it, and type a second one, autosave must never restore the first title over the second.
- As a web note author, I should use the same autosave session semantics as mobile so same-note refresh behavior does not drift between clients.
- As a user editing on mobile while the same note refreshes from query invalidation, my dirty local fields should stay intact.
- As a user whose note changed on another device while my local editor is still clean, I should see the newer server value instead of stale local UI.
- As a user editing only one field locally, I should still receive newer external values for the other clean fields.

## Success Criteria
**How will we know when we're done?**

- Same-note refreshes no longer overwrite a dirty local `title`, `description`, or `tags` field with stale incoming data.
- Same-note refreshes do update clean editor fields when the server snapshot is newer.
- Autosave acknowledgements for the same note correctly move the accepted baseline forward without canceling unrelated pending work.
- Shared core logic covers the session/reconcile semantics with unit tests, and mobile regression tests cover the stale-title restore scenario plus clean-field external adoption.

## Constraints & Assumptions
**What limitations do we need to work within?**

- The mobile screen uses controlled React state for `title` and `tags`, but the note body lives inside `EditorWebView`; field reconciliation must work across both kinds of bindings.
- Mobile note updates currently invalidate `['note']`, `['notes']`, and `['search']`, so same-note refreshes during an edit session are expected behavior.
- The fix must continue to use the existing debounced autosave utility and mutation flow rather than introducing a separate persistence pipeline.
- The server remains last-write-wins; this feature only improves client-side session correctness before the write is sent.

Definition:
- A field is `dirty` when the current local draft value differs from the last accepted baseline for that same field.
- A field is `clean` when the local draft matches the accepted baseline.

## Questions & Open Items
**What do we still need to clarify?**

- Future follow-up only: should the product ever expose a visible "remote changed while editing" indicator when a dirty local field is preserved during an active session?
- This iteration does not add conflict UI; final persisted state still follows `last write wins`.
