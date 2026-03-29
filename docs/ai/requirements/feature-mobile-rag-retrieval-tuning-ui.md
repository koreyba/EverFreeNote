---
phase: requirements
title: Mobile RAG Retrieval Tuning UI
description: Mobile parity for persisted retrieval settings and precision tuning in AI note search
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

The web app already supports persisted retrieval settings and an in-search precision control, but the mobile app still uses the older preset-only AI search model.

- Affected users: EverFreeNote mobile users who use AI RAG Search and want the same retrieval controls already available on web.
- Current situation: mobile search still exposes `Strict / Neutral / Broad` presets, derives `topK` and threshold locally from presets, and mobile settings only manage the Gemini API key.
- Current workaround: switch to web to tune retrieval behavior, or accept the mobile presets even when they do not match the user’s corpus or query style.

## Goals & Objectives
**What do we want to achieve?**

### Primary goals
- Bring mobile AI search UI in line with the current web retrieval model.
- Replace the mobile preset selector with a precision slider in the mobile search screen.
- Load and persist retrieval settings on the user level via the existing shared settings services.
- Expose `topK` in mobile settings as a persisted retrieval setting.
- Surface read-only retrieval metadata in mobile settings:
  - `task_type_document`
  - `task_type_query`
  - `output_dimensionality`
  - any other relevant retrieval pipeline metadata already exposed on web
- Make mobile search use persisted `topK` plus committed `similarity_threshold`, not local presets.

### Secondary goals
- Keep mobile UI copy in English, matching web.
- Reuse shared core models/services instead of creating a mobile-specific retrieval settings contract.
- Align mobile `Load more` behavior with the newer backend `hasMore` contract where possible.

### Non-goals
- No changes to indexing or chunking logic.
- No changes to Gemini model/task-type behavior.
- No redesign of mobile search beyond what is needed to support retrieval tuning and parity with web.
- No new backend feature beyond wiring mobile to what already exists.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a mobile user, I want AI search precision controls in the search screen so I can tune results without leaving the app.
- As a mobile user, I want `topK` in Settings so my retrieval breadth is consistent across sessions.
- As a mobile user, I want retrieval settings to match web so search quality behaves consistently across devices.
- As a mobile user, I want changing the precision slider to trigger a new AI search only after I finish adjusting it.
- As a mobile user, I want settings defaults and read-only system values to remain visible even before I save anything custom.

### Key workflows
- User opens mobile Settings and updates persisted `topK`.
- User opens mobile AI search and adjusts `Precision`.
- User releases the slider and the current AI search reruns once with the new threshold.
- User switches between `Notes` and `Chunks` and sees retrieval output that reflects the persisted retrieval settings.

### Edge cases
- User has no stored retrieval settings yet: defaults are shown and used.
- User has a Gemini key configured but retrieval settings fail to load: mobile should still show defaults with a friendly error.
- User adjusts the slider before entering a valid query: value is persisted, but no AI request is fired yet.
- User switches between web and mobile: the same persisted retrieval settings should apply on both.

## Success Criteria
**How will we know when we're done?**

- [ ] Mobile settings expose persisted retrieval settings in addition to the Gemini API key.
- [ ] Mobile search no longer shows `Strict / Neutral / Broad`.
- [ ] Mobile search shows a precision slider with English copy.
- [ ] Mobile AI search uses persisted `topK` and committed threshold values instead of local presets.
- [ ] Mobile retrieval settings are loaded from and saved to the same per-user backend contract used by web.
- [ ] Mobile UI shows read-only retrieval metadata.
- [ ] Existing Gemini key flow on mobile continues to work.
- [ ] Mobile tests cover the new retrieval settings UI and search behavior.

## Constraints & Assumptions
**What limitations do we need to work within?**

### Technical constraints
- Mobile search currently uses `useMobileAIPaginatedSearch` and `useMobileSearchMode`, both built around local presets.
- Mobile search/settings screens are implemented in React Native / Expo, not shared web components.
- Shared retrieval settings types and services already exist in `core`.
- Backend retrieval settings storage and `rag-search` contract already exist.

### Assumptions
- Mobile should follow the same product decisions already made for web:
  - persisted `topK`
  - precision slider for `similarity_threshold`
  - English copy
  - fixed Gemini task types
- Mobile settings should remain under the existing `API Keys` / integration area instead of introducing a brand-new tab.
- The mobile implementation may reuse web defaults and read-only constants from shared core.

## Questions & Open Items
**What do we still need to clarify?**

- None at this stage; proceed with mobile parity to the current web behavior unless implementation reveals a mobile-specific UX constraint.
