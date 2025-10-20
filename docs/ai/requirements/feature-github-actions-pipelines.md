---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- **Core Problem:** Build and test pipelines are tightly coupled in GitHub Actions, causing redundant builds every time tests need to be re-run. This wastes CI/CD resources and time.
- **Who is affected:** All developers working on the project who need to run or re-run tests in CI/CD.
- **Current situation:** When tests fail, the entire pipeline (including build) must be re-run, even though the build artifact hasn't changed. There's no way to test pipeline changes locally before pushing to GitHub.

## Goals & Objectives
**What do we want to achieve?**

### Primary Goals
- Separate build and test stages so builds happen once and tests can reuse artifacts
- Enable re-running test steps without rebuilding
- Support local pipeline testing using Act with identical environments to GitHub Actions
- Reduce CI/CD resource usage and execution time

### Secondary Goals
- Improve developer experience with faster feedback loops
- Make pipeline debugging easier with local testing capability

### Non-Goals
- Changing the actual test code or test frameworks
- Modifying the build output or deployment process
- Adding new testing types beyond existing E2E and component tests

## User Stories & Use Cases
**How will users interact with the solution?**

- **As a developer**, I want to re-run failed tests without rebuilding the entire project, so that I can get faster feedback on test fixes
- **As a developer**, I want to test GitHub Actions pipeline changes locally before pushing, so that I can catch configuration errors early
- **As a CI/CD maintainer**, I want to reuse build artifacts across multiple test runs, so that we reduce resource consumption
- **As a developer**, I want test pipelines to download a specific build artifact by ID, so that tests run against the exact build I expect

### Key Workflows
1. **Build once, test multiple times:** Build pipeline creates artifact → Multiple test pipelines download and use it
2. **Re-run test step:** Test setup completes → Test execution fails → Re-run only test execution step
3. **Local pipeline testing:** Modify pipeline YAML → Run with Act locally → Verify behavior → Push to GitHub

### Edge Cases
- Build artifact not found (wrong ID or expired)
- Multiple builds running simultaneously (unique IDs prevent conflicts)
- Act environment differences from GitHub Actions (must be identical)

## Success Criteria
**How will we know when we're done?**

- [ ] Build pipeline successfully creates production build and uploads artifact with unique ID (e.g., `build-${{ github.run_id }}`)
- [ ] E2E test pipeline accepts `build_id` input parameter
- [ ] Component test pipeline accepts `build_id` input parameter
- [ ] Test pipelines download correct artifact before running tests
- [ ] Test pipelines have two distinct steps: "Setup Environment" and "Run Tests"
- [ ] "Run Tests" step can be re-run independently without re-running "Setup Environment"
- [ ] Act can run all pipelines locally with identical behavior to GitHub Actions
- [ ] Documentation exists for running pipelines locally with Act
- [ ] At least one successful test run demonstrates artifact reuse across pipelines

## Constraints & Assumptions
**What limitations do we need to work within?**

### Technical Constraints
- Must use GitHub Actions artifact storage (limited retention period)
- Act must support all GitHub Actions features used in pipelines
- Windows development environment (Act runs in Docker on Windows)

### Assumptions
- Supabase can be started/stopped in CI environment for tests
- Current test suite is stable and doesn't need modification
- Build artifacts are deterministic (same code = same artifact)
- GitHub Actions artifact retention policy is sufficient for our needs

## Questions & Open Items
**What do we still need to clarify?**

- ✅ What unique ID format should we use for artifacts? (Answer: `build-${{ github.run_id }}` or commit SHA)
- ✅ How long should artifacts be retained? (Answer: Use GitHub default, typically 90 days)
- ✅ Should we support manual artifact ID input for test pipelines? (Answer: Yes, as workflow_dispatch input)
- ✅ What Docker images should Act use to match GitHub Actions? (Answer: Use official GitHub Actions runner images)

