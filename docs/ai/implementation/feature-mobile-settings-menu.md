---
phase: implementation
title: Implementation Guide - Mobile Settings Menu
description: Implementation notes for the redesigned mobile settings screen with native settings actions.
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Prerequisites and dependencies
  - Root dependencies installed with `npm ci`.
  - Mobile dependencies installed in `ui/mobile/`.
  - Working Supabase configuration for the mobile app.
- Environment setup steps
  - Confirm mobile app auth/session is working through `SupabaseProvider`.
  - Add Expo-native file dependencies before implementing ENEX actions.
  - Use the existing mobile theme provider and typography tokens.

## Code Structure
**How is the code organized?**

- Screen entry
  - `ui/mobile/app/(tabs)/settings.tsx`
- Settings UI components
  - `ui/mobile/components/settings/*`
- Mobile ENEX services
  - `ui/mobile/services/enexImport.ts`
  - `ui/mobile/services/enexExport.ts`
- Shared services reused
  - `core/services/apiKeysSettings.ts`
  - `core/services/wordpressSettings.ts`
  - `core/services/notes.ts`
  - `core/enex/enex-builder.ts`
  - `core/enex/note-creator.ts`

## Implementation Notes
**Key technical details to remember:**

### Delivered implementation
- `ui/mobile/app/(tabs)/settings.tsx` now renders a card-based settings shell with a horizontally scrollable tab rail.
- New tab panels were added for:
  - `My Account`
  - `Import .enex file`
  - `Export .enex file`
  - `WordPress settings`
  - `API Keys`
- The old `ComingSoon`-driven mobile settings entries are no longer used by this screen.
- Mobile-native ENEX helpers/services were added in:
  - `ui/mobile/lib/enexMobile.ts`
  - `ui/mobile/services/enexImport.ts`
  - `ui/mobile/services/enexExport.ts`
- Shared UI primitives were extended so the common mobile `Button` now exposes `accessibilityRole="button"` for better accessibility/testability.

### Core Features
- Horizontal tabs
  - Use a horizontally scrolling `ScrollView` for the tab rail.
  - Keep labels readable; do not shrink text to fit the screen width.
  - Active tab should render as a pill/card state similar to the screenshot.

- Account panel
  - Show current user email in a dedicated card.
  - Keep theme mode switching accessible inside this panel.
  - Replace the old modal-only delete flow with an inline destructive confirmation section that matches the screenshot.

- API keys panel
  - Reuse `ApiKeysSettingsService`.
  - Keep current validation rules:
    - empty key + unconfigured => error;
    - empty key + configured => no-op/success message;
    - non-empty key => save and clear field.

- WordPress panel
  - Reuse `WordPressSettingsService`.
  - Mirror current web validation:
    - site URL and username required;
    - initial setup requires application password;
    - trailing slash trimmed from site URL;
    - stored password remains valid when the field is left empty.

- ENEX import
  - Pick a single `.enex` document from the device.
  - On Android, use a broad picker MIME type and validate the chosen file in-app because `.enex` providers often do not advertise a stable XML MIME type.
- Reuse shared import settings metadata from `core/enex` so web and mobile stay aligned on duplicate strategy labels and defaults.
- Fail closed for duplicate strategies that require a snapshot of existing note titles:
  - `skip` and `replace` now stop with a user-facing error if existing-title lookup is unavailable;
  - `prefix` remains available and falls back to per-note duplicate lookup when the shared snapshot is unavailable.
- Read file content as UTF-8 text.
  - Parse note entries with a RN-safe XML parser.
  - Preserve title, tags, timestamps, and note body HTML where possible.
  - Create notes through `NoteCreator` using the user-selected duplicate strategy plus `skip duplicates inside imported file(s)`.
  - Surface in-panel progress as `processed / total notes` while notes are being imported.

- ENEX export
  - Read user notes through `NoteService`.
  - Convert notes into `ExportNote[]` and build XML through `EnexBuilder`.
  - Write the result to a temporary file and trigger native share/save flow.
  - Surface staged progress while exporting: loading notes, building archive, saving file, opening share sheet.

### Patterns & Best Practices
- Keep panel state localized to each feature component.
- Prefer explicit `loading`, `saving`, `successMessage`, and `errorMessage` states over implicit status logic.
- Add small comments only where mobile/native behavior is non-obvious.
- Keep remote settings loading inside panel components so unopened tabs do not fetch on first render.

## Integration Points
**How do pieces connect?**

- `settings.tsx` owns selected tab state and composes all panels.
- Each remote settings panel uses the existing Supabase-backed service classes.
- ENEX services use the active mobile Supabase client and authenticated user from the provider layer.

## Error Handling
**How do we handle failures?**

- Render inline error banners inside each panel.
- Preserve user-entered form values after failed saves.
- Show a clear import/export error if:
  - no file is selected;
  - file parsing fails;
  - native share/save is unavailable;
  - note creation/export generation fails.

## Implementation Validation
**What was verified during implementation?**

- `npm --prefix ui/mobile run type-check`
- `npm --prefix ui/mobile run lint`
- `npx jest --runInBand tests/unit/mobileEnexHelpers.test.ts tests/integration/settingsScreen.test.tsx` in `ui/mobile/`
- `npx ai-devkit@latest lint --feature mobile-settings-menu`

## Environment Notes
**What setup details mattered in this workspace?**

- Root `npm ci` completed successfully.
- `ui/mobile` dependency bootstrap required a fallback from `npm ci` to `npm install` on Windows because the existing `node_modules` directory produced an `ENOTEMPTY` error during cleanup.

## Performance Considerations
**How do we keep it fast?**

- Do not eagerly load every remote panel on initial screen render.
- Load WordPress/API key status when their panel is shown or on explicit user action.
- Avoid re-rendering every panel on every input change by keeping panel logic isolated.

## Security Notes
**What security measures are in place?**

- Continue using existing encrypted backend storage for API keys and WordPress passwords.
- Do not echo stored secrets back into input fields.
- Guard destructive account deletion behind an explicit acknowledgement checkbox.
