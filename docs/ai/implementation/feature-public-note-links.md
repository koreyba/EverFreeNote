---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Public Note Links Implementation Guide

## Development Setup

- Work on branch `feature-public-note-links` from the local repository root; this feature intentionally avoided a separate worktree per user request.
- Dependencies are bootstrapped with `npm ci`.
- Validate feature docs with `npx ai-devkit@latest lint --feature public-note-links`.

## Code Structure

- Core service: `core/services/publicNoteShare.ts`.
- Core tests: `core/tests/unit/core-services-publicNoteShare.test.ts`.
- Database migration: `supabase/migrations/*_add_public_note_links.sql`.
- Owner UI: `ui/web/components/features/notes/ShareNoteDialog.tsx` and existing note action menu components.
- Mobile owner UI: `ui/mobile/components/ShareNoteDialog.tsx`, `ui/mobile/components/NoteIndexMenu.tsx`, and the note editor screen.
- Public UI: `app/share/page.tsx`, `ui/web/components/features/public/PublicSharePageClient.tsx`, and `ui/web/components/features/public/PublicNotePage.tsx`.
- Public shell affordances: `ui/web/components/features/public/PublicPageHeader.tsx` provides the sticky public-only brand row and theme toggle.
- Mobile config: `ui/mobile/adapters/config.ts` resolves the public web origin used to build share URLs.

## Implementation Notes

### Core Features

- Generate high-entropy tokens with `crypto.randomUUID()` plus normalization or database-side `gen_random_uuid()`.
- `getOrCreateViewLink` should first load an existing active view link for `(note_id, user_id)` before inserting.
- `getPublicNoteByToken` should call the public RPC and return a narrow `PublicNote`.
- `buildPublicNoteUrl` should accept an injected origin to keep browser globals out of core and emit `/share/?token=...` for static export compatibility.

### Patterns & Best Practices

- Keep Supabase query details inside core services, matching existing `NoteService` style.
- Keep web UI state local to the dialog; do not expand global note controller state unless needed.
- Keep mobile share state local to the share sheet and note editor screen; do not couple it to AI index state.
- Use existing Radix/shadcn wrappers for dialog, dropdown, button, input, badges, and toast/copy feedback.
- Public tags render as plain badges/spans, not buttons or anchors.
- Reuse the existing web `ThemeToggle` and root `ThemeProvider` for public theme switching; do not add private shell/navigation just to expose theme controls.

## Integration Points

- `MoreActionsMenu` / note view/editor menus receive a share callback and selected note.
- `ShareNoteDialog` receives `noteId`, current origin, and a Supabase-backed core service.
- Mobile `ShareNoteDialog` receives `noteId`, resolves the public web origin through mobile config, and uses the same Supabase-backed core service.
- Public route creates a Supabase browser/server-compatible client and calls core public reader.

## Error Handling

- Link generation failures show inline dialog error with retry.
- Clipboard failures keep the link visible so users can manually copy it.
- Mobile native share failures keep the link visible/selectable so users can manually copy it.
- Missing/inactive tokens render a not-found page, not the authenticated app.

## Performance Considerations

- Public token lookup uses indexed token query/RPC.
- Public route fetches exactly one note projection.
- Dialog performs link generation on demand, not during note list rendering.

## Security Notes

- RLS protects owner operations on `note_share_links`.
- Public RPC returns only title, description/content, tags, and date metadata for one active token.
- Public page uses sanitized note HTML and `noindex` metadata.
- Public viewer never receives authenticated note list/search APIs from the page UI.
- Mobile owner UI only creates the link; it does not add native public-note browsing or private note access for recipients.
