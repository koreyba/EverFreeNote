---
phase: testing
title: Testing Strategy
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
**What level of testing do we aim for?**

- Target 100% coverage for SmartPasteService and detection logic.
- Integration tests cover HTML/markdown/plain conversion paths and editor insert behavior.
- End-to-end scenarios cover pasting from AI chat, Google Docs, and a web page.
- All success criteria from requirements must be mapped to tests.
- Use `/writing-test` to draft unit and integration tests for new code paths.

## Unit Tests
**What individual components need testing?**

### SmartPasteService
- [ ] Test case 1: detects HTML when text/html is present and contains structural tags.
- [ ] Test case 2: detects markdown when text/plain contains headings/lists/code fences.
- [ ] Test case 3: falls back to plain text when HTML is empty or markdown confidence is low.
- [ ] Additional coverage: malformed HTML and oversized content fallbacks.
- [ ] Additional coverage: unsupported markdown downgraded to plain text with preserved line breaks.
- [ ] Additional coverage: stripHtml removes script/style content before plain fallback.

### Markdown Conversion Adapter
- [ ] Test case 1: markdown headings and lists convert to expected HTML tags.
- [ ] Test case 2: inline formatting (bold/italic/links) maps correctly.
- [ ] Additional coverage: code fences and blockquotes.
- [ ] Additional coverage: tables/task lists are downgraded or stripped in phase 1.
- [ ] Additional coverage: horizontal rules (`---`) render as `<hr>`.

### Editor WebView Bridge
- [ ] Test case 1: chunked sends and reassembly work for large payloads.
- [ ] Test case 2: short payloads send as single message.
- [ ] Additional coverage: ignores malformed chunk payloads gracefully.

## Integration Tests
**How do we test component interactions?**

- [ ] Paste HTML from web page fixture and verify sanitized HTML inserted.
- [ ] Paste markdown from AI chat fixture and verify formatted HTML inserted.
- [ ] Paste plain text with newlines and verify paragraph + line break behavior.
- [ ] Failure mode: markdown parser or sanitizer throws -> fallback to plain text insert.
- [ ] Oversized paste (>100k chars) skips markdown parsing and inserts plain text.
- [ ] Paste markdown with images and verify only http/https sources remain.
- [ ] Sanitize script tags and inline event handlers from HTML.
- [ ] Normalize simple div blocks into paragraphs.
- [ ] Escape raw HTML when content is treated as plain text.
- [ ] Handle unclosed fenced code blocks without crashing.
- [ ] Preserve anchor/relative links while stripping unsafe protocols.
- [x] Mobile: new note + paste -> back (UI + hardware) -> reopen note keeps content.
- [x] Mobile: new note + typing -> back (UI + hardware) -> reopen note keeps content.
- [x] Mobile: existing note + paste/typing -> back (UI + hardware) -> reopen note keeps content.
- [x] Web: new note + paste/typing -> navigate away (save/read/new note/other note) -> reopen note keeps content.
- [x] Web: existing note + paste/typing -> navigate away -> reopen note keeps content.

## End-to-End Tests
**What user flows need validation?**

- [ ] User flow 1: copy from ChatGPT -> paste into editor -> headings/lists preserved.
- [ ] User flow 2: copy from Google Docs -> paste into editor -> basic styles preserved.
- [ ] Critical path: paste large text and ensure editor remains responsive.
- [ ] Regression: ensure existing note rendering and sanitizer behavior unchanged.

## Test Data
**What data do we use for testing?**

- Fixtures: curated clipboard payloads for HTML/markdown/plain sources.
- Fixture location: `core/tests/fixtures/clipboard` (ai-chat-markdown.md, google-docs.html, web-article.html, plain.txt).
- Mocks: clipboardData and TipTap editor insert command.
- No database setup required.

## Test Reporting & Coverage
**How do we verify and communicate test results?**

- Coverage: `npm run test -- --coverage` with 100% for new modules.
- Record any gaps and rationale in this doc after implementation.
- Manual testing outcomes and sign-off recorded per release.
- Latest quick check: `npx tsc --noEmit` (update date after implementation).
- Latest validation: `npm run validate` (ui/mobile) (pass, 2026-01-09).
- Latest targeted tests: `npm test -- tests/integration/noteSaveExit.test.tsx` (pass, 2026-01-10).
- Latest targeted tests: `npx cypress run --component --spec cypress/component/features/notes/NoteEditorSaveExit.cy.tsx` (failed to run: Cypress returned exit code 1 with no output, 2026-01-10).

## Manual Testing
**What requires human validation?**

- UI/UX checklist: confirm formatting preservation, no raw markdown, and safe content.
- UI/UX checklist: verify data URI images are removed and inline styles outside allowlist are stripped.
- UI/UX checklist: horizontal rule renders as a divider, no extra blank paragraphs.
- UI/UX checklist: Google Docs paste respects theme colors (no forced black/white text).
- Compatibility: Chrome, Safari, Firefox; iOS/Android webview behavior if applicable.
- Smoke tests after deployment: paste from 3 canonical sources.

## Performance Testing
**How do we validate performance?**

- Stress test: paste 100k characters, verify under target time and no crash.
- Benchmark: measure paste time for HTML/markdown/plain to confirm targets.

## Bug Tracking
**How do we manage issues?**

- Track issues with labels: clipboard, formatting, sanitizer.
- Severity: P1 for security or data loss, P2 for formatting regression.
- Regression: re-run fixture suite on changes to sanitizer or editor.

