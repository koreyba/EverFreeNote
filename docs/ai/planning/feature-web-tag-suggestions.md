---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Requirements + design finalized for web tag suggestions.
- [ ] Milestone 2: Tag input UI and suggestion logic implemented in web editor.
- [ ] Milestone 3: Tests and documentation updated.

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Review current tag input, NoteView, and tag mutations in web UI. (Notes: tags input is comma-separated in NoteEditor; remove tag uses InteractiveTag + useRemoveTag; save/autosave parses tags via split(',') + trim + filter.)
- [x] Task 1.2: Design tag suggestion data source and sorting rules (alphabetical). (Notes: derive unique normalized tags from notes cache; suggestions after 3 chars, prefix match, exclude selected, alpha sort, limit 3.)

### Phase 2: Core Features
- [x] Task 2.1: Build tag input component with chip rendering and suggestion list. (Notes: NoteEditor now renders InteractiveTag chips with inline input and suggestion list.)
- [x] Task 2.2: Wire tag selection/add/backspace behavior in edit mode (comma/Enter only). (Notes: added comma/Enter commit, pending tag commits on save/leave/blur/autosave from non-tag edits, double-backspace removes last tag, suggestions after 3 chars, prefix match, limit 3, alpha sort; tag input does not trigger autosave.)
- [x] Task 2.3: Preserve tag removal behavior in read mode (no regression). (Notes: NoteView still uses InteractiveTag with onRemove; no changes required.)

### Phase 3: Integration & Polish
- [x] Task 3.1: Add unit/integration tests for tag suggestions and chip removal. (Notes: updated `cypress/component/features/notes/NoteEditor.cy.tsx` with suggestions/add/remove/normalize tests.)
- [x] Task 3.2: Update docs (implementation + testing) with decisions and coverage notes. (Notes: refreshed implementation/testing docs with new files and test coverage.)

## Dependencies
**What needs to happen in what order?**

- Tag suggestion logic depends on access to the notes cache in the controller/hooks.
- UI behavior depends on existing save/autosave flows in `NoteEditor`.
- No external API dependencies.

## Timeline & Estimates
**When will things be done?**

- Phase 1: 0.5 day.
- Phase 2: 1-2 days.
- Phase 3: 0.5-1 day.

## Risks & Mitigation
**What could go wrong?**

- Tag suggestion list may be incomplete if notes are not fully loaded; mitigate by clearly documenting scope.
- Tag parsing/formatting regressions; mitigate with tests around save/autosave behavior.
- UI usability issues with chip layout; mitigate with quick visual QA and spacing adjustments.

## Resources Needed
**What do we need to succeed?**

- Web UI codebase familiarity (`NoteEditor`, `NoteView`, `InteractiveTag`).
- Access to existing notes/tag cache via React Query.
- Testing framework for UI component tests.
