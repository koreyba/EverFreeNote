# Core/UI Separation Analysis

## Purpose
Assess how well the project separates core logic (services, domain, adapters) from UI and identify concrete steps to finish the refactor.

## Current State
- **Core intent**: `core/` holds business logic (auth, notes, search, sanitizer), adapters, and utilities that should be UI-agnostic.
- **UI intent**: `ui/web/` consumes core via adapters (storage, navigation, OAuth, Supabase client).
- **Lib overlap**: `lib/` still mixes UI-facing helpers and duplicated services/adapters. Several files still import from `@/lib/...` instead of `@core/...` or `@ui/web/...`.
- **FTS/search**: Core search service (`core/services/search.ts`) is used by UI hooks. FTS pagination/total handling lives inside `useNoteAppController` and is not extracted.
- **Selection logic**: Bulk selection lives in UI controller; not yet extracted to a reusable core helper.

## Gaps and Duplicates
- Duplicated services:
  - `lib/services/auth.ts` vs `core/services/auth.ts`
  - `lib/services/notes.ts` vs `core/services/notes.ts` (lib has extra `getNotesByIds`)
  - `lib/services/sanitizer.ts` vs `core/services/sanitizer.ts`
- Adapters:
  - `lib/adapters/browser.ts` should be replaced by `ui/web/adapters/*` (storage, navigation, oauth, supabaseClient).
- Imports still pointing to lib:
  - `components/NoteCard.tsx` and `components/NoteView.tsx` use `@/lib/services/sanitizer`.
  - Export/import buttons and dialogs reference `@/lib/services/notes`.
  - ENEX export service references `../services/notes` instead of `@core/services/notes`.
  - Some components use `@/lib/adapters/browser` instead of `@ui/web/adapters/browser`.
  - Cypress specs still reference `@/lib/...` in some places.
- Missing extraction:
  - Selection handling (enter/exit selection, toggle, select all visible, bulk delete) is embedded in `useNoteAppController`.
  - FTS pagination helpers (accumulate results, hasMore logic) live inline in UI hook.

## Recommendations
1) **Remove lib duplicates**:
   - Delete `lib/services/auth.ts`, `lib/services/notes.ts`, `lib/services/sanitizer.ts` after consumers are switched.
   - Delete `lib/adapters/browser.ts`; use `ui/web/adapters/*`.
2) **Fix imports** (priority file targets):
   - `components/NoteCard.tsx`, `components/NoteView.tsx` -> `@core/services/sanitizer`.
   - `components/ExportButton.tsx`, `components/ExportSelectionDialog.tsx` -> `@core/services/notes`.
   - `lib/enex/export-service.ts` -> `@core/services/notes`.
   - `components/ErrorBoundary.tsx`, `components/RichTextEditor.tsx`, `components/ImportButton.tsx` -> `@ui/web/adapters/browser`.
   - Cypress specs under `cypress/component/...` pointing to `@/lib/...` -> update to `@core/...` or `@ui/web/...`.
3) **Extract helpers**:
   - Selection: create `core/services/selection.ts` (or similar) with pure helpers for toggle/select-all/bulk-diff; UI controller calls it.
   - FTS pagination: create `core/services/ftsPagination.ts` with `accumulateResults(prev, next, offset)` and `hasMore(pageSize, limit, total?)`.
4) **Adapter layout** (keep clear separation):
   ```
   core/adapters/        # abstract interfaces/factories
   ui/web/adapters/      # browser implementations
   ui/mobile/adapters/   # mobile implementations (future)
   ```
5) **Type hygiene**:
   - Avoid pulling UI-only types into core; core should depend on `@/supabase/types` and internal domain types only.

## Action Items
- [ ] Update sanitizer imports to `@core/services/sanitizer`.
- [ ] Update note services imports (Export/Import dialogs, ENEX) to `@core/services/notes`.
- [ ] Update adapter imports to `@ui/web/adapters/browser`.
- [ ] Migrate Cypress specs off `@/lib/...`.
- [x] Extract FTS pagination helper to core and wire into `useNoteAppController` (`core/services/ftsPagination.ts`).
- [x] Extract selection helper to core and wire into `useNoteAppController` (`core/services/selection.ts`).
- [ ] Remove obsolete `lib/services/*` and `lib/adapters/browser.ts` after all consumers are switched.
