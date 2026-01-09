---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Pasting from AI chats and mixed sources often yields markdown or plain text instead of HTML, so formatting is lost or shown as raw markdown.
- All users who copy between apps are affected, especially power users who move structured notes from web pages and AI tools.
- Today users must manually reformat after paste or accept degraded formatting, which is slow and inconsistent.

## Goals & Objectives
**What do we want to achieve?**

- Primary goals: detect clipboard content type (HTML/markdown/plain text), convert to canonical rich-text HTML for TipTap, and preserve basic structure (headings, lists, paragraphs, line breaks, inline emphasis).
- Secondary goals: consistent results across common sources (ChatGPT, Claude, Google Docs, web pages) and fast paste handling with predictable fallbacks.
- Non-goals: change the storage format, implement smart copy-out, add a paste mode toggle, or guarantee pixel-perfect fidelity for complex layouts (tables, columns, embedded widgets).

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user, I want to paste markdown from AI chats and see formatted rich text (headings h1-h6, lists, blockquotes, code, links, emphasis) instead of raw markdown.
- As a user, I want to paste HTML content from web pages and keep headings, lists, links, and basic emphasis.
- As a user, I want plain text with line breaks to become paragraphs and line breaks in the editor.
- As a user, I want pastes to be safe, with scripts and unsafe attributes removed.
- Key workflows: paste from AI chat, paste from Google Docs, paste from a typical web article, paste from a code snippet.
- Edge cases: very large pastes, mixed HTML and plain text with conflicting content, malformed HTML, markdown that looks like plain text, and nested lists.

## Success Criteria
**How will we know when we're done?**

- Measurable outcomes: common-source pastes preserve headings, lists, blockquotes, code blocks, and paragraphs without raw markdown artifacts.
- Acceptance criteria: sanitized output contains no forbidden tags/attributes; HTML/markdown/plain inputs resolve to valid TipTap HTML; images are preserved only for http/https sources; unsupported markdown (tables/task lists) is downgraded; fallback to plain text never throws.
- Performance targets: typical paste under 200ms for <=10k characters, and under 500ms for <=100k characters on reference hardware.
- Downgrade behavior: unsupported markdown is converted to plain text (no raw markdown) with line breaks preserved.
- Validation sources: use fixtures from ChatGPT, Claude, Google Docs, and a standard web article for acceptance checks.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints: keep the existing HTML-based storage format and TipTap editor integration; use the existing sanitization service.
- Business constraints: prioritize user-perceived formatting quality and safety over rare edge-case fidelity.
- Time/budget constraints: design for incremental rollout without full editor refactor.
- Assumptions: clipboardData provides text/plain and often text/html on web; mobile webview may only provide text/plain.
- Size threshold: above 100k characters, skip markdown parsing and insert as plain text for stability.
- Scope constraints: phase 1 supports extended markdown only (no tables or task lists); only formatting supported by current TipTap extensions and sanitizer allowlist is preserved.
- Security constraints: allow only http/https images; disallow data URIs; inline styles are restricted to a small safe allowlist.
- Markdown scope (phase 1, supported): headings h1-h6, paragraphs, bullet/ordered lists, blockquotes, inline code, code blocks, links, bold/italic/strikethrough, horizontal rules (---).
- Markdown scope (phase 1, not supported): tables, task lists, footnotes, definition lists, embedded HTML blocks beyond sanitizer allowlist.

## Questions & Open Items
**What do we still need to clarify?**

- Do we want tables or task lists in a future phase, and which TipTap extensions are acceptable?
- Should we add an image import pipeline later to store external images locally for offline use?
