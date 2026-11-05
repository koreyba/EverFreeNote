---
phase: deployment
title: Deployment Strategy
description: Define deployment process, infrastructure, and release procedures
---

# Deployment

## Prerequisites
Deploy the new `mcp_update_note` and `search_notebook_notes` RPC migration before updated Edge Functions. Validate invoker permissions and existing RLS in staging.

## Deployment Steps
Apply migrations, deploy `rag-search`, then deploy `mcp --no-verify-jwt`. Existing chunk-search callers and legacy MCP tools remain compatible.

## Verification
Read a note, append with its exact version, retry the old version and expect conflict. Read a batch containing one missing id. Run text and hybrid searches with a month range and multiple tags. Confirm no foreign-user rows.

## Rollback
Revert function code first. The additive RPCs may remain until no callers use them. No note data migration or deletion occurs.

## Status
Implementation is being prepared; no remote database migration or function deployment has been performed by this task.
