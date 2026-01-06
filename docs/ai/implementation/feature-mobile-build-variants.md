---
phase: implementation
title: Implementation Guide - Mobile Build Variants
description: Mobile app variants (dev/stage/prod) for side-by-side installs
---

# Mobile Build Variants

## Goal
- Allow dev, stage, and prod installs on the same Android device.

## Approach
- Use `ui/mobile/app.config.ts` to switch variant via `APP_VARIANT`.
- Each variant has its own app name, Android package, scheme, and Supabase config.
- Stage WebView URL can be overridden per branch via `EXPO_PUBLIC_EDITOR_WEBVIEW_URL` or built from `EXPO_PUBLIC_STAGE_BRANCH` + `EXPO_PUBLIC_STAGE_DOMAIN`.

## Notes
- iOS bundle identifier remains unchanged for now (Android-only side-by-side).
- OAuth redirect URL is derived from the scheme: `<scheme>://auth/callback`.
