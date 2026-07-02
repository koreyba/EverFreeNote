---
phase: planning
title: Project Planning & Task Breakdown - Note Copy Button
description: Ordered task breakdown for the shared-core note copy action (core → web → mobile → verification).
---

# Project Planning & Task Breakdown

Requirements: `docs/ai/requirements/feature-note-copy.md` · Design: `docs/ai/design/feature-note-copy.md`.

## Milestones
- [x] M1: Core payload service + self-copy superset fixes (zero-loss round-trip), unit tested
- [x] M2: Web copy wired (buttons + Ctrl+C hook) with confirmation + empty-disable
- [x] M3: Mobile native copy (expo-clipboard) via WebView→bridge implemented + unit-tested (device validation pending)

## Task Breakdown

### Phase 1: Core foundation ✅
- [x] Task 1.1: `NoteClipboardService` in `core/services/` — `buildPayload(bodyHtml) → { html, text }` (wrap rich HTML in `data-everfreenote-copy="note-body"` marker) + `htmlToPlainText(html)` (clean text, blocks→newlines, **never markdown**)
- [x] Task 1.2: Self-copy superset fixes — added `sup`/`sub` to `editor-self-copy` allowed tags (`sanitizer.ts`); allow `data:` (base64) images on the self-copy path (`smartPaste.ts`); style allowlist parity confirmed
- [x] Task 1.3: Core unit tests — `core-services-noteClipboard.test.ts` (11 tests, incl. zero-loss round-trip of sup/sub + base64 via smartPaste); full core suite 322/322 green

### Phase 2: Web ✅
- [x] Task 2.1: Web clipboard write adapter `ui/web/lib/noteClipboard.ts` — `ClipboardItem` (html+plain) with `writeText(plain)` fallback; throws on total failure
- [x] Task 2.2: Wired Copy buttons — `NoteView.tsx` (reading) + `NoteEditor.tsx` (editing, current draft via `getHTML()`); `useCopyNote` hook with brief (~1s) on-button Check confirmation; disabled on empty body (`NoteClipboardService.isBodyEmpty`)
- [x] Task 2.3: ProseMirror `handleDOMEvents.copy` hook in `RichTextEditor.tsx` — serializes selection, reuses `NoteClipboardService.buildPayload`, sets dual html+plain
- [x] Task 2.4: Unit tests — `ui/web/tests/unit/lib/noteClipboard.test.ts` (dual write, both fallbacks, unavailable) + core `isBodyEmpty`; suites 430/430 green, lint clean. NOTE: button-level cypress component test deferred (live preview needs full auth+DB).

### Phase 3: Mobile ✅ (device validation pending)
- [x] Task 3.1: Added `expo-clipboard` (~8.0.8) to `ui/mobile`
- [x] Task 3.2: WebView side — `app/editor-webview/page.tsx` handles `REQUEST_COPY_PAYLOAD`, builds payload via `NoteClipboardService`, returns `COPY_PAYLOAD` (JSON, chunked)
- [x] Task 3.3: RN side — `EditorWebView.getCopyPayload()` bridge method; native Copy button in `app/note/[id].tsx` header (Check confirmation ~1s, disabled on empty via DOM-free `isNoteBodyEmpty`); `Clipboard.setStringAsync(html, HTML)` + plain fallback; error Toast
- [x] Task 3.4 (unit): `editorWebViewMessages.test.tsx` +3 (getCopyPayload direct/chunked/timeout); mobile suite 380/380 green, type-check + lint clean. PENDING: real-device validation (Android CI/Maestro; iOS manual)

### Phase 4: Verification & cross-app (manual/device — pending)
- [ ] Task 4.1: Cross-app paste matrix (EverFreeNote round-trip, Telegram, Facebook, Gmail, plain field); confirm `expo-clipboard` HTML `inputFormat` + plain fallback on min iOS/Android. Web button-level cypress component test.

## Dependencies
- 1.1/1.2 block all web/mobile tasks (shared payload + superset).
- Web Ctrl+C (2.3) and self-copy paste depend on the superset fixes (1.2).
- Mobile (3.x) depends on 1.x and the existing chunked bridge.

## Timeline & Estimates
- Phase 1: ~0.5–1d · Phase 2: ~1d · Phase 3: ~1–1.5d · Phase 4: ~0.5d (+ device time).

## Risks & Mitigation
- Per-OS rich HTML clipboard degradation → always ship plain-text fallback.
- `expo-clipboard` HTML support variance on old OS → verify (Task 4.1); fall back to plain.
- Loosening self-copy sanitize must not weaken the default external-paste profile → marker-gated rules only.

## Resources Needed
- Real Android + iOS devices; Maestro CI for Android e2e.
