---
phase: testing
title: Testing Strategy - Note Copy Button
description: Define testing approach and test cases for the shared-core note copy action.
---

# Testing Strategy

> Status: to be filled during implementation/testing (`/writing-test`).

## Test Coverage Goals
- 100% of new/changed core payload logic.
- Critical paths: web copy adapter, mobile bridge + native write.

## Unit Tests

### Core payload service
- [ ] Builds html + plain representations from editor HTML
- [ ] Adds EverFreeNote self-copy marker; marker round-trips with smartPaste
- [ ] Plain-text degradation: lists, checkboxes, headings, links, block separation
- [ ] Edge case: empty body

### Web clipboard adapter
- [ ] Writes ClipboardItem (text/html + text/plain)
- [ ] Falls back to writeText when rich write rejected
- [ ] Surfaces failure when clipboard unavailable

## Integration Tests
- [ ] Self round-trip: copy → paste back into editor preserves supported formatting
- [ ] Mobile bridge: WebView payload → native write (chunked large note)

## End-to-End / Manual Tests
- [ ] Reading-mode copy (web + mobile)
- [ ] Editing-mode copy of dirty draft (web + mobile)
- [ ] Paste into Telegram, Facebook, Gmail, plain-text field
- [ ] Mobile real devices: Android + iOS, online + offline bundle

## Test Data
- Notes with headings, lists, task lists, alignment, color/highlight, font family/size, links, images.

## Test Reporting & Coverage
- Coverage commands per existing jest projects (core/web/mobile).

## Manual Testing
- Cross-app paste fidelity checklist; device/OS matrix.

## Performance Testing
- Large-note copy over the mobile bridge.

## Bug Tracking
- Track per-destination-app fidelity gaps as known limitations, not bugs.
