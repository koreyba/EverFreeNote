---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

Feature: offline-webview-remote-first

## Problem Statement
**What problem are we solving?**

- The mobile editor relies on a WebView that can fail offline or when the remote site is unavailable, which blocks editing.
- Build variants (dev/stage/prod) do not follow a single, predictable source-selection flow, causing inconsistent behavior and confusion.
- Developers lack a simple way to see whether the WebView loaded remote or local content without digging through logs.
- Affected users: all mobile users when offline/remote-down; developers and testers validating dev/stage/prod builds.

## Goals & Objectives
**What do we want to achieve?**

- Primary goals
  - Remote-first loading for dev/stage/prod, with automatic fallback to the local bundle on offline or load failure.
  - When connectivity changes during an app session, new editor loads use the correct source without app restart.
  - Do not reload an already ready editor when connectivity drops; apply source changes on the next editor load.
  - Guarantee the local editor bundle is packaged into every build variant.
  - Use one shared source-selection policy across build variants.
  - Provide a dev-only badge + popup that shows the active source (remote/local) and key debug details.
- Secondary goals
  - Keep the dev workflow fast (remote dev server when online).
  - Reduce configuration sprawl by documenting a single source of truth for WebView URLs.
  - Preserve SPA static export requirements for the WebView page.
- Non-goals
  - Over-the-air updates outside the editor WebView bundle.
  - Image offline caching or service worker reliance.
  - Version/compatibility handshake between the app and remote bundle (optional future).

## User Stories & Use Cases
**How will users interact with the solution?**

- As a mobile user, I want the editor to work offline so that I can edit notes without connectivity.
- As a mobile user, I want the editor to use the latest remote version when online so that fixes arrive immediately.
- As a developer, I want dev/stage/prod builds to follow the same source-selection rules so that results are predictable.
- As a developer, I want a dev-only indicator that shows whether the WebView loaded remote or local content so that I do not have to check logs.
- As a developer, I want every build variant to include the local editor bundle so that fallback always works.

Edge cases to consider
- Device starts offline and then goes online.
- Device starts online, loses connectivity before WebView signals READY.
- Connectivity drops while the app stays open and the user opens another note.
- Remote URL is online but returns an HTTP error or blank page.
- Local bundle is missing or outdated for a build variant.
- Remote is available but slow; fallback should not loop or thrash.

## Success Criteria
**How will we know when we're done?**

- Measurable outcomes
  - When online, the WebView loads the remote editor for dev/stage/prod.
  - When offline or remote fails, the WebView falls back to the local bundle without crashing.
  - When connectivity drops mid-session, the next editor load uses the local bundle.
  - The local bundle is present in all build variants.
  - The dev-only badge + popup shows the active source and URL.
- Acceptance criteria
  - One documented selection policy is used for dev/stage/prod.
  - Remote-first behavior is verified on devices for dev and stage/prod.
  - Fallback occurs on network loss, on WebView load errors, and on READY timeout (1 second).
- Performance benchmarks (if applicable)
  - Local bundle load completes within ~1s on a mid-range device.
  - Fallback from remote to local completes within ~1s after a load error.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Technical constraints
  - WebView editor page must remain a SPA static export.
  - Local bundle loads via file:// paths (Android assets, iOS app bundle).
  - Expo config values must be available at runtime.
  - Dev remote URL uses EXPO_PUBLIC_EDITOR_WEBVIEW_URL with a full path.
- Business constraints
  - Builds are produced locally (no CI requirement).
  - Offline editing is a core requirement.
- Time/budget constraints
  - Keep scope focused on source-selection and debug visibility.
- Assumptions we're making
  - Remote URLs for each variant are stable and reachable when online.
  - The local bundle is generated and copied as part of the build process.
  - No compatibility handshake is required at this stage.

## Questions & Open Items
**What do we still need to clarify?**

- Should we add an optional manual override (force local/remote) in dev in the future?
- Do we want telemetry for source selection and fallback events?
- Where should the dev badge be positioned to avoid UI interference?
- Is a lightweight compatibility version check needed later?
