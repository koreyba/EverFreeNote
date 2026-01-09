---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [x] Milestone 1: Requirements + design approved for smart-paste
- [x] Milestone 2: Core smart-paste pipeline implemented with unit tests
- [ ] Milestone 3: Editor integration, QA validation, and doc updates complete

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Choose markdown parsing approach (markdown-it selected) (Notes: markdown-it confirmed)
- [x] Task 1.2: Define SmartPasteService interface and detection heuristics (Notes: interface + heuristics documented; size guard and downgrade rules added)
- [x] Task 1.3: Create clipboard fixtures for common sources (AI chats, web pages, Google Docs) (Notes: fixtures added in core/tests/fixtures/clipboard)

### Phase 2: Core Features
- [x] Task 2.1: Implement HTML path (sanitize + normalize) (Notes: sanitize + normalize + style/url filtering)
- [x] Task 2.2: Implement markdown path (parse to HTML + sanitize) (Notes: markdown-it render + heading downgrade + sanitize)
- [x] Task 2.3: Implement plain text path (paragraph + line break mapping) (Notes: escape + paragraph mapping)
- [x] Task 2.4: Add selection-safe insert into TipTap editor (Notes: handlePaste -> insertContent)

### Phase 3: Integration & Polish
- [x] Task 3.1: Wire paste handling in web and mobile editor surfaces (Notes: RichTextEditor + RichTextEditorWebView)
- [x] Task 3.2: Add unit + integration tests for detection and conversion paths (Notes: unit + integration tests added for fixtures, downgrade rules, and hr)
- [ ] Task 3.3: Manual QA checklist across key sources and devices

## Dependencies
**What needs to happen in what order?**

- Dependencies: agree on markdown parser and allowed markdown features before implementation.
- External dependencies: add markdown parser library if not present.
- Team dependencies: QA support for cross-source clipboard validation.

## Timeline & Estimates
**When will things be done?**

- Phase 1: 1-2 days; Phase 2: 2-4 days; Phase 3: 1-2 days.
- Target dates: align with next sprint; adjust after parser selection.
- Buffer: +20% for clipboard edge cases and cross-browser behavior.

## Risks & Mitigation
**What could go wrong?**

- Technical risk: false markdown detection leading to unwanted formatting.
- Resource risk: limited QA time for real-world paste sources.
- Dependency risk: markdown parser choice may affect output compatibility.
- Mitigation: heuristic scoring with confidence threshold, fallback to plain text, and curated fixtures.

## Resources Needed
**What do we need to succeed?**

- Roles: frontend engineer, QA, product reviewer for UX validation.
- Tools: TipTap editor, DOMPurify, chosen markdown parser, fixture repository.
- Infrastructure: no new backend services; local-only processing.
- Documentation: update requirements, design, implementation, and testing docs for smart-paste.
