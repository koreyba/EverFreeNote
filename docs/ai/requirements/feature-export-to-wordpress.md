---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- EverFreeNote users cannot publish notes to WordPress quickly from the app.
- Publishing currently requires manual copy/paste of title/content/tags and manual category/slug setup in WordPress.
- Affected users:
  - Web users who maintain a WordPress blog and want to reuse notes as posts.
  - Users who need fast publish flow with minimal steps.
- Current workaround:
  - Manual transfer into WordPress editor for every note.
  - Repeated manual category and slug setup.
  - No centralized storage of WordPress integration settings.

## Goals & Objectives
**What do we want to achieve?**

- Primary goals
  - Add user-level WordPress integration settings (credentials and site connection fields required for API publishing).
  - Show `Export to WordPress` button for notes in web UI only when integration is configured.
  - Show export entry point on both web note screens:
    - `NoteView` header next to `Edit/Delete`.
    - `NoteEditor` header next to `Read`.
  - Export exactly one selected note per action.
  - Export payload includes note title, note content, and export-time tag set.
  - Export default post status is `publish`.
  - On slug conflict, return explicit error and require manual user fix (no automatic slug mutation).
  - On export click, show lightweight popup that:
    - Loads available WordPress categories.
    - Lets user choose categories.
    - Lets user edit title for export (without mutating note title in EverFreeNote).
    - Lets user edit tags for export (without mutating note tags in EverFreeNote).
    - Suggests slug from note title (latin transliteration) with manual edit.
  - Persist selected categories so popup preselects them next time.
  - Provide clear, actionable error feedback inside popup.

- Secondary goals
  - Keep export interaction fast (few clicks from note to published post).
  - Keep UX minimal and responsive.
  - Ensure behavior is deterministic and easy to test.

- Non-goals (what's explicitly out of scope)
  - Mobile app support (explicitly web-only for this feature).
  - Bulk export of multiple notes in one operation.
  - Bidirectional sync with WordPress.
  - Editing already exported WordPress posts from EverFreeNote.
  - Media migration/re-upload optimization beyond existing note HTML behavior.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a web user with configured WordPress integration, I want to export a specific note so that it becomes a WordPress post quickly.
- As a user, I want to choose categories in a popup fetched from my blog so that the post is filed correctly.
- As a user, I want selected categories to be remembered so repeated exports are faster.
- As a user, I want to adjust export tags in popup so WordPress post tags can differ from notebook tags.
- As a user, I want to adjust export title in popup so WordPress post title can differ from notebook title.
- As a user, I want to edit a suggested slug so URL is clean and under my control.
- As a user, I want clear error messages (including slug conflict) so I can fix issues without guessing.

- Key workflows and scenarios
  - User fills WordPress settings in user settings panel.
  - UI detects valid setup and shows `Export to WordPress` on both web note screens:
    - in read mode near `Edit/Delete`;
    - in edit mode near `Read`.
  - User opens popup from note export button.
  - App fetches categories and renders preselected remembered categories.
  - User adjusts title/categories/tags/slug and confirms export.
  - App creates WordPress post and returns success or specific error.

- Edge cases to consider
  - WordPress settings missing or invalid.
  - API authentication failure.
  - WordPress site unreachable / timeout.
  - Category fetch succeeds but returns empty list.
  - Duplicate slug conflict.
  - Tag input empty after user edits.
  - Note has empty title/content.
  - User closes popup during request.

## Success Criteria
**How will we know when we're done?**

- Measurable outcomes
  - Users can configure WordPress integration fields in settings.
  - Export button is visible only on web and only when integration is configured.
  - One-click export entry point exists per note.
  - Popup loads categories and preselects remembered categories.
  - Export sends title/content/tags and selected categories with chosen slug.
  - Export-time tag edits do not alter note tags in EverFreeNote.
  - Error states are shown in popup with specific messages.

- Acceptance criteria
  - With valid setup, exporting a note creates a new WordPress post.
  - Without setup, export button is not rendered.
  - With setup, export button is rendered in both `NoteView` and `NoteEditor` headers.
  - Category selection persists and is restored on next popup open.
  - Slug suggestion is latinized from title and user-editable.
  - Duplicate slug returns clear validation error in popup and export is not auto-corrected.
  - Feature is unavailable in mobile UI.

- Performance benchmarks (if applicable)
  - Popup opens in <200ms on local state render.
  - Loading indicator appears in <100ms after category/export request starts.
  - Category fetch target is <2s on normal network; timeout path has clear recoverable error.
  - No hard SLA on external WordPress response; UI must remain responsive and keep user-informed progress/error state.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints
  - Existing stack: Next.js web UI + Supabase backend/services.
  - Must preserve existing note model and ENEX export behavior.
  - WordPress REST API authentication depends on site configuration and permissions.

- Business constraints
  - No mobile implementation in this iteration.
  - Keep UX lightweight and fast for frequent use.

- Time/budget constraints
  - Implement with minimal architecture disruption.
  - Reuse existing settings UI patterns and service layers where possible.

- Assumptions we're making
  - WordPress target supports REST API endpoints for categories/tags/posts.
  - Target WordPress is version 5.6+ with Application Passwords support.
  - Confirmed user environment currently runs WordPress `6.8.3` and plans upgrade to `6.9.1`.
  - WordPress integration endpoint is served over HTTPS.
  - User provides valid API credentials and site URL.
  - Credentials are: `site_url`, `wp_username` (login), `application_password`.
  - Exporting user has permissions to create posts and assign selected terms (categories/tags).
  - Exported note HTML is acceptable as WordPress post content.
  - Remembered category selection is stored per user.

## Questions & Open Items
**What do we still need to clarify?**

- Unresolved questions
  - Should user be allowed to create new categories from popup, or only choose existing?
  - Do we need optional excerpt/featured image in this phase?

- Items requiring stakeholder input
  - No open stakeholder decisions currently blocking implementation.

- Research needed
  - Exact mapping between WordPress error payloads and localized user-facing messages.
  - Best transliteration strategy for slug generation (library choice, locale behavior).
