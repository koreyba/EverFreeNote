# Core/UI Separation Analysis

## Purpose
Assess how well the project separates core logic (services, domain, adapters) from UI and identify concrete steps to finish the refactor.

## Current State
- **Core intent**: `core/` holds business logic (auth, notes, search, sanitizer), adapters, and utilities that should be UI-agnostic.
- **UI intent**: `ui/web/` consumes core via adapters (storage, navigation, OAuth, Supabase client).
- **Lib overlap**: `lib/` now only contains constants/enex/providers/supabase/utils; service/adapter duplicates removed.
- **FTS/search**: Core search service (`core/services/search.ts`) is used by UI hooks. FTS pagination/total handling is extracted to `core/services/ftsPagination.ts`.
- **Selection logic**: Selection helpers are extracted to `core/services/selection.ts`.

## Gaps and Duplicates
- Adapters:
  - Ensure remaining references (code/docs) use `@ui/web/adapters/*` (storage, navigation, oauth, supabaseClient).

## Recommendations
1) **Remove lib duplicates**: done (services/adapters removed from `lib/`).
2) **Fix imports/docs**:
   - Docs updated to reference `@core/...` or `@ui/web/...`; keep this consistent going forward.
3) **Adapter layout** (keep clear separation):
   ```
   core/adapters/        # abstract interfaces/factories
   ui/web/adapters/      # browser implementations
   ui/mobile/adapters/   # mobile implementations (future)
   ```
4) **Type hygiene**:
   - Avoid pulling UI-only types into core; core should depend on `@/supabase/types` and internal domain types only.

## Action Items
- [x] Migrate Cypress specs off `@/lib/...` (now use `@ui/web/providers/SupabaseProvider` etc.).
- [x] Extract FTS pagination helper to core and wire into `useNoteAppController` (`core/services/ftsPagination.ts`).
- [x] Extract selection helper to core and wire into `useNoteAppController` (`core/services/selection.ts`).
- [x] Remove obsolete `lib/services/*` and `lib/adapters/browser.ts` after all consumers are switched (services/adapters no longer present under `lib/`).
- [x] Update docs that still reference `@/lib/...` paths to the new core/ui paths.
