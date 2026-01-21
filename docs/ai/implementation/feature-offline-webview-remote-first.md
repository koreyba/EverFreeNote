---
phase: implementation
title: Implementation Guide
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

Feature: offline-webview-remote-first

## Development Setup
**How do we get started?**

- Prerequisites and dependencies
  - Node.js 18+
  - Expo CLI and Android Studio (and Xcode for iOS if needed)
- Environment setup steps
  - Root web build: `npm install` then `npm run build`
  - Copy bundle: `node build/copy-web-bundle.js`
  - Mobile install: `cd ui/mobile && npm install`
- Configuration needed
  - `ui/mobile/app.config.ts` supplies variant-specific remote URLs
  - `.env` may override dev remote URL via `EXPO_PUBLIC_EDITOR_WEBVIEW_URL` (full /editor-webview path)

## Code Structure
**How is the code organized?**

- Directory structure
  - `app/editor-webview/` - static WebView page
  - `ui/web/components/RichTextEditorWebView.tsx` - editor component
  - `ui/mobile/components/EditorWebView.tsx` - WebView wrapper + source selection
  - `ui/mobile/utils/localBundle.ts` - local bundle paths
  - `build/copy-web-bundle.js` - build-time copy to assets
- Module organization
  - Keep selection logic in a single helper to avoid duplicate rules
- Naming conventions
  - Use `EditorWebViewSource` or similar for source state

## Implementation Notes
**Key technical details to remember:**

### Core Features
- Feature 1: Remote-first selection
  - Derive `remoteUrl` from app config (dev/stage/prod)
  - Use NetInfo for online/offline state
  - Pick remote when online; pick local when offline
  - When connectivity drops mid-session, use local for new loads; if remote is not READY yet, switch to local
- Feature 2: Fallback on load error
  - If remote fails (onError/onHttpError), switch once to local
  - Record a reason for debugging and avoid loops
- Feature 2b: Fallback on READY timeout
  - If READY is not received within a fixed timeout (for example 1000ms), switch once to local
- Feature 3: Dev-only badge + popup
  - Render only for dev variant
  - Badge shows active source; tap opens popup with URL, reason, and connection state

### Patterns & Best Practices
- Keep source selection pure and testable (input -> output)
- Log decisions with a clear prefix
- Avoid multiple reload loops by tracking fallback state

## Integration Points
**How do pieces connect?**

- `app.config.ts` -> Expo Constants -> `EditorWebView` source selection
- `build/copy-web-bundle.js` -> mobile assets -> local bundle URL
- WebView bridge messages remain unchanged

## Error Handling
**How do we handle failures?**

- If remote load fails, fallback to local once per session
- If READY timeout fires, fallback to local once per session
- If local bundle is missing, show error UI (and log clearly)
- Use consistent reason codes for debug info

## Performance Considerations
**How do we keep it fast?**

- Prefer local bundle when offline to avoid retries
- Avoid extra reloads by caching the chosen source
- Keep bundle size minimal by copying only required chunks

## Security Notes
**What security measures are in place?**

- No new secrets introduced
- Config injection uses existing public keys and JSON serialization
- WebView runs local static assets (no new permissions)
