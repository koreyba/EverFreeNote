---
phase: design
title: System Design & Architecture
description: Define the technical architecture, components, and data models
---

# System Design & Architecture

## Architecture Overview
**What is the high-level system structure?**

- Mermaid diagram capturing the paste pipeline and conversions:
  ```mermaid
  flowchart TD
    Clipboard["Clipboard Data<br/>text/html + text/plain"] --> Detector["PasteTypeDetector"]
    Detector -->|HTML| HtmlPath["Sanitize + Normalize HTML"]
    Detector -->|Markdown| MdPath["Markdown -> HTML -> Sanitize"]
    Detector -->|Plain| PlainPath["Text -> Paragraphs + Line Breaks"]
    HtmlPath --> Insert["TipTap insertContent"]
    MdPath --> Insert
    PlainPath --> Insert
    Insert --> Storage["Canonical HTML stored in note"]
  ```
- Key components: paste type detector, markdown converter, sanitizer/normalizer, TipTap insert adapter.
- Tech choices: TipTap editor, DOMPurify (existing SanitizationService), existing normalizeHtml utility, markdown-it for markdown parsing.

## Data Models
**What data do we need to manage?**

- Core entities: PastePayload, PasteResult, and DetectedPasteType (HTML/Markdown/Plain).
- Suggested structures:
  - PastePayload: { html: string | null, text: string | null, types: string[], sourceHint?: string }
  - PasteResult: { html: string, type: "html" | "markdown" | "plain", warnings: string[] }
- Data flow: clipboard event -> payload -> detection -> conversion -> sanitize/normalize -> insert HTML.
- Supported markdown scope (phase 1): headings (h1-h6), paragraphs, bullet/ordered lists, blockquotes, inline code, code blocks, links, emphasis/strikethrough, and horizontal rules.

## API Design
**How do components communicate?**

- No external APIs; all processing is local in the editor.
- Internal interfaces:
  - detectPasteType(payload): { type, confidence, reason[] }
  - resolvePaste(payload): PasteResult
  - applyPaste(editor, result): void
- Proposed interface shape:
  ```ts
  type PasteDetection = {
    type: "html" | "markdown" | "plain"
    confidence: number
    reasons: string[]
    warnings: string[]
  }

  type SmartPasteOptions = {
    maxLength: number
    markdownScoreThreshold: number
  }

  function detectPasteType(payload: PastePayload, options: SmartPasteOptions): PasteDetection
  function resolvePaste(payload: PastePayload, options: SmartPasteOptions): PasteResult
  ```
- Inputs: ClipboardEvent with clipboardData types; outputs: sanitized HTML for TipTap insertion.

## Component Breakdown
**What are the major building blocks?**

- Frontend: TipTap editor components (`ui/web/components/RichTextEditor.tsx` and `ui/web/components/RichTextEditorWebView.tsx`), mobile editor webview entry (`app/editor-webview/page.tsx`).
- Core modules: new SmartPasteService under `core/services` or `core/utils`, reusing `core/services/sanitizer.ts` and `core/utils/normalize-html.ts`.
- Storage: unchanged, continues to store HTML in note description.
- Third-party: DOMPurify (already used) and markdown-it.
- Code sharing: SmartPasteService lives in `core/` and is consumed by web editor and mobile webview bridge to keep detection/conversion logic identical.

## Design Decisions
**Why did we choose this approach?**

- Prefer HTML when clipboard HTML is meaningful; otherwise fall back to markdown or plain text to avoid raw markdown insertion.
- Use heuristic scoring for markdown detection (headings, lists, code fences, blockquotes) to reduce false positives.
- Normalize HTML structure (div->p, remove wrappers) for consistent rendering and search.
- Always sanitize after conversion; do not trust clipboard HTML even from known sources.
- Markdown scope is extended, not full: no tables or task lists in phase 1; unsupported constructs are downgraded to plain text or simple lists.
- Heading levels are supported up to h1-h6 to match editor configuration.
- Allowed URL protocols: `http`, `https`, `mailto`, plus anchors/relative URLs (`#`, `/`, `./`, `../`, `?`). Other protocols are stripped.
- Inline style allowlist (phase 1): `font-weight`, `font-style`, `text-decoration`. Color/background-color are stripped to avoid theme clashes.
- Downgrade rule: unsupported markdown converts to plain text with line breaks preserved (never raw markdown).
- Size guard: if input exceeds 100k characters, skip markdown parsing and insert as plain text to keep editor responsive.
- HTML meaningfulness heuristic: treat HTML as meaningful only when it contains structural tags (p, br, hr, ul/ol/li, h1-h6, blockquote, pre, code, img, a). Otherwise prefer markdown/plain.
- TipTap extension alignment: supported markdown features map to existing extensions (Heading h1-h6, HorizontalRule via StarterKit, BulletList/OrderedList, Blockquote via StarterKit, CodeBlock via StarterKit, Link, Bold/Italic/Strike). Task lists and tables are excluded in phase 1.
- Images are preserved only for http/https sources; data URIs are removed.
- Inline styles are limited to a safe allowlist (font-weight/font-style/text-decoration); colors are stripped to avoid theme conflicts.
- Alternative considered: always trust HTML when present. Rejected due to AI chat and some apps producing low-quality or empty HTML.

## Non-Functional Requirements
**How should the system perform?**

- Performance: avoid heavy parsing for very large content; short-circuit to plain text for oversized pastes if needed.
- Scalability: pipeline is local and linear in input size; no server impact.
- Security: DOMPurify sanitization, allowed tags/attrs only, safe URL protocols (http/https/mailto + anchors/relative), no scriptable attributes, style allowlist.
- Allowed HTML tags (phase 1, aligned with sanitizer): b, i, em, strong, a, p, br, hr, ul, ol, li, h1, h2, h3, h4, h5, h6, blockquote, code, pre, span, div, img, mark, u, s, strike.
- Reliability: if parsing fails, fall back to plain text insert and keep editor responsive.
