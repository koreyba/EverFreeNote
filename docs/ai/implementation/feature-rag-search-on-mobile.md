---
phase: implementation
title: RAG Search on Mobile — Implementation Notes
description: Implementation progress and technical notes for the mobile RAG indexing menu and settings redesign
---

# Implementation Notes

## Status
✅ **All tasks complete.** TypeScript check: 0 errors.

## Completed Tasks

- ✅ **T1.1** `ui/mobile/hooks/useRagStatus.ts` — mobile adaptation of web hook (uses `client` instead of `supabase`)
- ✅ **T1.1** Export added to `ui/mobile/hooks/index.ts`
- ✅ **T2.1** `ui/mobile/components/NoteIndexMenu.tsx` — bottom-sheet Modal for RAG operations (index/re-index/delete with confirm)
- ✅ **T2.2** `note/[id].tsx` — added `MoreVertical` button to `headerRight`, wired to `NoteIndexMenu`
- ✅ **T3.2** `ui/mobile/components/settings/SettingsSectionHeader.tsx`
- ✅ **T3.2** `ui/mobile/components/settings/SettingsRow.tsx`
- ✅ **T3.2** `ui/mobile/components/settings/ComingSoonBadge.tsx`
- ✅ **T3.1** `ui/mobile/components/settings/GeminiApiKeySection.tsx` — Gemini API key management modal
- ✅ **T3.3** `ui/mobile/app/(tabs)/settings.tsx` — redesigned with 4 sections: Appearance, Integrations, Data, Account

## Technical Notes

### Mobile Supabase client key
The mobile `SupabaseProvider` exposes `client` (not `supabase`) — all calls use `const { client, user } = useSupabase()`.

### `useRagStatus` adaptation
- Web: `const { supabase, user } = useSupabase()` → uses `supabase.from(...)`
- Mobile: `const { client, user } = useSupabase()` → uses `client.from(...)`
- The rest of the hook logic is identical.

### `NoteIndexMenu` bottom-sheet pattern
```
<Modal visible={visible} transparent animationType="slide" onRequestClose={onClose}>
  <Pressable style={overlay} onPress={onClose} />
  <View style={sheet}>
    {/* content */}
  </View>
</Modal>
```
The `Pressable` overlay captures taps outside the sheet and closes it.

### `ApiKeysSettingsService` on mobile
```typescript
import { ApiKeysSettingsService } from '@core/services/apiKeysSettings'
const { client } = useSupabase()
const service = useMemo(() => new ApiKeysSettingsService(client), [client])
```
No changes to the core service needed.
