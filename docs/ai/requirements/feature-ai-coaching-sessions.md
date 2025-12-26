---
phase: requirements
title: Requirements & Problem Understanding
description: Edge functions for AI coaching session storage and retrieval
feature: ai-coaching-sessions
---

# Requirements & Problem Understanding: AI Coaching Sessions

## Problem Statement
AI coaching sessions (Claude) need to be saved automatically as notes and later retrieved to provide context in new chats. Sessions live in the existing `notes` table and must be distinguished from normal notes via a single tag.

## Goals & Objectives
- Provide an API to save a session summary as a regular note.
- Provide an API to fetch the latest N sessions (default 3, max 20).
- Provide an API to update an existing session note.
- Optionally provide full-text search across session content.
- Allow calls via anon key (no end-user auth flow).
- Keep storage in `notes` table; do not create new tables.

## User Stories
1. As an AI coach, I want to save a session summary with a single API call so the user can revisit it later.
2. As an AI coach, I want to load the latest 1-20 sessions for context depending on the task.
3. As a user, I want to find sessions by keywords using full-text search.
4. As an AI coach, I want to update an existing session summary if the draft changed.

## Success Criteria
- Sessions appear as normal notes with title `Session YYYY-MM-DD - {topic}`.
- Sessions have tag `claude-therapy` and can be filtered from other notes.
- `GET` without limit returns 3 sessions; limit obeys 1..20.
- Session content can be updated by note id (replace or append).
- Functions are callable with anon key and include CORS support.

## Constraints & Assumptions
- `notes` table and RLS policies stay unchanged.
- `claude-therapy` tag is the single differentiator from regular notes.
- Edge Functions run with service role key for DB access.
- Target user is fixed via `COACHING_USER_ID` env.

## Open Questions
- None.
