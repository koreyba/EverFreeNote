---
phase: planning
title: RAG Search on Mobile — Project Planning & Task Breakdown
description: Task breakdown for per-note RAG indexing menu and redesigned settings screen on mobile
---

# Project Planning & Task Breakdown

## Milestones

- [ ] **M1:** Note overflow menu with RAG index/re-index/delete actions functional
- [ ] **M2:** Redesigned Settings screen with sections and working Gemini API key management
- [ ] **M3:** Polish, error handling, accessibility, and export hook wired in settings (placeholders)

---

## Task Breakdown

### Phase 1: Mobile RAG Hook

- [ ] **T1.1** Create `ui/mobile/hooks/useRagStatus.ts`
  - Copy-adapt `ui/web/hooks/useRagStatus.ts`
  - Replace `useSupabase()` import with mobile provider; use `client` instead of `supabase`
  - Export `RagStatus` interface and `useRagStatus` function
  - Export from `ui/mobile/hooks/index.ts`

### Phase 2: Note Overflow Menu

- [ ] **T2.1** Create `ui/mobile/components/NoteIndexMenu.tsx`
  - Bottom-sheet `Modal` (`animationType="slide"`, `transparent`, bottom-anchored)
  - Import `useRagStatus` from mobile hooks
  - Derive `isIndexed`, `isBusy` from status and `operation` state
  - **Index/Re-index button:** calls `client.functions.invoke('rag-index', { body: { noteId, action } })`; shows `ActivityIndicator` while in-flight; toast on success/error
  - **Remove from index button:** disabled when `chunkCount === 0`; opens a confirmation sub-modal before calling delete action
  - **Status line** at top showing chunk count and timestamp (or "Not indexed")
  - Cancel button at bottom
  - `accessibilityLabel`, `accessibilityRole`, `accessibilityState.disabled` on all buttons

- [ ] **T2.2** Wire `NoteIndexMenu` into `note/[id].tsx`
  - Add `isNoteMenuVisible: boolean` state
  - Import `MoreVertical` from `lucide-react-native`
  - Add `MoreVertical` `Pressable` to `headerRight` (after Trash, before ThemeToggle)
  - Render `<NoteIndexMenu noteId={id} visible={isNoteMenuVisible} onClose={...} />` in the screen

### Phase 3: Settings Screen Redesign

- [ ] **T3.1** Create `ui/mobile/components/settings/GeminiApiKeySection.tsx`
  - Renders a pressable row with title "Google / Gemini API" and status indicator (key icon + "Configured" / "Not set")
  - On press: opens a full-screen `Modal`
  - Modal content:
    - Password `TextInput` with placeholder logic (configured vs not)
    - Inline status badge (green "Configured" / grey "Not configured")
    - Error and success messages
    - Save and Close buttons
  - Uses `new ApiKeysSettingsService(client)` from `@core/services/apiKeysSettings`
  - Loads status on modal open; saves key on "Save"

- [ ] **T3.2** Create helper components in `ui/mobile/components/settings/`
  - `SettingsSectionHeader.tsx` — small ALL-CAPS section label (e.g. "INTEGRATIONS")
  - `SettingsRow.tsx` — generic pressable row: title (left), optional right element (badge, icon, chevron)
  - `ComingSoonBadge.tsx` — small "Soon" badge with muted style

- [ ] **T3.3** Redesign `ui/mobile/app/(tabs)/settings.tsx`
  - Replace flat layout with `ScrollView` + sections
  - **Section: APPEARANCE** — existing theme radio options (unchanged logic)
  - **Section: INTEGRATIONS**
    - `<GeminiApiKeySection />` (functional)
    - WordPress row: `<SettingsRow title="WordPress" badge={<ComingSoonBadge />} disabled />` 
  - **Section: DATA**
    - Import row: `<SettingsRow title="Import notes" badge={<ComingSoonBadge />} disabled />`
    - Export row: `<SettingsRow title="Export notes" badge={<ComingSoonBadge />} disabled />`
  - **Section: ACCOUNT**
    - Sign Out button (existing)
    - Delete Account link + Modal (existing — no change to logic)
  - Maintain all existing styles for existing elements

### Phase 4: Testing templates

- [ ] **T4.1** Create `docs/ai/testing/feature-rag-search-on-mobile.md`
  - Unit test checklist for `useRagStatus` mobile hook
  - Integration test checklist for `NoteIndexMenu` (mock `functions.invoke`)
  - Integration test checklist for `GeminiApiKeySection` (mock `ApiKeysSettingsService`)
  - Manual QA checklist for settings sections

- [ ] **T4.2** Create `docs/ai/implementation/feature-rag-search-on-mobile.md`
  - Implementation notes as tasks complete

---

## Dependencies

| Task | Depends on |
|------|-----------|
| T2.1 | T1.1 (useRagStatus hook must exist first) |
| T2.2 | T2.1 (NoteIndexMenu component must exist) |
| T3.1 | `core/services/apiKeysSettings.ts` (already exists ✅) |
| T3.3 | T3.1, T3.2 |
| T4.1 | T1.1, T2.1, T3.1 |

**External dependencies (already satisfied):**
- `rag-index` Edge Function — deployed ✅
- `api-keys-status` / `api-keys-upsert` Edge Functions — deployed ✅
- `note_embeddings` table + RLS — applied ✅
- `core/services/apiKeysSettings.ts` — exists ✅
- `lucide-react-native` — installed in mobile ✅

---

## Timeline & Estimates

| Task | Effort |
|------|--------|
| T1.1 — `useRagStatus` hook | ~30 min |
| T2.1 — `NoteIndexMenu` component | ~1.5 h |
| T2.2 — Wire into note editor | ~30 min |
| T3.1 — `GeminiApiKeySection` | ~1.5 h |
| T3.2 — `SettingsSectionHeader`, `SettingsRow`, `ComingSoonBadge` | ~30 min |
| T3.3 — Settings screen redesign | ~1 h |
| T4.x — Docs | ~30 min |
| **Total** | **~6 h** |

---

## Risks & Mitigation

| Risk | Impact | Mitigation |
|------|--------|-----------|
| `client.functions.invoke` fails on mobile (CORS / auth) | High | Already works for other features (sync); same Supabase client used |
| `note_embeddings` RLS blocks mobile reads | Medium | Same anon key + user JWT flow as web; RLS is user-scoped not platform-scoped |
| Bottom-sheet modal animation feels janky | Low | Use `animationType="slide"` + `transparent` overlay; proven pattern |
| Header gets too crowded with `⋮` button | Low | Remove ThemeToggle from header if needed (move to Settings) |

---

## Implementation Order

1. T1.1 → T2.1 → T2.2 (RAG note menu, end-to-end)
2. T3.2 → T3.1 → T3.3 (Settings redesign, end-to-end)
3. T4.x (docs)
