---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- 100% of new/changed code (copy handler, bridge `COPY_NOTE`/`NOTE_COPIED`,
  instrumentation).
- Integration: round-trip copy → paste back into the editor on web and mobile.
- E2E: mobile Maestro clipboard round-trip (transport harness + real editor
  round-trip).
- Aligns with the requirements acceptance criteria (round-trip 1:1, clean plain
  text, two clipboard flavors always written).

## Unit Tests
**What individual components need testing?**

### NoteCopyService (core/services/noteCopy.ts)
- [ ] `buildPayload` wraps HTML with the `data-everfreenote-copy="note-body"` marker
- [ ] `buildPayload` produces clean `text/plain` (no markdown artifacts; bullets/
      checkboxes/`---` hints as specified)
- [ ] `isSelfCopyHtml` / `unwrapSelfCopyHtml` detect and unwrap the marker
      (DOMParser path and regex fallback)

### Editor copy/paste handlers (RichTextEditorWebView.tsx)
- [ ] `handleCopy` writes `text/html` + `text/plain` to `clipboardData`
- [ ] `handlePaste` uses `clipboardData` and routes self-copy vs external correctly
- [ ] Marker is honored before strict sanitization

## Integration Tests
**How do we test component interactions?**

- [ ] Web: copy a formatted note → paste back → DOM identical (alignment, font,
      color, lists, task lists)
- [ ] **Zero-loss round-trip across the full TipTap extension set** — one fixture
      exercising every storable feature (font family/size, color, highlight,
      alignment, headings, lists, task lists, links, sub/superscript, code block,
      `<hr>`, images); paste back must lose nothing
- [ ] Mobile: `COPY_NOTE` triggers in-WebView copy; copy feedback fires (button
      animation / `NOTE_COPIED` toast)
- [ ] Empty-note copy is a safe no-op
- [ ] External paste (smart-paste) still works after fallback removal
- [ ] Failure mode: paste with no `clipboardData` is surfaced (not silently
      cached)

## End-to-End Tests
**What user flows need validation?**

- [ ] Mobile Maestro: copy fixture → read clipboard → `text/html` + `text/plain`
      both survive (existing transport harness)
- [ ] Mobile Maestro (new): real editor copy → paste back → content preserved
- [ ] Regression: external paste from a web source into the editor

## Test Data
**What data do we use for testing?**

- Fixture HTML with headings, lists, task lists, alignment, font, color.
- Plain-text expectation strings for messenger paste.
- External-source fixtures reused from `feature-smart-paste`.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Unit/integration via `npm run test:unit` and mobile `jest`.
- Component tests via Cypress; e2e via Maestro (`test:e2e:mobile:copy` + the
  `mobile-e2e.yml` workflow).
- Record which clipboard path fired during device verification (the Option A
  assumptions) in this doc.

## Manual Testing
**What requires human validation?**

- Real Android device: copy a note → paste back (round-trip 1:1).
- Copy a note → paste into Telegram/Facebook (clean text).
- Copy a note → paste into WordPress/Google Docs (rich, best-effort).
- Cross-device: copy on mobile → paste on web.
- iOS (WKWebView) parity check.

## Performance Testing
**How do we validate performance?**

- Verify no added native round-trips on the copy/paste happy path under Option A.
- Large-note copy/paste remains responsive.

## Bug Tracking
**How do we manage issues?**

- Track the Option A verification outcome explicitly: if either assumption fails,
  open a follow-up for a robust fallback (exact token key + persistence), not the
  in-memory cache.
- Regression-test external paste and round-trip on each change.
