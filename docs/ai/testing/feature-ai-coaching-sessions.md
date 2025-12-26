---
phase: testing
title: Testing Strategy
description: Tests for AI coaching session edge functions
feature: ai-coaching-sessions
---

# Testing Strategy: AI Coaching Sessions

## Test Coverage Goals
- Unit test coverage target: 100% for request parsing and validation logic.
- Integration tests: happy path + error handling for each edge function.
- Manual smoke: verify sessions appear in the notes UI and are filtered by tag.

## Unit Tests
### Component/Module 1: save-session
- [ ] Returns 400 on missing topic/content.
- [ ] Returns 400 when content exceeds 50KB.
- [ ] Returns 500 on missing COACHING_USER_ID.
- [ ] Inserts note with expected title format and tag.

### Component/Module 2: get-sessions
- [ ] Default limit returns 3 records.
- [ ] Invalid limit (<1 or >20) returns 400.
- [ ] Filters by tag and sorts newest to oldest.

### Component/Module 3: search-sessions
- [ ] Invalid query (too short/empty) returns 400.
- [ ] Limit bounds enforced (1..20).
- [ ] Results are filtered by tag and ranked by FTS.

### Component/Module 4: update-session
- [ ] Returns 400 on missing id.
- [ ] Returns 400 on invalid mode.
- [ ] Returns 400 when mode=replace and content empty.
- [ ] Returns 400 when mode=append and append empty.
- [ ] Returns 400 when resulting content exceeds 50KB.
- [ ] Returns 404 when session not found.
- [ ] Updates title when topic is provided.
- [ ] Appends content with mode=append.

## Integration Tests
- [ ] POST save-session then GET get-sessions returns the new note.
- [ ] search-sessions finds the saved session by keyword.
- [ ] update-session changes description for the saved session.
- [ ] CORS preflight (OPTIONS) returns 200 with headers.

## End-to-End Tests
- [ ] Trigger save-session via Claude, open notes list, confirm session note exists.
- [ ] Retrieve last 3 sessions and use them as context in a new chat.

## Test Data
- Create a test user in Supabase Auth.
- Use `COACHING_USER_ID` to target the test user.
- Use a unique topic to avoid collisions (e.g. "Embodiment resistance").

## Test Reporting & Coverage
- Coverage gaps: Edge function request parsing not yet covered by automated tests.
- Suggested tool: `/writing-test` to generate unit + integration tests for edge functions.

## Manual Testing
- Verify `save-session` inserts a note in UI with `claude-therapy` tag.
- Verify `get-sessions` returns newest-first ordering.
- Verify `search-sessions` finds matches in description content.

## Performance Testing
- Basic check: `get-sessions?limit=20` returns under 200ms on prod.

## Bug Tracking
- Log issues with repro steps, payload, and response status.
