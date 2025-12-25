---
phase: planning
title: Project Planning & Task Breakdown
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
**What are the major checkpoints?**

- [ ] Milestone 1: Requirements and design aligned for mobile tags
- [ ] Milestone 2: Core tag UI implemented on note list and note detail
- [ ] Milestone 3: Search + filtering by tag complete and verified

## Task Breakdown
**What specific work needs to be done?**

### Phase 1: Foundation
- [x] Task 1.1: Review core tag mechanisms and existing web behavior (Notes: tags are string[], filtering uses contains('tags',[tag]) in core notes/search; web uses InteractiveTag, clear tag filter, search placeholder includes active tag; tags input is comma-separated + trim)
- [x] Task 1.2: Add shared Tag UI components for mobile (chips, list, input) (Notes: added TagChip, TagList, TagInput, TagFilterBar components under ui/mobile/components/tags)

### Phase 2: Core Features
- [x] Task 2.1: Render tags in note list cards (Notes: NoteCard renders TagList with up to 3 tags)
- [x] Task 2.2: Render tags in note detail/editor and allow add/remove (Notes: TagInput added to note header with remove support; input dedupes tags case-insensitively)
- [x] Task 2.3: Persist tag changes through existing note update flow (Notes: debounced update now includes tags)

### Phase 3: Integration & Polish
- [x] Task 3.1: Add tag display and filter in search results (Notes: search results render TagList; TagFilterBar added; search uses paginated loading)
- [x] Task 3.2: Add tag filter interactions (tap chip to filter, clear filter) (Notes: tag taps route to search with tag param; Clear Tags removes filter; search uses tag-aware query and offline note_tags table)
- [x] Task 3.3: UI polish for long/many tags and empty states (Notes: maxVisible + overflow count; TagChip truncation; empty state shown for tag-only searches)

## Dependencies
**What needs to happen in what order?**

- Tag UI components before wiring screens.
- Understanding core tag behavior before implementing mobile edits.
- Search filtering depends on note/tag query capabilities in core.

## Timeline & Estimates
**When will things be done?**

- Phase 1: 0.5-1 day
- Phase 2: 1-2 days
- Phase 3: 0.5-1 day
- Buffer: 0.5 day for QA and tweaks

## Risks & Mitigation
**What could go wrong?**

- Risk: Core tag behavior differs from web assumptions.
  - Mitigation: Validate with web implementation and core utilities first.
- Risk: Tag rendering affects list performance.
  - Mitigation: Keep chips lightweight and leverage existing list virtualization.
- Risk: Filter state becomes inconsistent across screens.
  - Mitigation: Centralize filter state per screen and reuse hooks.

## Resources Needed
**What do we need to succeed?**

- Access to web tag UX as reference
- Mobile component primitives and theme tokens
- Expo Go device testing for UI validation
