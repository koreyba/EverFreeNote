---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target (default: 100% of new/changed code)
- Integration test scope (critical paths + error handling)
- End-to-end test scenarios (key user journeys)
- Alignment with requirements/design acceptance criteria

## Unit Tests
**What individual components need testing?**

### Component/Module 1
- [ ] Test case 1: `slugifyLatin` builds deterministic latin slug from note title (covers transliteration + normalization)
- [ ] Test case 2: `slugifyLatin` handles empty/special-only input (covers fallback branch)
- [ ] Additional coverage: slug validation rules (length/charset/conflict handling branch mapping)

### Component/Module 2
- [ ] Test case 1: `wordpressSettings` service creates/updates integration config with valid inputs
- [ ] Test case 2: `wordpressSettings` service rejects invalid URL / missing required fields
- [ ] Additional coverage: visibility flag logic for showing/hiding export button

### Component/Module 3
- [ ] Test case 1: `WordPressExportDialog` initializes with note tags and remembered categories
- [ ] Test case 2: editing tags in dialog does not mutate original note tags
- [ ] Additional coverage: inline error rendering and state preservation on failed submit

### Component/Module 4
- [ ] Test case 1: bridge `get_categories` maps WordPress category response correctly
- [ ] Test case 2: bridge `export_note` maps WordPress slug conflict to user-facing error code/message with no auto-suffix behavior
- [ ] Additional coverage: auth failure and timeout error normalization

## Integration Tests
**How do we test component interactions?**

- [ ] Integration scenario 1: configured user sees per-note export button in web and can open modal
- [ ] Integration scenario 1.1: button appears in `NoteView` header near `Edit/Delete`
- [ ] Integration scenario 1.2: button appears in `NoteEditor` header near `Read`
- [ ] Integration scenario 2: unconfigured user does not see export button
- [ ] API endpoint tests for `wordpress-bridge` actions (`get_categories`, `export_note`)
- [ ] Integration scenario 3 (failure mode / rollback): WordPress returns slug conflict and UI shows specific recoverable error
  - and requires manual slug edit before re-submit

## End-to-End Tests
**What user flows need validation?**

- [ ] User flow 1: configure WordPress settings -> open note -> export successfully
- [ ] User flow 2: category selection remembered per user across repeated exports
- [ ] Critical path testing: category fetch + tag edit + slug edit + export submit
- [ ] WordPress 6.8.3 compatibility smoke test (current user environment)
- [ ] WordPress 6.9.1 compatibility smoke test (post-upgrade)
- [ ] Regression of adjacent features: existing ENEX export/import and note edit flows remain unaffected

## Test Data
**What data do we use for testing?**

- Test fixtures and mocks
  - Mock notes with titles/tags/content variants.
  - Mock WordPress category payloads and post creation responses.
  - Mock WordPress error payloads (401/403/409/422/500).
- Seed data requirements
  - User with configured integration.
  - User without integration.
  - Notes with and without tags/content.
- Test database setup
  - Seed `wordpress_integrations` and `wordpress_export_preferences` for integration tests.
  - Ensure RLS policies are active in test environment.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Coverage commands and thresholds (`npm run test -- --coverage`)
- Coverage gaps (files/functions below 100% and rationale)
- Links to test reports or dashboards
- Manual testing outcomes and sign-off
- Latest quick check: `npx tsc --noEmit` after implementation

## Manual Testing
**What requires human validation?**

- UI/UX testing checklist (include accessibility)
  - [ ] Export button appears only when integration is configured.
  - [ ] Export button is not present in mobile app paths.
  - [ ] Modal opens quickly and shows category loading state.
  - [ ] Category multi-select works and remembers last selection.
  - [ ] Tag add/remove works in modal and does not alter note tags after close.
  - [ ] Slug is auto-suggested and editable.
  - [ ] Errors are shown inline and are understandable.
  - [ ] Success state provides clear completion signal.
- Browser/device compatibility
  - [ ] Chrome/Edge
  - [ ] Firefox
  - [ ] Safari (if supported by project matrix)
- Smoke tests after deployment
  - [ ] Real WordPress staging export creates expected post content/title/tags/categories.

## Performance Testing
**How do we validate performance?**

- Load testing scenarios
  - Repeated exports from a session with many categories.
  - Concurrent exports from multiple users.
- Stress testing approach
  - Simulate WordPress slow responses/timeouts.
  - Validate UI remains responsive and cancel/retry behavior works.
- Performance benchmarks
  - Category fetch under 2 seconds on typical network.
  - Request loading state rendered within 100ms.
  - Export success/failure feedback rendered immediately after response (no UI freeze while waiting).

## Bug Tracking
**How do we manage issues?**

- Issue tracking process
  - Log defects with reproducible payload and WordPress response context.
- Bug severity levels
  - Critical: cannot export with valid config.
  - High: wrong content/categories/tags exported.
  - Medium: poor error messaging or retry behavior.
  - Low: minor UX issues.
- Regression testing strategy
  - Re-run ENEX export/import and note CRUD tests after merge.
