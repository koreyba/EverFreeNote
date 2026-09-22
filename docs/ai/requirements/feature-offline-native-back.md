---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Offline creation and Android Back

## Problem Statement
The installed production Capacitor app opens without connectivity, but entering a new note title starts remote autosave and repeated failure notifications. System Back currently traverses WebView history or exits, ignoring editor state.

## Goals & Non-Goals
Persist new and edited notes locally before acknowledging any save; retain them across restart and sync once connectivity returns, preserving IDs and latest text. Network failure must not block writing or produce repeated save toasts. Implement Back priority: keyboard, top overlay, expanded editor, note/list navigation, route history, app exit.
Cold startup must also restore an existing local session without waiting for a network token refresh, including expired access tokens. No new sign-in method, PWA/offline asset work, full account download, signing-key replacement, or new cloud schema.

## User Stories
An already authenticated user can create and edit a note with no backend access, leave the editor safely, restart, and later synchronize without duplicates. Back dismisses one UI layer at a time and waits for local persistence before leaving a note.

## Success Criteria
Local durability does not depend on navigator.onLine. Both autosave and explicit save use the queue. Background failures retain data and do not repeatedly toast. Reconnect uses the original note ID and does not discard newer queued edits. Back never exits while an overlay/editor transition consumes it; duplicate presses cannot overlap saves.

## Constraints & Open Questions
Use existing IndexedDB, queue, persisted Supabase session cookies and Capacitor plugins. Keep browser navigation unchanged. Fresh main base 67c01d7. The user confirmed offline creation and cached-note loading on their phone with APK 23b7d05, then reported a cold-start spinner without connectivity. Cold startup is part of the authorized fix; direct agent execution on a physical phone remains unavailable.

## Android pull-to-refresh extension
The user requests downward-swipe refresh in the Android shell. Enable it at the top of the main notes list (including an empty list) and an opened note in reading mode. Preserve ordinary scrolling while editing and below the top; ignore horizontal drags, controls and text selection. A threshold/release indicator and one active refresh make the gesture predictable. Network failure/timeout retains current content and pending local changes. List refresh starts at the newest first page; reading refresh updates that note or handles a remote deletion. This does not add full-library offline download.

## Refresh reconciliation and immediate offline display
A successful list refresh must remove cached notes confirmed deleted by the server, without opening each note. Missing from the first page alone is not deletion. Preserve pending/failed writes, unsaved drafts and visible editors, other accounts, changed cache revisions and aborted/failed requests. Cached notes must render while initial network loading remains unresolved. No server response is required to display existing local data.

## Saved editor tabs and remote deletions
A saved, synchronized note must disappear after a confirmed remote deletion even if Back left its hidden workspace tab in editing mode. Cover both actual online creation and offline creation followed by synchronization. A tab being open is not evidence of unsaved changes.
