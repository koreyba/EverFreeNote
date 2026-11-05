---
phase: requirements
title: MCP Note Workflows — Requirements
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
Agents must currently rewrite an entire HTML body, open notes one at a time, and choose between literal and semantic search without date filters. This makes adding meeting minutes, comparing twenty notes, and finding a project's notes for a month unnecessarily costly and error-prone.

## Goals & Objectives
- Extend `update_note` with append/prepend, insertion before/after an exact block, and replacement of an exact block; preserve untouched HTML and reject stale writes.
- Add bounded batch reading with explicit per-note missing/over-budget outcomes and text/HTML selection.
- Add ranked text, semantic and hybrid search with created/updated time ranges, several tags, pagination and sorting. Filters must apply before ranking/limiting.
- Preserve existing tool contracts for existing callers. No delete, bulk tag changes, Markdown input, new grants or indexing actions.

## User Stories & Use Cases
- US-1: Append meeting minutes without resending the previous body.
- US-2: Insert a paragraph in the middle or replace one section without changing the rest.
- US-3: Detect that the user edited a note since the agent read it, instead of losing that edit.
- US-4: Compare twenty notes in one read with a predictable response budget.
- US-5: Find notes about a project created/updated in a given month and carrying all/any requested tags, ordered by relevance or recency.
- US-6: Use ordinary search without Gemini; use hybrid search with a clear text fallback if semantic search is not configured.

## Success Criteria
- All five edit operations work through the MCP SDK client. Stale/ambiguous/missing anchors and conflicting input are actionable tool errors without writes.
- Batch reading uses one repository select, preserves requested order and reports every requested id, including foreign/missing/over-budget notes.
- Text/semantic/hybrid filtering and ranking are exercised on real PostgreSQL with pgvector and two users under RLS.
- Focused and full relevant tests, type-check, ESLint, Deno checks and build pass. Exact-head CI and independent Claude review are required before merge.

## Constraints & Assumptions
The remote MCP server remains stateless; no service-role access in MCP. Rich content stays HTML. Anchors identify complete top-level HTML blocks, allowing paragraph/section edits without a DOM editor on the server. All time bounds use ISO timestamps with offsets, inclusive lower bounds and exclusive upper bounds.

## Questions & Open Items
User approved implementation, documentation, testing and merge of these three capabilities, conditioned on Claude's explicit review approval. Deployment of the database migration and functions is a separate runtime step and must be reported accurately.
