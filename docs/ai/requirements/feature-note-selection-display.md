---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
- Current bulk-selection UX says everything is selected even though only the currently loaded notes are affected. This misleads users, especially in advanced search view where cards differ and counts drift.
- We need a truthful indicator that shows how many notes are currently displayed versus the total available in the active context (all notes, tag filter, basic search, advanced search).
- The label must work for both note card layouts (standard list and advanced search cards) without extra API calls or loading all results.

## Goals & Objectives
- Show a clear label in the sidebar: `Notes displayed: X out of Y`, where X is the number of loaded/visible notes and Y is the total matching notes for the current filter/search state.
- Keep behavior consistent across normal view, tag filtering, basic search, and advanced search.
- Eliminate off-by-one/placeholder total issues in advanced search (no "+1" heuristics); totals should reflect real result metadata.
- Maintain existing delete semantics: bulk delete still affects only loaded notes; the UI label simply communicates scope honestly.

### Non-goals
- Do not force-load all notes or change pagination/batching.
- Do not change deletion behavior to include unloaded items.
- Do not add new API endpoints; reuse existing data and totals.

## User Stories & Use Cases
- As a user browsing all notes, I see `Notes displayed: X out of Y` that matches the loaded cards; when more notes load, X updates.
- As a user filtering by tags, I see the same label with tag-filtered totals.
- As a user using basic or advanced search, I see X based on loaded results and Y based on the search total; advanced search must avoid off-by-one.
- As a user in an empty state, I see `0 out of 0` without errors.

## Success Criteria
- The sidebar shows the label in every mode (normal, tag filter, basic search, advanced search) with correct X and Y.
- X equals the number of rendered cards; Y equals the total matches reported by the active data source; no off-by-one in advanced search.
- No extra network calls or full dataset loads are introduced.
- Selection/Delete buttons continue to operate only on loaded notes, and the label communicates that scope clearly.

## Constraints & Assumptions
- No new backend queries; use totals already returned (normal list pages include totalCount; advanced search must use its real total, not "+1"; fallback to accumulated length only if total is missing).
- Keep lazy loading/pagination unchanged.
- Works for both card renderers (standard and advanced search cards) and on mobile/desktop.
- Localization: keep text in English for now.

## Questions & Open Items
- Exact placement of the label (current position under actions, or closer to search box?) — choose consistent, non-intrusive spot in sidebar.
- Should we add i18n hook for the label now, or keep it English-only?
- Do we need a tooltip clarifying that bulk delete affects only displayed notes, or is the new label sufficient?
