---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Read-side crutch removed (in-memory cache + native read);
      copy stays a native write; paste is pure Option A via WebView `clipboardData`.
      Zero-loss audit done; feedback animation added; tests green.
- [ ] Milestone 2: Round-trip 1:1 verified on web + mobile; plain-text correct in
      messengers. (Pending device/Maestro verification.)
- [ ] Milestone 3: Real-device verification of the two Option A assumptions;
      decision recorded (keep clean A, or reinstate a robust fallback).

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation (remove the read-side crutch only)
- [x] Task 1.1: Commented out the native paste fallback in
      `ui/mobile/components/EditorWebView.tsx` (`handleClipboardPasteRequest`,
      `CLIPBOARD_PASTE_REQUEST` now logs the Option A gap instead). Cache imports
      and `expo-clipboard` import commented out.
- [x] Task 1.2: Commented out `noteClipboardCache` usage and the
      `MOBILE_NOTE_COPY_PAYLOAD` cache feed (EditorWebView, note/[id].tsx,
      maestro harness, and the web editor's handleCopy send).
- [x] Task 1.3: Kept the native copy write (`writeNoteCopyPayloadToClipboard`
      via `buildPayload`) — copy stays native; only the read cache is removed.

### Phase 2: Core (pure Option A on the paste side)
- [x] Task 2.1: Confirmed mobile copy stays native: header button →
      `buildPayload(body)` → `writeNoteCopyPayloadToClipboard` (entire body).
- [x] Task 2.2: `handlePaste` uses `event.clipboardData` directly; the dead
      native bridge branch now logs + falls through; marker handled inside
      `SmartPasteService.resolvePaste`. `sendNativeMessage` commented out.
- [x] Task 2.3: Copy feedback — Copy-button bounces and swaps to a check icon
      for ~1s (`note-copy-feedback` testID); success toast removed (error stays).
- [x] Task 2.4: Zero-loss audit done. Found+fixed: `sub`/`sup` tags were missing
      from the sanitizer allowlist (subscript/superscript would be stripped).
      `SELF_COPY_STYLE_ALLOWLIST` (8 props) covers the current extension set.

### Phase 3: Verification & Polish
- [x] Task 3.1: Instrumentation added — both the WebView (`handlePaste`) and the
      native `CLIPBOARD_PASTE_REQUEST` handler log when a paste event had no
      `clipboardData` (the Option A gap), so it is observable.
- [ ] Task 3.2: Extend the Maestro flow to cover the real editor copy → paste
      round-trip (beyond the isolated transport harness). **[verification phase]**
- [ ] Task 3.3: Run on a real Android device; record whether the two Option A
      assumptions hold; decide on clean-A vs robust fallback. **[verification phase]**
- [x] Task 3.4: Updated tests for the removed fallback / Option A path
      (mobile `editorWebViewMessages`, `noteEditorScreen`; cypress
      `RichTextEditorWebViewPaste`). All unit/integration suites green.

## Dependencies
**What needs to happen in what order?**

- Phase 1 (remove fallback) before Phase 2 (so the clean path is the only path).
- `feature-smart-paste` is an external dependency — must keep honoring the
  self-copy marker; not modified here.
- Mobile e2e CI (`mobile-e2e.yml` + Maestro) provides the verification signal for
  Phase 3.

## Timeline & Estimates
**When will things be done?**

- Phase 1: ~0.5 day (mechanical, reversible comments).
- Phase 2: ~1–1.5 days (bridge message + in-WebView copy + user-activation
  handling).
- Phase 3: ~1–2 days (instrumentation, Maestro extension, device run, test
  updates). Add buffer for the user-activation unknown.

## Risks & Mitigation
**What could go wrong?**

- **Android WebView paste has no `clipboardData`** → paste round-trip breaks.
  Mitigation: reinstate a robust native read (exact token key, persistence), not
  the in-memory cache.
- **Copy from native button fails user-activation** → `setData` is blocked.
  Mitigation: trigger copy from an in-WebView control, or keep a thin native
  write using the same `buildPayload` (format unchanged).
- **Regression of external paste** (smart-paste) when removing the bridge.
  Mitigation: keep smart-paste tests green; verify marker detection ordering.

## Resources Needed
**What do we need to succeed?**

- A real Android device for clipboard verification (emulator clipboard may not
  reflect device behavior).
- The mobile e2e CI + Maestro harness (already in progress).
- iOS check (WKWebView) for parity once Android is confirmed.
