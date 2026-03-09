---
phase: requirements
title: RAG Search on Mobile — Requirements & Problem Understanding
description: Bring RAG note indexing (three-dot menu) and a redesigned settings page to the React Native mobile app
---

# Requirements & Problem Understanding

## Problem Statement

The web app has two recently built features that are not yet available on mobile:
1. **Per-note RAG indexing** — users can index/re-index/delete-index a note for AI search directly from the note's overflow menu on the web.
2. **AI Search panel** — a full search sidebar with FTS and AI/RAG toggle.

Additionally, the mobile **Settings** screen currently has only Theme, Sign Out, and Delete Account. As the product grows (API keys, WordPress, import, export), there's no scalable place to put these settings on mobile.

- **Affected users:** Mobile users who want to use AI-assisted note search and manage integrations from their phone.
- **Current workaround:** None — indexing and settings management is only possible via the web app.
- **Pain point:** Feature parity gap between web and mobile; mobile settings screen cannot accommodate growing list of options.

## Goals & Objectives

### Primary Goals
1. **Note three-dot menu** — Add an overflow (`⋮`) button to the mobile note editor header that opens a bottom-sheet/action-sheet with:
   - **Index note** (or **Re-index note** if already indexed)
   - **Remove from index** (disabled when not indexed)
2. **Redesigned Settings page** — Replace the flat list with a sectioned layout that can accommodate current and future settings categories:
   - **Appearance** (existing: theme)
   - **Integrations** (new: Google / Gemini API key — implemented now; WordPress — placeholder for later)
   - **Data** (new: Import — placeholder; Export — placeholder)
   - **Account** (existing: Sign Out, Delete Account)

### Secondary Goals
- Show live RAG status (chunk count + timestamp) inside the overflow menu so users know if a note is already indexed before deciding to re-index.
- Google / Gemini API key section is fully functional in this iteration.
- Settings sections for WordPress, Import, Export show a "Coming soon" badge — UI space is reserved but tapping does nothing harmful.

### Non-Goals
- Full AI Search UI on mobile (separate feature, future).
- WordPress integration implementation on mobile.
- Import / Export implementation on mobile.
- Automatic indexing on note save.
- Bulk indexing from mobile.

## User Stories & Use Cases

| ID | Story |
|----|-------|
| US-1 | As a mobile user, I want to tap the `⋮` button on a note so that I can access indexing options without cluttering the header. |
| US-2 | As a mobile user, I want to tap **Index note** so that this note becomes searchable via AI. |
| US-3 | As a mobile user, I want to tap **Re-index note** on an already-indexed note so that updates are reflected in AI search. |
| US-4 | As a mobile user, I want to tap **Remove from index** so that a note is removed from AI search. |
| US-5 | As a mobile user, I want to see the current index status (chunk count, timestamp) in the menu before deciding to re-index. |
| US-6 | As a mobile user, I want to open Settings and find a **Google API** section where I can enter or update my Gemini API key. |
| US-7 | As a mobile user, I want the Settings page to be well-organized with clear sections so I can quickly find what I need now and in the future. |
| US-8 | As a mobile user, I want WordPress, Import, and Export settings sections to be visible (but marked "Coming soon") so the layout feels complete. |

### Edge Cases
- Note editor is loading → `⋮` button disabled until note data is available.
- Indexing in progress → **Index/Re-index** button shows a spinner and is disabled; **Remove** is also disabled.
- Gemini API key not configured → **Index/Re-index** still calls the Edge Function; the Edge Function returns a clear error → show error toast.
- Network offline → indexing fails gracefully with a toast error; status stays unchanged.
- Delete confirm → tapping **Remove from index** shows a confirmation modal before deleting.

## Success Criteria

- [ ] `⋮` button appears in the note editor header (right side, next to Trash and ThemeToggle).
- [ ] Tapping `⋮` opens a bottom sheet with index options and current status.
- [ ] **Index note** / **Re-index note** calls `supabase.functions.invoke('rag-index')` and shows a toast on success/error.
- [ ] **Remove from index** requires confirmation, then calls the delete action and shows a toast.
- [ ] RAG status (chunk count) is polled every 3 seconds — same logic as web `useRagStatus` hook.
- [ ] Settings screen has 4 named sections: Appearance, Integrations, Data, Account.
- [ ] **Google / Gemini API** row in Integrations opens a modal to enter/update the Gemini API key (uses existing `ApiKeysSettingsService`).
- [ ] WordPress, Import, Export rows are visible with "Coming soon" badge and non-destructive on tap.
- [ ] All existing Settings functionality (Theme, Sign Out, Delete Account) still works.

## Constraints & Assumptions

### Technical Constraints
- Mobile app: React Native + Expo (Expo Router), NativeWind / StyleSheet, TypeScript.
- The Supabase client on mobile is `client` (not `supabase`) from `useSupabase()` — the mobile provider uses `client` as the key, not `supabase`.
- `client.functions.invoke('rag-index', ...)` works identically to the web — Supabase JS client is shared.
- `GEMINI_API_KEY` lives only in Edge Function environment — no mobile-side secret.
- `ApiKeysSettingsService` (in `core/services/apiKeysSettings.ts`) is already shared and reusable on mobile.
- `useRagStatus` hook depends on `useSupabase()` from the web provider — needs a mobile equivalent or inline implementation.

### Assumptions
- The `rag-index` Edge Function is already deployed and working (built for the web feature).
- `note_embeddings` RLS is enforced — mobile users can only see/modify their own rows.
- The `⋮` menu on mobile should be a **Modal + ActionSheet** pattern (no `DropdownMenu` — not standard on RN).

## Questions & Open Items

| # | Question | Status |
|---|----------|--------|
| Q1 | Should the three-dot menu be a native ActionSheet or a custom Modal bottom sheet? | **Resolved: custom Modal bottom sheet** — consistent with existing mobile UI pattern (delete confirm modal). |
| Q2 | Should `useRagStatus` be shared as a hook in `@ui/mobile/hooks/` or reuse the core logic? | **Resolved: create `useRagStatus.ts` in `ui/mobile/hooks/`** — adapts the web hook to use mobile's `client` key from `useSupabase()`. |
| Q3 | How should "Coming soon" items look in Settings? | **Resolved: badge labeled "Soon" next to the item title, row is non-interactive (opacity 0.5).** |
| Q4 | Where exactly does the `⋮` button go in the header? | **Resolved: rightmost position in `headerRight`, replacing ThemeToggle which moves to Settings page only.** Wait — ThemeToggle stays for now; `⋮` is added next to it. |
