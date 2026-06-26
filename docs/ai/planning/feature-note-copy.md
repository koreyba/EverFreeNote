---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Fallback removed; pure Option A wired on mobile (copy via
      `COPY_NOTE` message, paste via WebView `clipboardData`).
- [ ] Milestone 2: Round-trip 1:1 verified on web + mobile; plain-text correct in
      messengers.
- [ ] Milestone 3: Real-device verification of the two Option A assumptions;
      decision recorded (keep clean A, or reinstate a robust fallback).

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation (remove the read-side crutch only)
- [ ] Task 1.1: Comment out the native paste fallback in
      `ui/mobile/components/EditorWebView.tsx` (`handleClipboardPasteRequest`,
      `CLIPBOARD_PASTE_REQUEST` handling, `getMatchingMobileNoteCopyPayload`).
- [ ] Task 1.2: Comment out `ui/mobile/utils/noteClipboardCache.ts` usage and the
      `MOBILE_NOTE_COPY_PAYLOAD` cache feed.
- [ ] Task 1.3: **Keep** the native copy write (`writeNoteCopyPayloadToClipboard`
      via `buildPayload`) — copy stays native; only the read cache is removed.

### Phase 2: Core (pure Option A on the paste side)
- [ ] Task 2.1: Confirm mobile copy stays native: header button →
      `buildPayload(body)` → `writeNoteCopyPayloadToClipboard` (entire body).
- [ ] Task 2.2: Confirm `handlePaste` uses `event.clipboardData` directly (no
      native bridge); self-copy marker handled inside `SmartPasteService.resolvePaste`.
- [ ] Task 2.3: Copy feedback — brief (~1s) Copy-button animation (preferred) or
      a notification/toast on success.
- [ ] Task 2.4: Zero-loss audit — check the `editor-self-copy` profile **and**
      `SELF_COPY_STYLE_ALLOWLIST` (in `smartPaste.ts`) against the full TipTap
      extension set; expand both to cover every stored formatting feature.

### Phase 3: Verification & Polish
- [ ] Task 3.1: Add instrumentation/logging for which clipboard path fires
      (copy/paste, with/without `clipboardData`).
- [ ] Task 3.2: Extend the Maestro flow to cover the real editor copy → paste
      round-trip (beyond the isolated transport harness).
- [ ] Task 3.3: Run on a real Android device; record whether the two Option A
      assumptions hold; decide on clean-A vs robust fallback.
- [ ] Task 3.4: Update tests (unit/integration/component) for the removed
      fallback and the Option A path.

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
