---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Finalize requirements/design docs and confirm remaining open questions
- [x] Milestone 2: Deliver backend foundation (DB schema, RLS, wordpress bridge)
- [x] Milestone 3: Deliver web UI flow (settings + per-note export modal + error handling)
- [ ] Milestone 4: Complete tests, verification, and documentation updates (Cypress execution blocked in current environment)

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Add DB migrations for `wordpress_integrations` and `wordpress_export_preferences`
- [x] Task 1.2: Add/update Supabase generated types for new tables
- [x] Task 1.3: Implement RLS policies and ownership guards
- [x] Task 1.4: Create core services for settings/preferences CRUD

### Phase 2: Core Features
- [x] Task 2.1: Implement `wordpress-bridge` Edge Function (`get_categories`, `export_note`)
- [x] Task 2.2: Implement WordPress API client utility in bridge with normalized errors
- [x] Task 2.3: Build web `WordPressSettingsSection` and save/validation flow
- [x] Task 2.4: Add per-note `Export to WordPress` trigger visibility logic (web-only)
- [x] Task 2.4.1: Place export trigger in `NoteView` header near `Edit/Delete`
- [x] Task 2.4.2: Place export trigger in `NoteEditor` header near `Read`
- [x] Task 2.5: Build lightweight export modal (categories, editable tags, editable slug, inline errors)
- [x] Task 2.6: Persist and restore remembered category selection

### Phase 3: Integration & Polish
- [x] Task 3.1: Wire final UX states (loading/success/failure/retry)
- [x] Task 3.2: Add slug validation and duplicate-slug manual-fix messaging (no auto-suffix)
- [x] Task 3.3: Ensure no mobile code path is affected (explicit guard / no UI changes)
- [x] Task 3.4: Update docs/ai implementation/testing files with final behavior and coverage

## Dependencies
**What needs to happen in what order?**

- Task dependencies and blockers
  - DB schema and RLS must land before settings UI and bridge integration.
  - Bridge endpoint must exist before modal integration testing.
  - Visibility logic depends on settings availability query.
- External dependencies (APIs, services, etc.)
  - WordPress REST API compatibility and credentials.
  - Supabase Edge Function deployment environment.
- Team/resource dependencies
  - Access to WordPress staging instance for integration tests.
  - Access to Supabase project for migration and function deployment.

## Timeline & Estimates
**When will things be done?**

- Estimated effort per task/phase
  - Phase 1: 0.5-1 day
  - Phase 2: 1.5-2.5 days
  - Phase 3: 1-1.5 days
- Target dates for milestones
  - M1: Day 1
  - M2: Day 2
  - M3: Day 3-4
  - M4: Day 4-5
- Buffer for unknowns
  - +1 day buffer for WordPress auth/CORS/env-specific issues.

## Risks & Mitigation
**What could go wrong?**

- Technical risks
  - WordPress site variance (plugins/security/firewall) can alter API behavior.
  - Mitigation: normalize errors, add robust retries/timeouts, test against staging.
- Resource risks
  - No stable WordPress staging for integration testing.
  - Mitigation: keep mock-based tests comprehensive and schedule manual validation window.
- Dependency risks
  - Credentials storage/security review may require extra changes.
  - Mitigation: implement encrypted-at-rest storage and server-side use only from start.
- Mitigation strategies
  - Feature flag export button visibility behind valid settings check.
  - Incremental rollout on web only.

## Resources Needed
**What do we need to succeed?**

- Team members and roles
  - Full-stack engineer (UI + Supabase + edge function).
  - Reviewer familiar with Supabase security and RLS.
- Tools and services
  - Supabase CLI/project access.
  - WordPress test instance with API credentials.
- Infrastructure
  - Edge function runtime and environment secrets for encryption key.
- Documentation/knowledge
  - WordPress REST API docs for posts/categories/tags/auth.
  - Existing project patterns for settings and dialogs.
