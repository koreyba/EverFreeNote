---
phase: implementation
title: Implementation Guide - Note Copy Button
description: Technical implementation notes for the shared-core note copy action.
---

# Implementation Guide

> Status: to be filled during implementation (`/execute-plan`).

## Development Setup
- Add `expo-clipboard` to `ui/mobile`.

## Code Structure
- Core payload service under `core/services/`.
- Web adapter under `ui/web/`.
- Mobile native write + bridge handling under `ui/mobile/`.

## Implementation Notes

### Core Features
- Build `{ html, text }` payload from editor model with EverFreeNote self-copy marker.
- Plain-text degradation (lists, checkboxes, headings, links, block separation).

### Patterns & Best Practices
- Generate HTML from TipTap/ProseMirror serialization, not DOM scraping.

## Integration Points
- Existing postMessage bridge (chunked) for mobile WebView → native.
- Existing `smartPaste` self-copy detection for round-trip.

## Error Handling
- Web: ClipboardItem → writeText fallback → user-facing error.
- Mobile: native write result surfaced as success/error feedback.

## Performance Considerations
- Large-note chunking over the bridge.

## Security Notes
- Sanitize/limit generated HTML; safe URL/image handling consistent with paste pipeline.
