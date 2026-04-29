---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Public Note Links Planning

## Milestones

- [x] Milestone 1: Requirements/design/planning reviewed and feature-scoped docs validate.
- [x] Milestone 2: Supabase schema/RPC and shared core service implemented.
- [x] Milestone 3: Web owner share dialog and public read-only page implemented.
- [x] Milestone 4: Unit/component checks and lifecycle review complete.
- [x] Milestone 5: Mobile owner share action and native sheet implemented.

## Task Breakdown

### Phase 1: Foundation

- [x] Create feature docs in requirements/design/planning/implementation/testing.
- [x] Add Supabase migration for `note_share_links`, RLS, indexes, and public-note RPC.
- [x] Add shared core types/service for public note share links.

### Phase 2: Web Owner Experience

- [x] Add "Share note" menu item to the existing note three-dot menu.
- [x] Implement `ShareNoteDialog` with "Anyone with the link can view", generated URL, copy action, loading/error states, and retry.
- [x] Ensure existing AI index, delete, edit, and WordPress menu actions remain unchanged.

### Phase 3: Public Viewer Experience

- [x] Add `/share/?token=...` route outside `NotesShell`.
- [x] Render title, sanitized note content, and non-clickable tags in a dedicated read-only layout.
- [x] Add a public-only theme toggle so shared-note readers can switch light/dark mode without private navigation.
- [x] Handle missing/inactive links with a restrained not-found state.
- [x] Set public page metadata to `noindex`.

### Phase 4: Verification

- [x] Add core unit tests for link creation/reuse/public fetch/URL builder.
- [x] Add web tests for dialog/menu and public page read-only constraints where practical.
- [x] Run type-check, unit tests, lint, and lifecycle checks.

### Phase 5: Mobile Owner Experience

- [x] Add "Share note" to the mobile note options sheet.
- [x] Implement a mobile `ShareNoteDialog` that generates/reuses the public view link and opens the native share sheet.
- [x] Resolve mobile public web origin from explicit config or editor WebView URL.
- [x] Add mobile component/integration tests for the share action and sheet behavior.

## Dependencies

- Supabase schema changes must land before core service integration.
- Core service must be in place before web dialog and public route.
- Mobile share UI depends on the existing shared core service and public web route.
- Public route depends on sanitizer and Supabase web client configuration.
- Static export requires query-token routing rather than dynamic route segments.
- Tests depend on stable service/component contracts.

## Timeline & Estimates

- Foundation and docs: 0.5 day.
- Schema + core service: 0.5 to 1 day.
- Web owner dialog: 0.5 day.
- Public viewer page: 0.5 day.
- Tests/review: 0.5 to 1 day.

## Risks & Mitigation

- Public data leakage through RLS/RPC: keep public access behind a narrow RPC and test the projection shape.
- Duplicate share links: enforce one active view link per note and reuse existing links in service.
- XSS in public content: reuse sanitizer and render sanitized HTML only.
- UI leakage from app shell: implement a separate route and presentational page, not `NotesShell`.
- Public theme control drift: reuse the existing web theme provider/toggle instead of creating a separate storage key.
- Mobile origin drift: resolve public web origin through mobile config rather than hardcoding a web domain.
- Mobile reuse drift: keep business logic in `core` and inject platform-specific origin/client from web/mobile.

## Process Notes

- The feature branch intentionally uses the main repository checkout without a separate worktree per user request.

## Resources Needed

- Existing Supabase migration setup.
- Existing Radix dialog/dropdown/button/input primitives.
- Existing React Native modal/action sheet patterns and mobile theme tokens.
- Existing `core/services/sanitizer.ts`.
- Jest/Cypress test harness already present in the repo.

## Progress Summary

Phase 1-5 lifecycle docs are complete and validated. The Supabase migration now defines `note_share_links`, owner-only RLS policies, indexes, and the public `get_public_note_by_token` RPC. The shared `PublicNoteShareService` and URL builder are implemented in core. The web note menu now exposes "Share note" and opens the generation/copy dialog. Build validation found that `output: 'export'` cannot use `/share/[token]`, so the public route was revised to `/share/?token=...` while keeping a dedicated read-only page with non-clickable tags, no app shell, a public-only theme toggle, and `noindex` metadata. The mobile note options sheet now exposes "Share note" and opens a native share sheet powered by the same core service and public web URL builder. Unit tests, type checks, ESLint, Deno checks, static-export build, mobile type/lint checks, and feature-doc lint now pass. Remaining operational gap: verify Supabase migration/RLS/RPC against a live local or linked database.
