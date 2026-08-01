---
phase: deployment
title: Deployment Strategy
description: Define deployment process, infrastructure, and release procedures
---

# Mobile Tag Management Deployment Notes

## Release Scope

This feature ships in the same mobile PR as the native Tags tab, offline tag mutations, and the collapsible bottom tab bar. No separate deployment or server migration is planned unless the approved data contract requires a narrowly scoped service change.

## Pre-Deployment Checklist

- Mobile type-check, lint, focused tests, and the relevant CI validation are green.
- Android and iOS smoke checks cover Tags navigation, rename/delete, offline retry, safe areas, and tab-bar scroll behavior.
- Any queue or SQLite schema change has a forward-compatible migration and a tested rollback/recovery path.
- Existing Notes, Search, Settings, and sync flows remain green.

## Build and Release

Use the repository's existing Expo/mobile CI and release process. The feature must not introduce a new runtime secret or environment variable. If the final design adds a mutation queue operation, ship its deserialization/replay logic together with the client version that can create it.

## Database and Sync Changes

Prefer the existing local schema and mutation queue. If a new queue operation or local metadata is required, document its migration, idempotent replay behavior, and compatibility with already queued mutations before implementation is merged.

## Rollback

Use the normal mobile release rollback mechanism. If a client-side tag mutation issue is detected, disable or guard the mutation path without discarding local queued changes, then reconcile affected notes through the existing sync/retry flow. A rollback must preserve user notes and avoid destructive cleanup of the queue.
