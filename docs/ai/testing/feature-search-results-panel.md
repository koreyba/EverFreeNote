---
phase: testing
title: Testing Strategy (Search Results Panel)
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Cover all changed UI paths for sidebar trigger and search panel visibility behavior.
- Keep type/lint gates clean for all changed files.
- Re-run component tests for updated `Sidebar` and mobile shell behavior once Cypress runtime is healthy.

## Unit / Component Tests
**What individual components need testing?**

### Sidebar
- [x] Trigger opens search panel (`onOpenSearch` callback).
- [x] Tag-filter badge behavior still works with trigger text.
- [x] Existing sync status and account-action scenarios remain covered.

### NotesShell + Controller Contract (mobile)
- [x] Controller fixture updated with `isSearchPanelOpen` and `setIsSearchPanelOpen` to match runtime API.
- [x] Mobile layout tests remain aligned with current NotesShell contract.

### NoteList Contract
- [x] FTS props made optional for regular-list consumers.
- [x] Existing NoteList tests remain compatible with explicit FTS cases.

## Integration Tests
**How do we test component interactions?**

- [x] Compile-time integration (`NotesShell` + `Sidebar` + `NoteList`) validated via TypeScript.
- [x] Lint-time integration validated for hook/component patterns.
- [ ] Cypress component runtime execution (blocked by local Cypress binary issue, see reporting section).

## End-to-End Tests
**What user flows need validation?**

- [ ] Desktop flow: open panel from sidebar, run search, click result, keep panel open.
- [ ] Desktop flow: drag-resize panel and verify width persists after reopen.
- [ ] Mobile flow: open panel full-width, use Back control, return to sidebar.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

Executed on 2026-03-04:

- `npm run type-check` -> **PASS**
- `npm run eslint` -> **PASS**
- `npx cypress run --component ...` -> **BLOCKED**
  - `Cypress.exe: bad option: --smoke-test`
  - `Cypress.exe: bad option: --ping=290`
  - Repro: `npx cypress verify` fails with same runtime error.

## Manual Testing
**What requires human validation?**

- [ ] Verify panel animation and push-layout behavior in browser.
- [ ] Verify clear-search closes panel and resets state.
- [ ] Verify mobile back button appears only on mobile breakpoints.

## Coverage Gaps
**Outstanding gaps and rationale**

- Cypress component execution is currently blocked by local Cypress runtime/binary incompatibility, so UI runtime assertions could not be completed in this environment.
