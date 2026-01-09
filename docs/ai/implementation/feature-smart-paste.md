---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
**How do we get started?**

- Prerequisites: existing TipTap editor setup and DOMPurify (already in core).
- Dependencies: markdown-it for markdown parsing (add to web and mobile editor builds as needed).
- No new environment configuration expected.

## Code Structure
**How is the code organized?**

- Proposed structure:
  - `core/services/smart-paste.ts` (or `core/utils/smart-paste.ts`) for detection + conversion.
  - Editor integrations in `ui/web/components/RichTextEditor.tsx`, `ui/web/components/RichTextEditorWebView.tsx`, and `app/editor-webview/page.tsx`.
- Keep functions small and pure; avoid editor-specific logic inside core service.

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Paste type detection: inspect clipboardData types, score markdown patterns in text/plain, and evaluate HTML richness.
- Conversion paths:
  - HTML: sanitize -> normalizeHtml -> insert.
  - Markdown: markdown-it (extended subset) -> HTML -> sanitize -> normalizeHtml -> insert.
  - Plain text: escape -> paragraph + line break mapping -> sanitize -> insert.
- Insert strategy: use TipTap `insertContent` with HTML to preserve selection and undo history.

### Detection Heuristics (Phase 1)
- HTML meaningful if it contains structural tags: p, br, hr, ul, ol, li, h1-h6, blockquote, pre, code, img, a.
- Markdown scoring (threshold = 3):
  - Heading (# to ######) at line start: +3
  - List item (-, *, +, 1.) at line start: +2
  - Blockquote (>): +2
  - Horizontal rule (---, ***, ___) on its own line: +3
  - Fenced code (``` or ~~~): +3
  - Inline code (`code`): +1
  - Link ([text](url)): +1
  - Emphasis (**bold**, _italic_, ~~strike~~): +1
- Unsupported markdown (tables or task lists) -> downgrade to plain text with line breaks.
- Size guard: if input > 100k characters, bypass markdown parsing and treat as plain text.

### Patterns & Best Practices
- Prefer deterministic, testable functions (detect/convert/normalize).
- Reuse `SanitizationService` and `normalizeHtml` to keep output aligned with existing imports.
- Avoid heavy parsing if the clipboard text is oversized or trivially plain.

## Integration Points
**How do pieces connect?**

- Integration points: `editorProps.handlePaste` in TipTap to intercept paste and route through SmartPasteService.
- No database changes; output HTML is stored through existing note update flows.
- Third-party: markdown-it config should map to allowed tags (headings h1-h6, hr, lists, code, blockquotes) and exclude tables/task lists in phase 1.

## Error Handling
**How do we handle failures?**

- Error handling: wrap parser and sanitizer in try/catch; fallback to plain text if any step fails.
- Logging: non-fatal console warning with detection reason for QA builds only.
- Retry: not required; paste should be idempotent.

## Performance Considerations
**How do we keep it fast?**

- Optimization: avoid DOMParser for plain text; short-circuit to plain text on size threshold.
- Keep conversions synchronous and linear in input size to avoid blocking the editor.

## Security Notes
**What security measures are in place?**

- Input validation: treat clipboard as untrusted input; sanitize all HTML.
- Enforce safe URL protocols for links and images (http/https/mailto + anchors/relative for links); drop images with non-http/https sources.
- Limit inline styles to a safe allowlist: font-weight, font-style, text-decoration; strip colors to avoid theme conflicts.
- Markdown support list (phase 1): headings h1-h6, paragraphs, bullet/ordered lists, blockquotes, inline code, code blocks, links, bold/italic/strikethrough, horizontal rules.
- UI toolbar: add horizontal rule button that triggers `setHorizontalRule` on the editor (web + mobile toolbar).
- No auth or secrets involved.
