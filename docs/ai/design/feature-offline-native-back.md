---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# Offline writes and native Back design

## Architecture Overview
```mermaid
flowchart TD
  Start[Cold startup] --> Cookie[Existing project-scoped auth cookie]
  Cookie --> Identity[Local UI identity]
  Identity --> Editor
  Cookie --> Refresh[Background session refresh]
  Refresh --> Auth[Supabase auth events]
  Editor[Editor save] --> Local[Local cache and durable queue]
  Local --> Ack[Return stable note ID to editor]
  Local --> Sync[Background sync]
  Sync --> Server[Supabase with same note ID]
  Server --> Cleanup[Remove acknowledged queue entry only]
  Back[Android Back] --> Keyboard[Keyboard dismissal]
  Keyboard --> Layer[Top open overlay]
  Layer --> Focus[Collapse expanded editor]
  Focus --> Pane[Flush local save and return to notes]
  Pane --> History[Route history or exit]
```

## Components & Data Models
Reuse CachedNote and MutationQueueItem. Unify create and explicit update with the existing locally queued autosave update path. Queued server writes suppress per-attempt notifications and preserve client IDs. Check retries, restart hydration and successful cleanup against newer pending edits.
Native Back dispatch consumes one handler by priority; existing Radix Escape dismissal owns overlay semantics, including cancellation. Screen handlers register and unregister with lifecycle. The native boundary owns keyboard state and serialization; browser callers are unaffected.

## Decisions & Trade-offs
Connectivity is a hint for synchronization, never permission to persist a local edit. Visible clients retry queued synchronization every 15 seconds and on foreground restoration, because restoring transport access need not emit a WebView online event. Retain current online deletion semantics. Preserve remote-deletion recovery in the sync layer. The native callback must await editor persistence and consume a failed navigation rather than exit. No blanket Escape dispatch to a text editor when no overlay is open.

The provider reads the existing Supabase SSR cookie using its public chunk/base64 helpers before waiting on getSession. Project issuer and token subject must match the stored user. This restores only local UI identity; remote authorization and RLS remain with Supabase. No token copy or new session format is introduced. Explicit sign-out wins over late bootstrap results. A failed transport refresh or empty initial event does not discard the local session. useNoteAuth consumes provider readiness instead of performing a duplicate blocking lookup. Successful online single/bulk deletion removes the retained offline copy and overlay, while failed deletions retain their cache.

## Review
Requirements and current save/navigation paths reviewed. Test backend failures even with navigator.onLine=true. Validate installed Android separately from component/native-boundary mocks.

## Pull-to-refresh design
```mermaid
flowchart LR
  Touch[Downward touch at scroll top] --> Gesture[Android-only gesture and indicator]
  Gesture -->|release past threshold| Request[Abortable bounded refresh]
  Request --> List[Replace first notes page]
  Request --> Note[Refresh clean reading snapshot]
  Pending[Local pending writes] --> Guard[Preserve local version]
  Note --> Guard
  Request -->|failure| Retain[Keep current content]
```
A reusable UI wrapper owns gesture recognition, cancellation, feedback and in-flight exclusion. A notes refresh hook owns server reads, query-cache replacement and safe snapshot application; the controller wires reading snapshots to existing workspace tabs. Use AbortSignal plus identity/edit-state guards so late responses cannot replace another account/tab or a new draft. Existing Supabase service methods accept an optional signal. No native plugin or storage migration is needed.

## Cache reconciliation
After fetching the first page, read the account cache and verify clean cached IDs absent from that page with an abortable, account-scoped ID lookup in batches of 100. Require an exact row count matching each batch response before treating absence as deletion. Only then remove confirmed missing cache revisions. The web adapter checks both cache revisions and queued operations in one IndexedDB transaction (synchronous check/write for localStorage fallback). Notify the controller only of actual removals; preserve newer overlay entries, unsaved drafts and visible editing panes. Keep list replacement after verification, so transport errors retain the previous view.

```mermaid
flowchart LR
  Refresh --> Page[Server first page]
  Page --> Missing[Clean cached IDs absent from page]
  Missing --> Verify[Account scoped existence lookup]
  Verify --> Guard[Unchanged revision and no queued writes]
  Guard --> Cache[Remove cache and overlay]
  Local[Local cache hydration] --> List[Render immediately]
  Network[Initial network loading] --> Background[Refresh in background]
```
The loading skeleton is used only when the list has no notes. Existing auth bootstrap and local hydration stay independent from network requests.

Hidden editor tabs are protected by save state (dirty, saving, error), plus the durable cache/queue guards. A saved hidden tab can be reset after confirmed deletion. Keep the visible active editor protected even before its debounced draft notification arrives.
