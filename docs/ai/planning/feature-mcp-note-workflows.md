---
phase: planning
title: MCP Note Workflows — Planning
description: Break down work into actionable tasks and estimate timeline
---

# Project Planning & Task Breakdown

## Milestones
- [x] Approved scope and isolated worktree; reviewed existing MCP docs and current main.
- [x] Safe block edits, conditional writes and protocol coverage.
- [x] Bounded batch reads and protocol coverage.
- [x] Ranked filtered text/semantic/hybrid search and real database coverage.
- [ ] Documentation, full checks, PR, exact-head CI, Claude approval and merge.

## Task Breakdown
- [x] Write failing edit, batch and search behavior tests before production implementation.
- [x] Add block-edit helper, timestamp precondition and update RPC.
- [x] Add one-query batch repository read and budgeted tool.
- [x] Add shared search schema, ranked RPC and RAG note-search branch.
- [x] Add hermetic PostgreSQL/pgvector integration tests and CI database service.
- [x] Validate core/web tests, coverage, types, ESLint, Deno and build.
- [ ] Review locally and obtain independent Claude verdict on final HEAD.
- [ ] Publish PR, resolve demonstrated findings, wait for checks and merge only after Claude APPROVE.

## Dependencies
New SQL RPCs must be deployed before the updated functions are used. Existing literal listing, single reads and legacy writes remain compatible.

## Timeline & Estimates
Sequential implementation by capability; no fixed delivery estimate. Review/CI follow implementation and may require another correction pass.

## Risks & Mitigation
Ambiguous HTML anchors: reject, never guess. Concurrent writers: database precondition. Huge notes: explicit per-item budget outcomes. Hybrid scoring: reciprocal rank fusion. RLS: invoker SQL and two-user database tests. Existing agent grants and embedding configuration remain unchanged.

## Resources Needed
Node 24, Deno, Docker PostgreSQL/pgvector, GitHub access, independent Claude review. Claude approval is a merge gate set by the user.
