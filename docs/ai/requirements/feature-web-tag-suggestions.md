---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- Web users create duplicate/inconsistent tags because the tag input does not suggest existing tags.
- Tags in edit mode are not clearly represented as distinct, removable elements, which makes management slower and error-prone.

## Goals & Objectives
**What do we want to achieve?**

- Primary: Suggest existing tags after 3 typed characters so users can select a consistent tag.
- Primary: Render tags in edit mode using the same chip UI as read mode (including the remove control).
- Primary: Allow backspace to remove the last tag while editing when the input is empty.
- Primary: Preserve the existing ability to remove tags in read mode.
- Primary: Sort suggestions alphabetically.
- Secondary: Keep the UI consistent with the current web tag style and interaction patterns.
- Non-goal: Add new backend endpoints or data model changes for tags.
- Non-goal: Implement advanced tag management (rename/merge/bulk edit).
- Non-goal: Modify mobile behavior as part of this feature.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a web user, I want to see existing tag suggestions after I type three characters so I can pick a consistent tag.
- As a web user, I want added tags to use the same chip UI as in read mode so the behavior is consistent.
- As a web user, I want to add a tag by typing and pressing comma or Enter so I can work quickly from the keyboard.
- As a web user, I want to remove the last tag with backspace when the tag input is empty so I can edit quickly from the keyboard.
- As a web user reading a note, I want tag removal to work the same way it does today.
- Edge cases: duplicate tags, long tag names, tags with spaces/punctuation, many tags, tags that match by prefix, case differences.

## Success Criteria
**How will we know when we're done?**

- Tag suggestions appear only after three typed characters and allow selecting an existing tag.
- Suggestions exclude tags already added to the note.
- Suggestions are sorted alphabetically and limited to 3 items.
- Suggestions match by prefix only.
- Selecting a suggestion adds the tag without creating duplicates.
- Edit mode uses the same chip rendering as read mode, with the X control to remove a tag.
- Backspace removes the last tag only in edit mode when the input is empty.
- Read mode retains the existing tag removal behavior (X control remains available).
- Tags can be added via comma or Enter only (no space, no blur auto-add) and are normalized consistently.
- No regressions to existing note edit/save flows.

## Constraints & Assumptions
**What limitations do we need to work within?**

- Web UI only; reuse existing tag storage and note update flows.
- Suggestions are derived from existing tags for the current user/account.
- No changes to backend APIs or database schema.
- Tag suggestion threshold is fixed at three characters.
- Suggestion list excludes already selected tags and is limited to 3 items.
- Suggestion ordering uses most recently used tags first.
- Suggestions use prefix matching only.
- Tag normalization trims whitespace, collapses multiple spaces to one, and lowercases for storage and duplicate checks.
- Existing tags are normalized on edit/save only (no migration).

## Questions & Open Items
**What do we still need to clarify?**

- None.
