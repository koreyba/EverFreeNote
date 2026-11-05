---
phase: implementation
title: MCP Note Workflows — Implementation
description: Technical implementation notes, patterns, and code guidelines
---

# Implementation Guide

## Development Setup
Worktree: external `mcp-note-workflows/EverFreeNote`, branch `codex/mcp-note-workflows`. Bootstrap with root and shell `npm ci --ignore-scripts`.

## Code Structure
See the design document for ownership of the edit helper, tool schemas, repository methods, RAG adapter and SQL RPCs.

## Implementation Notes
Implemented in server version 1.1.0. `applyContentEdits` uses htmlparser2 source positions to validate complete top-level block anchors without reserializing untouched HTML. Inserted fragments use the existing sanitizer. All edits are computed before one invoker RPC locks/checks/updates the row; no unconditional retry occurs on conflict.

`getNotes` performs one owner-scoped select. The tool maps records back to requested order and applies the shared body budget without partial HTML/text. `search_notebook_notes` filters eligible notes before weighted FTS or best-chunk similarity; hybrid uses reciprocal rank fusion with constant 60. Date validation preserves PostgreSQL microsecond resolution and handles malformed timestamps as validation errors.

`rag-search` accepts an additive `notebookSearch` request, validates it before authentication/billing, reuses key/model checks and one embedding, then calls the new user-scoped RPC. Legacy chunk requests follow their original path. A non-JSON 404 is still classified as a missing RAG deployment by the MCP adapter. Existing literal listing, single reads and unguarded legacy full replacements keep their original contracts.

## Integration Points
New RPC migration precedes deployment of `mcp` and `rag-search`; no web UI change is required. New RAG request shape is additive to legacy chunk-search calls.

## Error Handling
Version conflict, anchor mismatch/ambiguity, missing note and invalid input must not cause partial updates. Batch outcomes expose missing/over-budget notes. Hybrid fallback reports its actual mode and warning.

## Performance Considerations
One batch select; bounded response bodies; filter before rank/page; one embedding per semantic/hybrid request. Benchmarks are outside the completion claim unless measured.

## Security Notes
All new SQL runs as invoker under RLS plus auth.uid ownership. No service-role key or user key is returned through MCP.
