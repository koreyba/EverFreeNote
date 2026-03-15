---
phase: testing
title: Testing Strategy - Mobile Settings Menu
description: Testing plan for the redesigned mobile settings screen and its native settings actions.
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Unit test coverage target: 100% of new/changed mobile helper logic where practical.
- Integration test scope: redesigned settings screen, tab switching, and remote settings flows.
- End-to-end/manual scope: native file selection and sharing behavior on device/simulator.

## Unit Tests
**What individual components need testing?**

### Mobile ENEX import helpers
- [x] Parse title, timestamps, tags, and note body from ENEX XML.
- [x] Report import progress as `processed / total` while notes are created.
- [x] Respect duplicate strategy and `skip duplicates inside imported file(s)` during mobile import orchestration.
- [x] Stop `skip` / `replace` imports when existing-title lookup is unavailable, while allowing `prefix` to fall back safely.
- [x] Keep `prefix` fallback stable when snapshot lookup is unavailable, so duplicate decisions do not change mid-import after earlier writes.
- [x] Fail note creation when fallback duplicate lookup errors, instead of importing as if no duplicate existed.
- [ ] Handle malformed XML / empty note payloads with user-facing errors.
- [ ] Additional coverage: duplicate title handling path through import orchestration.

### Mobile ENEX export helpers
- [x] Build export payload from note data with deterministic file naming.
- [x] Report staged export progress for loading, building, and writing.
- [ ] Handle empty note collections gracefully.
- [ ] Additional coverage: temporary file creation / share precondition failures.

### Settings panel logic
- [x] API keys validation state transitions.
- [x] WordPress settings validation and URL normalization.
- [x] Import panel constrains selection to `.enex` flows and rejects other file names before import.
- [x] Import panel passes selected duplicate-handling settings into the mobile import service.
- [x] Android-safe picker configuration keeps `.enex` files selectable even when the provider does not advertise an XML MIME type.
- [x] Export panel copy and share hand-off stay aligned with the "export all notes" mobile behavior.
- [ ] Additional coverage: account deletion acknowledgement gating.

## Integration Tests
**How do we test component interactions?**

- [x] Settings screen renders the horizontal tab menu with all requested tabs.
- [x] Switching tabs updates the visible panel content.
- [ ] `My Account` panel shows email and prevents delete until acknowledgement is checked.
- [x] `API Keys` panel loads status, saves successfully, and renders inline errors on failure.
- [x] `WordPress settings` panel loads status, validates fields, and saves successfully.
- [x] `Import .enex file` panel handles picker success and failure states with mocked native modules.
- [x] `Export .enex file` panel handles export/share success and failure states with mocked native modules.

## End-to-End Tests
**What user flows need validation?**

- [ ] User flow 1: open settings -> switch across all tabs -> save API key and WordPress settings.
- [ ] User flow 2: import `.enex` from device storage and verify imported note appears in notes list.
- [ ] User flow 3: export notes to `.enex` and confirm native share sheet opens.
- [ ] Regression of adjacent features: theme switching and account sign-out still work.

## Test Data
**What data do we use for testing?**

- Mock authenticated user with email.
- Mock Supabase function responses for API key and WordPress endpoints.
- Small ENEX XML fixture with one and multiple notes.
- Note fixtures for export generation, including tags and HTML description.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- `npm --prefix ui/mobile test -- --runInBand`
- `npm --prefix ui/mobile test:coverage`
- `npm --prefix ui/mobile type-check`
- `npm --prefix ui/mobile lint`
- Record any remaining manual-only gaps in this doc after implementation.

### Latest implementation run
- Passed: `npm --prefix ui/mobile run type-check`
- Passed: `npm --prefix ui/mobile run lint`
- Passed: `npx jest --runInBand tests/unit/importShared.test.ts tests/unit/mobileEnexHelpers.test.ts tests/unit/mobileEnexImportService.test.ts tests/unit/settingsPanels.test.tsx tests/unit/input.test.tsx tests/integration/settingsScreen.test.tsx` from `ui/mobile/`
- Passed: `npx jest --config jest.config.cjs --selectProjects unit-core --runInBand --runTestsByPath core/tests/unit/core-enex-noteCreator.test.ts`
- Passed: `npx cypress run --component --browser electron --spec "cypress/component/lib/enex/note-creator.cy.ts"`
- Passed: `npx cypress run --component --browser electron --spec "cypress/component/ui/ImportButton.cy.tsx"`
- Passed earlier in the feature workflow: `npx ai-devkit@latest lint --feature mobile-settings-menu`

## Manual Testing
**What requires human validation?**

- UI/UX testing checklist
  - [ ] Horizontal tab rail scrolls smoothly on narrow devices.
  - [ ] Active tab styling matches the intended design.
  - [ ] Delete-account section is understandable and safely gated.
  - [ ] Import/export actions feel native and understandable.
- Device compatibility
  - [ ] Android dev build
  - [ ] iOS simulator/device if available
- Smoke tests after deployment
  - [ ] Saved API key persists.
  - [ ] Saved WordPress config persists.
  - [ ] Imported notes appear after returning to the notes list.

## Performance Testing
**How do we validate performance?**

- Ensure tab switching stays responsive on a typical device.
- Confirm export of a moderate notes set does not freeze the UI.
- Check that importing a small `.enex` file completes without app crash.

## Bug Tracking
**How do we manage issues?**

- Classify blocking issues:
  - Critical: settings section unusable or destructive flow unsafe.
  - High: import/export cannot complete.
  - Medium: save states or tab UI regressions.
  - Low: visual polish issues.

## Remaining Gaps
**What still needs manual or follow-up coverage?**

- Manual device validation for native document picker and share sheet is still pending.
- No automated test yet covers malformed ENEX input or the delete-account acknowledgement gating path.
