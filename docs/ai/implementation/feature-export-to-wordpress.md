---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Prerequisites and dependencies
  - Supabase project access for migrations and edge functions.
  - WordPress site URL + username + application password for test account.
  - Existing web app and Supabase local/dev environment.
- Environment setup steps
  - Apply new migrations for WordPress integration tables.
  - Regenerate `supabase/types.ts` after schema update.
  - Deploy/run `wordpress-bridge` function in development.
  - Add encryption secret for password-at-rest handling in function env.
- Configuration needed
  - WordPress REST endpoint reachable from edge runtime.
  - Feature is web-only; do not add mobile routes/components for this phase.

## Code Structure
**How is the code organized?**

- Directory structure
  - `core/services/wordpressSettings.ts` (new)
  - `core/services/wordpressExport.ts` (new)
  - `ui/web/components/WordPressSettingsSection.tsx` (new)
  - `ui/web/components/WordPressExportDialog.tsx` (new)
  - `ui/web/components/ExportToWordPressButton.tsx` (new)
  - `supabase/functions/wordpress-bridge/index.ts` (new)
  - `supabase/migrations/*_wordpress_integration.sql` (new)
- Module organization
  - Keep WordPress-specific logic isolated from ENEX modules.
  - UI should call app service layer; app service calls edge function.
  - Avoid direct WordPress calls from UI components.
- Naming conventions
  - Use `WordPress*` prefix for feature components/services.
  - Use verb-based edge actions: `get_categories`, `export_note`.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Feature 1: User WordPress settings
  - Add settings form in existing web settings area.
  - Store `site_url`, `wp_username`, `application_password` securely.
  - Support edit/update and enabled state.

- Feature 2: Conditional per-note export entry point
  - Render button only in web and only when integration exists/enabled.
  - Ensure entry point maps to exactly one note id.
  - Place trigger in:
    - `NoteView` header near `Edit/Delete`.
    - `NoteEditor` header near `Read`.

- Feature 3: Lightweight export modal
  - On open: request categories + remembered selection.
  - Editable tags: initialize from note tags; local modal state only.
  - Slug: prefill latinized title, allow manual edits.
  - Submit: call export action and show success/error inline.

- Feature 4: Bridge and WordPress API calls
  - Resolve note data by note id and authenticated user.
  - Create post with fixed default `status: "publish"` in this phase.
  - Normalize WordPress errors (auth failure, slug conflict, validation errors).
  - For slug conflict, return explicit error only; do not auto-modify slug.
  - Return concise payload for UI messaging.

### Patterns & Best Practices
- Design patterns being used
  - Service layer abstraction for integration calls.
  - Bridge pattern for third-party API communication.
  - Controlled modal form state with explicit submit lifecycle.
- Code style guidelines
  - Follow existing TypeScript strict-mode patterns.
  - Keep UI logic declarative and avoid side effects in render.
- Common utilities/helpers
  - Add `slugifyLatin(title)` helper with deterministic output.
  - Reuse existing toast/dialog/error patterns from web components.

## Integration Points
**How do pieces connect?**

- API integration details
  - UI -> Supabase edge function for categories/export.
  - UI -> Supabase tables for settings/preferences.
- Database connections
  - `wordpress_integrations` for credentials/config.
  - `wordpress_export_preferences` for remembered categories.
  - Existing `notes` table for title/content/tags export source.
- Third-party service setup
  - WordPress application password auth in bridge.
  - HTTPS-only outbound requests.

## Error Handling
**How do we handle failures?**

- Error handling strategy
  - Validate inputs before submit (slug/tags/categories).
  - Map upstream HTTP/API errors to user-facing messages.
  - Keep modal open on failure and preserve entered state.
- Logging approach
  - Log full error context in bridge (without exposing secrets).
  - Return safe error codes/messages to client.
- Retry/fallback mechanisms
  - Retry category fetch and export for transient network failures.
  - Show explicit retry actions in UI.

## Performance Considerations
**How do we keep it fast?**

- Optimization strategies
  - Fetch categories on modal open only.
  - Cache latest categories in component state for same session.
  - Keep payload minimal (`noteId`, `slug`, `tags`, `categoryIds`).
- Caching approach
  - Client-side short-lived cache for categories per session.
  - Persist remembered category IDs per user in DB.
- Query optimization
  - Select only required note fields for export.
  - Use primary-key lookups for settings/preferences.
- Resource management
  - Cancel in-flight category fetch on modal close where possible.

## Security Notes
**What security measures are in place?**

- Authentication/authorization
  - Require authenticated Supabase session for all operations.
  - Enforce owner-only RLS for settings/preferences and note reads.
- Input validation
  - Validate site URL format, slug charset, and tag lengths.
  - Validate category id list as integer array.
- Data encryption
  - Encrypt app password at rest and decrypt only in bridge runtime.
  - Never return plaintext password to client.
- Secrets management
  - Store encryption key in edge function secrets/env.
  - Redact sensitive fields from logs and API responses.

## Implementation Status (2026-02-16)
- Database
  - Added migration `supabase/migrations/20260216100000_add_wordpress_integration.sql`.
  - Created tables:
    - `public.wordpress_integrations`
    - `public.wordpress_export_preferences`
  - Added owner-only RLS policies for both tables.
  - Added `updated_at` triggers for both tables.
- Supabase types
  - Updated `supabase/types.ts` with both WordPress tables.
- Edge functions
  - Added `supabase/functions/wordpress-settings-status/index.ts`.
  - Added `supabase/functions/wordpress-settings-upsert/index.ts`.
  - Added `supabase/functions/wordpress-bridge/index.ts`.
  - Added per-function `deno.json` and `import_map.json`.
  - `wordpress-bridge` supports:
    - `action: "get_categories"`
    - `action: "export_note"`
  - Password-at-rest is encrypted/decrypted using `WP_CREDENTIALS_KEY`.
- Core services
  - Added `core/services/wordpressSettings.ts`.
  - Added `core/services/wordpressExport.ts` with normalized bridge error handling.
- Web UI
  - Added `ui/web/components/features/wordpress/WordPressSettingsDialog.tsx`.
  - Added `ui/web/components/features/wordpress/WordPressExportDialog.tsx`.
  - Added `ui/web/components/features/wordpress/ExportToWordPressButton.tsx`.
  - Added slug/tag helpers in `ui/web/lib/wordpress.ts`.
  - Integrated button visibility + placement:
    - `ui/web/components/features/notes/NoteView.tsx` (near `Edit/Delete`)
    - `ui/web/components/features/notes/NoteEditor.tsx` (near `Read`)
  - Added settings entry and dialog mount in `ui/web/components/features/notes/Sidebar.tsx`.
  - Added status loading and propagation in `ui/web/components/features/notes/NotesShell.tsx`.
- Scope guard
  - No mobile UI/components were modified for this feature.
