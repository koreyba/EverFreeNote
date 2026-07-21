---
phase: testing
title: Sonar Reliability Issue Remediation Testing
description: Regression coverage and validation results for the July 2026 reliability issue batch
---

# Sonar Reliability Issue Remediation Testing

## Test Coverage Goals

- Cover the behavior changed while resolving the six open Sonar reliability issues reported on 2026-07-21.
- Preserve Markdown table detection, RAG HTML fallback parsing, clipboard blank-line handling, WordPress URL normalization, and accessible search-card selection.
- Validate all repository unit tests and static checks without running a new Sonar analysis until requested.

## Unit Tests

### Linear text and HTML parsing

- [x] Spaced and aligned Markdown table separators still downgrade as unsupported Markdown.
- [x] Malformed table separator rows do not produce false positives.
- [x] RAG fallback parsing preserves text after an unmatched opening bracket.
- [x] Clipboard paragraph parsing recognizes numeric non-breaking-space entities and attributed `<br>` markers.
- [x] Existing smart-paste, RAG chunking, and clipboard regression suites remain green.

### UI behavior

- [x] WordPress settings remove multiple trailing path slashes while preserving query parameters.
- [x] Search result cards use a native selection button and no interactive role on the `<article>` container.
- [x] Existing search fragment activation and text-selection behavior remains green.

## Integration Tests

- [x] The complete core and web unit suites pass together: 53 suites, 487 tests.
- [x] Targeted Cypress component tests pass for `NoteSearchItem`: 4 tests.
- [x] Targeted Cypress component tests pass for `WordPressSettingsDialog`: 5 tests.

## End-to-End Tests

- [ ] Full browser E2E was not required for this isolated reliability refactor; targeted component coverage exercises the affected UI paths.

## Test Data

- Markdown tables with optional outer pipes, alignment colons, and whitespace around cells.
- Malformed HTML containing an unmatched `<` suffix.
- Clipboard paragraphs containing `&#160;`, `&#xA0;`, and an attributed `<br>`.
- WordPress URL with a path, repeated trailing slashes, and a query string.
- Search result group in selection mode with an `onToggleSelect` spy.

## Test Reporting & Coverage

- `npm run type-check`: passed.
- `npm run type-check:tests`: passed.
- `npx eslint . --max-warnings=0`: passed.
- `npm run test:unit -- --runInBand`: passed, 53 suites and 487 tests.
- Targeted Cypress component run: passed, 9 tests across the two affected specs.
- `git diff --check`: passed.
- Jest coverage collection is currently blocked by duplicate Istanbul instrumentation: `.babelrc` loads `babel-plugin-istanbul` for `test`, while Jest's Babel coverage provider injects the same plugin when `--coverage` is enabled. This is an existing test-infrastructure issue; normal test execution is unaffected.

## Manual Testing

- [ ] A fresh Sonar analysis is intentionally deferred at the user's request.
- [ ] Visual browser smoke testing is optional because the affected search interaction is covered by Cypress component tests.

## Performance Testing

- Regex-based parsing at all five `typescript:S8786` locations was replaced with bounded loops or forward-only scanners.
- No wall-clock benchmark was added; regression tests cover representative valid and malformed inputs while algorithm structure guarantees forward progress.

## Bug Tracking

- Source list: six open reliability issues fetched from local SonarQube through MCP on 2026-07-21.
- Rules addressed: `typescript:S8786` (five issues) and `typescript:S6842` (one issue).
- Follow-up: run Sonar only when requested and confirm that the six original issue keys close without new reliability findings.
