---
phase: testing
title: Testing Strategy - Note Copy Button
description: Test coverage for the shared-core note copy action (core, web, mobile) with results.
---

# Testing Strategy

Requirements: `feature-note-copy.md` (requirements) · Design: `feature-note-copy.md` (design).

## Test Coverage Goals
**What level of testing do we aim for?**

- 100% of new core logic (`NoteClipboardService`, `isNoteBodyEmpty`, sanitizer/smartPaste superset).
- Integration scope: web clipboard adapter + hook + buttons, web self-copy round-trip, mobile bridge `getCopyPayload`, mobile native write button.
- Acceptance alignment: zero-loss self round-trip, dual html/plain, plain-never-markdown, empty-disable, ~1s confirmation, native mobile write.
- Self-copy marker tests MUST run with a DOM present (jsdom), since the node suite's regex fallback masked a real marker-stripping bug.

## Unit Tests
**What individual components need testing?**

### Core (`unit-core`, node)
- [x] `core-services-noteClipboard.test.ts` — `buildPayload` (marker, empty, sup/sub, base64), `htmlToPlainText` (lists/checkboxes/links/blocks, never markdown, image→alt/placeholder), `isBodyEmpty`, zero-loss round-trip via `smartPaste`.
- [x] `core-utils-noteBody.test.ts` — DOM-free `isNoteBodyEmpty` (empty/whitespace/`<p></p>`/`<br>`/`&nbsp;` vs text/image).
- [x] Existing `core-services-smartPaste.test.ts` / `core-services-sanitizer.test.ts` cover the superset additions.

### Web (`unit-web`, jsdom)
- [x] `ui/web/lib/noteClipboard.test.ts` — dual `ClipboardItem` write, `writeText` fallback, throws when unavailable.
- [x] `ui/web/hooks/useCopyNote.test.ts` — ~1s confirmation then revert; empty no-op; failure → `toast.error`; stale confirmation cleared on retry.
- [x] `ui/web/components/copyPasteRoundTrip.test.tsx` — jsdom regression: marker survives sanitize, alignment/font-size/color/sup-sub/base64 preserved through `resolvePaste` + real `editor.insertContent`.
- [x] `ui/web/components/noteView.test.tsx` — reading-mode button: marker+plain, confirmation, empty-disable, error toast.
- [x] `ui/web/components/noteEditor.test.tsx` — editing-mode draft copy, empty-disable, disabled-while-saving.

### Mobile (`mobile`, jest-expo)
- [x] `editorWebViewMessages.test.tsx` — `getCopyPayload` direct/chunked/timeout.
- [x] `tests/integration/noteCopyButton.test.tsx` — native `setStringAsync(html,{inputFormat:HTML})`, plain fallback, error Toast, empty-disable, disabled-until-ready.

## Integration Tests
**How do we test component interactions?**

- [x] Self round-trip: copy → `resolvePaste` → `editor.insertContent` preserves supported formatting (jsdom).
- [x] Mobile bridge: chunked `COPY_PAYLOAD` transfer → resolves to native writer.
- [x] Web button → `useCopyNote` → `buildPayload` → adapter (real hook, mocked adapter only).

## End-to-End Tests
**What user flows need validation? (manual / device — pending)**

- [ ] Reading-mode copy (web) + editor copy (web + mobile) → paste back into EverFreeNote.
- [ ] Paste into Telegram, Facebook, Gmail, plain-text field.
- [ ] Mobile real devices: Android + iOS, online + offline bundle.

## Test Data
**What data do we use for testing?**

- Notes with headings, lists, task lists, alignment, color/highlight, font family/size, links, images (incl. base64 + image-only), sup/sub.

## Test Reporting & Coverage
**How do we verify results?**

- Commands: `npm run test:unit` (core+web) · `cd ui/mobile && npm test`.
- Results: core+web **449/449**, mobile **385+** green; `type-check`, `type-check:tests`, lint clean.
- Note: mobile integration suites are heavy; run with `--maxWorkers=2` to avoid timeout flakiness under load.

## Manual Testing
**What requires human validation?**

- Cross-app paste fidelity checklist (Telegram/Facebook/Gmail/plain).
- Device/OS matrix; `expo-clipboard` HTML `inputFormat` + plain fallback on minimum iOS/Android versions.
- Ctrl+C selection copy in a real browser (jsdom `DataTransfer` unreliable for a direct DOM-event test); run cypress `RichTextEditorPaste.cy.tsx` before push.

## Performance Testing
**How do we validate performance?**

- Large-note copy over the mobile chunked bridge (no separate size limit; relies on existing chunking).

## Bug Tracking
**How do we manage issues?**

- Fixed during testing: self-copy marker (`data-everfreenote-copy`) was stripped by the `editor-self-copy` sanitize profile before detection → styles lost on paste. Guarded by jsdom regression tests.
- Fixed from PR review: image-only plain-text payload, copy-before-ready on mobile, stale confirmation, `isBodyEmpty` sync on programmatic `setContent`.
- Per-destination-app fidelity gaps (Telegram etc.) are known platform limitations, not bugs.
