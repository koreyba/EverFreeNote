---
phase: testing
title: Testing Strategy - Note Copy Button
description: Test coverage for the shared-core note copy action (core, web, mobile) with results.
---

# Testing Strategy

Requirements: `feature-note-copy.md` (requirements) · Design: `feature-note-copy.md` (design).

## Test Coverage Goals
- 100% of new core logic (`NoteClipboardService`, `isNoteBodyEmpty`, sanitizer/smartPaste superset).
- Critical paths covered by tests: web clipboard adapter + hook, web self-copy round-trip, mobile bridge `getCopyPayload`, mobile native write button.
- Self-copy marker tests MUST run with a DOM present (jsdom), since the node suite's regex fallback masked a real marker-stripping bug.

## Unit Tests (added)

### Core (`unit-core`, node)
- `core/tests/unit/core-services-noteClipboard.test.ts` — `buildPayload` (marker wrap, empty body, sup/sub, base64), `htmlToPlainText` (lists/checkboxes/links/blocks, never markdown), `isBodyEmpty`, zero-loss round-trip through `smartPaste`.
- `core/tests/unit/core-utils-noteBody.test.ts` — DOM-free `isNoteBodyEmpty` (empty/whitespace/`<p></p>`/`<br>`/`&nbsp;` vs text/image).
- Existing `core-services-smartPaste.test.ts` / `core-services-sanitizer.test.ts` cover the superset additions.

### Web (`unit-web`, jsdom)
- `ui/web/lib/noteClipboard.test.ts` — dual `ClipboardItem` write, `writeText` fallback (rejected rich write + missing `ClipboardItem`), throws when clipboard unavailable.
- `ui/web/hooks/useCopyNote.test.ts` — success sets ~1s on-button confirmation then reverts; empty body is a no-op; failure → `toast.error`, stays unconfirmed.
- `ui/web/components/copyPasteRoundTrip.test.tsx` — **jsdom regression suite**: self-copy marker survives sanitize, detection true, alignment/font-size/color preserved through `resolvePaste`, sup/sub + base64 preserved, and alignment/font-size round-trip through real `editor.insertContent`.
- `ui/web/tests/unit/components/noteView.test.tsx` — reading-mode Copy button: marker-wrapped html + clean plain text, on-button "Copied" confirmation, disabled on empty body, `toast.error` on failure (real `useCopyNote`, only the clipboard adapter mocked).
- `ui/web/tests/unit/components/noteEditor.test.tsx` — editing-mode Copy of current draft body (marker + plain text), disabled on empty draft, disabled while saving.

### Mobile (`mobile`, jest-expo)
- `ui/mobile/tests/component/editorWebViewMessages.test.tsx` — `getCopyPayload` resolves from `COPY_PAYLOAD` (direct + chunked), times out to `null`.
- `ui/mobile/tests/integration/noteCopyButton.test.tsx` — Copy button enabled/disabled by body emptiness; native `Clipboard.setStringAsync(html, { inputFormat: HTML })`; plain-text fallback when HTML write rejected; error Toast when no payload.

## Integration / Round-trip
- Covered: self round-trip (copy → resolvePaste → editor insertContent) preserves supported formatting (jsdom).
- Covered: mobile bridge payload transfer (chunked) → resolves to native writer.

## Coverage Strategy
- Commands: `npm run test:unit` (core+web) · `cd ui/mobile && npm test`.
- Results: core+web **440/440**, mobile **385/385** green; `type-check`, `type-check:tests`, lint clean.
- Note: mobile integration suites are heavy; run with `--maxWorkers=2` to avoid timeout flakiness under load.

## Deferred / Manual (follow-up)
- [ ] Real-device validation: Android (Maestro CI) + iOS (manual), online + offline bundle.
- [ ] `expo-clipboard` HTML `inputFormat` behavior + plain fallback on minimum iOS/Android versions.
- [ ] Cross-app paste fidelity matrix: Telegram, Facebook, Gmail, plain-text field.
- [ ] Ctrl+C selection copy: covered indirectly via `buildPayload` + `noteView`/`noteEditor` tests + manual real-browser verification (jsdom `DataTransfer` is unreliable for a direct DOM-event test); a cypress paste regression (`RichTextEditorPaste.cy.tsx`) should run before push.

## Bug Tracking
- Fixed during testing: self-copy marker (`data-everfreenote-copy`) was stripped by the `editor-self-copy` sanitize profile before detection → styles lost on paste. Guarded by jsdom regression tests above.
- Per-destination-app fidelity gaps (Telegram etc.) are known platform limitations, not bugs.
