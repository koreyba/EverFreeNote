---
phase: requirements
title: Deduplicate Offline Write Pattern in useNoteSaveHandlers
description: Extract the shared offline create/update logic that is duplicated between handleAutoSave and handleSaveNote
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

`useNoteSaveHandlers.ts` (416 lines) contains nearly identical offline write logic duplicated in two places:

- `handleAutoSave` (~140 lines) — offline create branch, offline update branch
- `handleSaveNote` (~115 lines) — internal `offlineMutation` helper, offline create branch, offline update branch

Both functions independently implement the same sequence:
1. Build a `CachedNote` with `status: 'pending'`
2. Call `offlineCache.saveNote(cached)`
3. Upsert the overlay: `setOfflineOverlay(prev => [...])`
4. Call `enqueueMutation({ operation, noteId, payload, clientUpdatedAt })`
5. Update pending/failed counts

This duplication means any bug fix or behavioral change must be applied in two places, and it makes the hook harder to understand at a glance.

- **Who is affected**: developers maintaining or extending offline sync behavior
- **Current workaround**: copy-paste maintenance; the two paths have already diverged slightly (different `CachedNote` shapes, different count-refresh strategies)

## Goals & Objectives

**Primary goals:**
- Extract a shared `executeOfflineWrite` utility (internal to `useNoteSaveHandlers`) that both `handleAutoSave` and `handleSaveNote` delegate to
- Reduce `useNoteSaveHandlers.ts` from ~416 lines to ~250 lines without changing any observable behavior
- Eliminate the `@ts-ignore` comments in `handleSaveNote`'s offline mutation by building the `CachedNote` correctly in one place

**Non-goals:**
- No changes to the public API of `useNoteSaveHandlers` (returned object stays identical)
- No changes to caller (`useNoteAppController.ts`)
- No changes to tests that test `useNoteAppController` or `useNoteSaveHandlers` via component harness
- No new features or behavioral changes — pure refactor

## User Stories & Use Cases

- As a developer, I want the offline create/update logic to live in one place so that fixing a sync bug only requires one code change
- As a developer, I want each function in `useNoteSaveHandlers` to be readable in isolation without mentally simulating two parallel offline paths

## Success Criteria

- `executeOfflineWrite` (or equivalent) encapsulates: saveNote, setOfflineOverlay upsert, enqueueMutation, and count update
- `handleAutoSave` offline branches call `executeOfflineWrite` instead of repeating the pattern
- `handleSaveNote` offline branches call `executeOfflineWrite` instead of the local `offlineMutation` closure
- File length is meaningfully reduced (target: ~250 lines)
- All existing Cypress component tests for `useNoteSaveHandlers` continue to pass without modification
- No `@ts-ignore` or `@ts-expect-error` comments remain in the offline write path

## Constraints & Assumptions

- Must remain TypeScript-strict (no new `any` or `@ts-ignore`)
- `executeOfflineWrite` should be a plain `async function` or closure inside the hook — not a separate file/hook, since it has no independent lifecycle
- The slight differences between the two callers (e.g. `handleAutoSave` does a full queue refresh at the end; `handleSaveNote` increments count optimistically) should be reconciled into a consistent strategy
- Cypress is the test runner; tests mount component harnesses

## Questions & Open Items

- Which count-refresh strategy to unify on: optimistic increment (`setPendingCount(prev => prev + 1)`) or full queue scan? Recommendation: use optimistic increment for speed, retain full scan only in `handleAutoSave`'s finally block where it already runs.
