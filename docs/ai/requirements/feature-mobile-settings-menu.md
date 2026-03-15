---
phase: requirements
title: Requirements & Problem Understanding - Mobile Settings Menu
description: Complete the mobile settings experience with fully interactive settings panels and horizontal scrolling tabs.
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- The React Native app already exposes a settings screen, but several entries are still marked as coming soon and the page is not aligned with the intended product design.
- Mobile users currently cannot complete important account and integration tasks in-app:
  - review account email and delete the account from the settings page layout shown in design;
  - import notes from `.enex`;
  - export notes to `.enex`;
  - configure WordPress publishing credentials;
  - configure Gemini API credentials.
- The current settings screen is grouped by generic sections instead of the requested horizontally scrollable tab navigation shown in the screenshots.

## Goals & Objectives
**What do we want to achieve?**

- **Primary Goals**
  - Replace the existing mobile settings page with a horizontally scrollable tab interface.
  - Provide tabs for:
    - `My Account`
    - `Import .enex file`
    - `Export .enex file`
    - `WordPress settings`
    - `API Keys`
  - Make each tab interactive rather than showing `Soon` or `Coming soon`.
  - Match the dark mobile card-based visual direction shown in the screenshots while preserving the existing app theme tokens.
- **Secondary Goals**
  - Reuse existing backend/services for API keys and WordPress settings.
  - Keep the screen accessible and friendly on narrow devices.
  - Preserve theme switching support inside the redesigned screen.
  - Preserve sign-out access inside the redesigned screen.
- **Non-goals**
  - Rebuilding unrelated settings areas outside the requested mobile screen.
  - Adding new backend endpoints for WordPress or API keys when existing ones already satisfy the need.
  - Full media/resource fidelity for every ENEX edge case beyond the mobile-friendly import/export flow needed for this settings feature.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a mobile user, I want to switch between settings categories using horizontal tabs so that the page remains compact and easy to scan.
- As a signed-in user, I want to see my account email and delete my account from the `My Account` tab so that account management is available without leaving the app.
- As a migrating user, I want to import an `.enex` file from my device so that I can bring notes into EverFreeNote on mobile.
- As a migrating user, I want to choose how duplicates are handled during mobile import so that mobile import matches web capabilities.
- As a backup-conscious user, I want to export my notes as `.enex` and share/save the file from my device so that I can keep a portable archive.
- As a publishing user, I want to configure WordPress credentials from mobile so that WordPress export access matches web capabilities.
- As an AI user, I want to store my Gemini API key from mobile so that AI-related features can be configured securely in-app.

## Success Criteria
**How will we know when we're done?**

- The settings screen renders five horizontally scrollable tabs matching the requested menu structure.
- None of the requested tabs display `Soon`/`Coming soon`.
- `My Account` shows the authenticated email and allows account deletion with explicit confirmation.
- `My Account` continues to expose theme controls and sign-out without regressing current behavior.
- `Import .enex file` allows choosing a file and importing notes into the signed-in account.
- `Import .enex file` exposes the same duplicate-handling options as web: `prefix`, `skip`, `replace`, and `skip duplicates inside imported file(s)`.
- `Export .enex file` allows generating an `.enex` archive and sharing/saving it from the device.
- `WordPress settings` loads current status, validates input, and saves through existing Supabase functions.
- `API Keys` loads current status, validates input, and saves through existing Supabase functions.
- The screen remains usable on narrow mobile widths without horizontal page overflow; only the tab rail itself scrolls horizontally.

## Constraints & Assumptions
**What limitations do we need to work within?**

- **Technical constraints**
  - Work must fit the current Expo / React Native architecture in `ui/mobile/`.
  - Existing services under `core/services/` should be reused where practical.
  - ENEX browser-only helpers cannot be consumed directly in React Native without adaptation.
- **Design constraints**
  - The requested visual direction is the provided screenshot set: dark cards, prominent section headings, rounded pills for tabs, and horizontal tab scrolling.
  - The last screenshot is treated as the complete menu inventory; the earlier screenshots define layout and tone.
- **Assumptions**
  - Feature name will be tracked as `mobile-settings-menu`.
  - Import/export can be implemented as a native mobile flow using Expo file APIs and RN-safe parsing/building utilities.
  - The signed-in user context is already available through `SupabaseProvider`.

## Questions & Open Items
**What do we still need to clarify?**

- No blocking product questions remain for implementation in this iteration.
- If ENEX media/resource fidelity needs to match the existing web import/export feature exactly, that should be handled as a follow-up enhancement after the mobile settings flow is delivered.
