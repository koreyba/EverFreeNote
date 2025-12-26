---
phase: planning
title: Task Breakdown & Plan
description: Plan for AI coaching session edge functions
feature: ai-coaching-sessions
---

# Plan: AI Coaching Sessions

## Scope
- Implement `save-session`, `get-sessions`, and optional `search-sessions` edge functions.
- Update ai-devkit docs (requirements, design, implementation, testing).

## Tasks
1. **Define requirements and constraints**
   - Confirm user identification strategy for anon calls.
   - Document acceptance criteria and open questions.

2. **Implement edge functions**
   - Create function folders in `supabase/functions/`.
   - Add CORS handling and validation.
   - Insert/select notes with tag `claude-therapy`.
   - Use service role key for DB access.
   - Add update endpoint for existing sessions.

3. **Document implementation**
   - Record API contracts and data flow (mermaid).
   - Capture env variables and deployment notes.

4. **Testing**
   - Create feature-specific testing doc using template.
   - Define unit/integration/manual test scenarios.
