---
phase: testing
title: MCP Note Workflows — Testing
description: Define testing approach, test cases, and quality assurance
---

# Testing Strategy

## Test Coverage Goals
Exercise safe body edits, per-note batch outcomes, every search mode and ownership boundaries. Unit coverage targets all new executable lines; SQL uses real behavior tests rather than a line-coverage claim.

## Unit Tests
- `core-mcp-noteWorkflows.test.ts`: SDK client calls; append/insert, versions including null, conflicting fields, stale/missing notes, all-or-nothing edit validation, twenty-note ordering, budgets, missing/foreign ids, search filters and hybrid fallback/error semantics.
- `core-mcp-noteEdits.test.ts`: prepend/after/replace/delete, sequential edits, adjacent blocks, ambiguity, nested/missing anchors, new-fragment sanitization, bounded content and exact/malformed date ranges.
- `core-mcp-repositoryWorkflows.test.ts`: one batch query, ownership, exact timestamp forwarding, conditional update outcomes and search RPC parameters.
- `core-mcp-rankedSemanticSearch.test.ts`: note-search HTTP adapter, setup gaps, non-JSON gateway responses, genuine failures and response validation.
- `core-mcp-ragNotebookRoute.test.ts`: unchanged production HTTP handler with synthetic platform/network boundaries; one embedding, saved/explicit zero threshold, user-token RPC, invalid input before billing and legacy chunk API. Captures request/response evidence.

## Integration Tests
`core/tests/integration/mcpNotebookDatabase.test.ts`: 14 tests on disposable Supabase PostgreSQL 17 with pgvector. Covers a successful conditional write, stale and concurrent writers, foreign-note isolation, anonymous EXECUTE denial, time/tag filters before ranking, out-of-range totals, distinct-note semantic limits, hybrid fusion, exclusive upper bounds, null timestamps/title/tags, invalid SQL arguments, Russian stemming and any-tags matching.

The suite requires `MCP_DATABASE_CONTAINER` and refuses destructive fixtures unless the container is labelled `com.everfreenote.test-purpose=mcp-note-workflows`. It uses its dedicated `mcp_workflows` database. CI supplies a labelled service container; absent configuration uses Jest-native suite skipping. Auth identity is provided through a fixture `auth.uid()` under real role/RLS checks; this does not test a Supabase Auth server.

## End-to-End Tests
No live OAuth/Gemini or deployed-client acceptance was performed. Staging rollout checks are in the deployment document. Existing six `mcp-supabase-local` tests need their separate local Auth/PostgREST setup and were skipped in the broad local run.

## Test Data
Only synthetic users, UUIDs, HTML notes and vectors in a labelled disposable container. No production credentials, notes or API keys. RAG HTTP tests use synthetic encrypted keys and mocked external responses.

## Test Reporting & Coverage
Local broad run on 2026-11-05: **2173 passed, 6 skipped**, exit 0, across core unit, core integration and web unit projects. New database suite: **14/14**, exit 0, explicit Allure scope/count expectations matched. Review hardening passed **223/223** combined MCP and database tests, including the malformed-HTML overlap regression. Focused MCP coverage before review hardening: **208/208**, 97.96% lines overall in `core/mcp`, with 100% executable lines in the new editing/search modules and tool server. Existing legacy RAG adapter failure and tag-scan fallback branches account for remaining aggregate gaps; SQL coverage is scenario-based.

Commands:
```sh
npx allure agent --goal "MCP contracts" --report auto -- npx jest --config jest.config.cjs --selectProjects unit-core --testPathPatterns core-mcp --runInBand --coverage --collectCoverageFrom='core/mcp/*.ts'
MCP_DATABASE_CONTAINER=<labelled-container> npx allure agent --goal "MCP database contracts" --expect-label feature=mcp-note-workflows-db --expect-tests 14 --report auto -- npx jest --config jest.config.cjs --selectProjects integration-core --testPathPatterns mcpNotebookDatabase --runInBand
MCP_DATABASE_CONTAINER=<labelled-container> npx allure agent --goal "Core and web regression" --report off -- npx jest --config jest.config.cjs --selectProjects unit-core integration-core unit-web --runInBand
```

Type-check, ESLint with zero warnings, Deno checks for both changed functions and the production web build passed locally. The web build used synthetic public Supabase configuration and proves compilation/static export, not live backend behavior.

Local Codacy analysis (project ESLint 9): zero issues in eight production source files. Codacy Cloud could not run because no API token was configured; no remote Codacy coverage or quality-gate result is claimed. PR checks and independent Claude approval are separate merge gates.

## Manual Testing
Pending after deployment: client tool discovery, middle-block editing in rendered rich text, comparing twenty real notes, and a month/tag query whose expected results are known.

## Performance Testing
One repository batch select and one embedding per semantic/hybrid request are asserted. No latency/load benchmark was performed. Search computes eligible note vectors/ranks at query time; measure large libraries before promising latency gains.

## Bug Tracking
TDD first demonstrated absent behavior. Independent Claude review approved the initial HEAD and identified non-blocking HTML-boundary and snippet-work improvements. Both were incorporated; final-HEAD approval remains a merge gate. CodeRabbit reviewed the initial 32-file change and raised 0 issues.

Additional regressions caught microsecond range rounding, malformed date handling, nullable search titles and non-JSON gateway setup errors. No user data was changed.
