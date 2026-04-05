---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- 100% coverage target for the new shared reconcile/debouncer branches
- High-confidence integration coverage for mobile stale-refresh regressions

## Unit Tests
**What individual components need testing?**

### `core/utils/noteAutosaveSession.ts`
- [x] Replaces draft/baseline on real note switch
- [x] Accepts external values for clean same-note fields
- [x] Acknowledges dirty fields when incoming matches local draft
- [x] Preserves dirty local fields while advancing baseline on conflicting incoming values
- [x] Handles mixed-field reconcile in a single snapshot

### `core/utils/debouncedLatest.ts`
- [x] `rebase` keeps a merged pending draft alive
- [x] `rebase` clears pending work when the draft becomes clean
- [x] baseline updates before async flush completion to avoid duplicate blur re-sends

## Integration Tests
**How do we test component interactions?**

- [x] Mobile editor preserves a newer local title when the same note refreshes with an older title
- [x] Mobile editor adopts newer external values for clean fields
- [x] Mobile editor preserves dirty fields while still applying clean-field external updates
- [x] Body updates use `EditorWebViewHandle.setContent` instead of remounting
- [x] Blur/unmount flush still persists a dirty reconciled draft when no timer is pending
- [x] Web editor matches mobile behavior for clean-field adoption, dirty-field preservation, and autosave acknowledgement on same-note refreshes

## End-to-End Tests
**What user flows need validation?**

- [ ] Cross-device same-note refresh while the local editor is clean
- [ ] Local dirty draft survives same-note autosave/invalidation cycles

## Test Data
**What data do we use for testing?**

- A single note fixture with editable `title`, `description`, and `tags`
- Query cache updates that simulate stale and fresh same-note refetches

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- `npm run test:unit:core -- --runTestsByPath core/tests/unit/noteAutosaveSession.test.ts core/tests/unit/core-utils-debouncedLatest.test.ts`
- `npm test -- --runInBand tests/integration/noteEditorScreen.test.tsx` in `ui/mobile`
- `npm run test:unit:web -- --runTestsByPath ui/web/tests/unit/components/noteEditor.test.tsx ui/web/tests/unit/components/richTextEditorWebView.test.tsx`
- `npm run type-check` in the root and `ui/mobile`
- `npm run type-check:tests`

Results:
- Core unit: passed
- Web unit: passed
- Mobile integration: passed
- Root type-check: passed
- `ui/mobile` type-check: passed
- Tests type-check: passed

## Manual Testing
**What requires human validation?**

- Mobile typing flow: enter title A, erase, type title B, ensure A never returns
- Multi-device smoke test: clean editor should adopt remote changes

## Performance Testing
**How do we validate performance?**

- Confirm same-note refresh does not remount the editor or introduce extra autosave storms

## Bug Tracking
**How do we manage issues?**

- Treat any stale overwrite or dropped draft as a data-loss-severity regression
