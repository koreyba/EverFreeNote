---
phase: planning
title: Android Build Pipeline Planning
description: Planning, milestone tracking, and task breakdown for the Android build pipeline setup, including interactive checkbox trigger panel.
---

# Android Build Pipeline Planning

## Milestones

- [x] Milestone 1: Manual Android Build Pipeline (`android-build.yml`)
- [ ] Milestone 2: PR Interactive Checkbox & Comment Trigger Pipeline (`pr-build-trigger.yml`)
- [ ] Milestone 3: Integration, Testing, and Documentation Updates

## Task Breakdown

### Phase 1: Manual Build Pipeline (`android-build.yml`) [COMPLETED]
- [x] Task 1.1: Initialize `android-build.yml` with manual dispatch configuration.
- [x] Task 1.2: Add Node.js installation, caching, and dependency installation (`npm ci`).
- [x] Task 1.3: Configure the web bundle preparation step (`prepare:webview-bundle`).
- [x] Task 1.4: Fix the Windows `org.gradle.java.home` path on Linux CI runner.
- [x] Task 1.5: Configure Java 17 and Gradle settings.
- [x] Task 1.6: Run Gradle assemble commands for stage and prod variants based on user inputs.
- [x] Task 1.7: Format output APK filename and upload it as a workflow artifact.

### Phase 2: PR Trigger and Checkbox Panel (`pr-build-trigger.yml` & `render-pr-status-comment.js`)
- [ ] Task 2.1: Add "Android Build Panel" checkboxes to `scripts/render-pr-status-comment.js`.
- [ ] Task 2.2: Update `pr-build-trigger.yml` to trigger on `edited` issue_comment types.
- [ ] Task 2.3: Modify permission validation to check `github.event.sender.login` (human editor).
- [ ] Task 2.4: Implement checkbox parsing to determine if a build was checked.
- [ ] Task 2.5: Implement PATCH api call to reset checkboxes back to `[ ]`.
- [ ] Task 2.6: Post comment feedback linking to the running run.

### Phase 3: Verification & Documentation
- [ ] Task 3.1: Verify YAML files syntax.
- [ ] Task 3.2: Update the `docs/GITHUB_ACTIONS_PIPELINES.md` with instructions.

## Dependencies
- Checking/editing checkboxes relies on the status comment script being run by unit/component/e2e test workflows.

## Risks & Mitigation
- **Risk**: Infinite loops if the bot editing comment triggers itself.
  - *Mitigation*: The workflow only triggers if comment contains a checked box `[x]`. The PATCH request replaces `[x]` with `[ ]`. Thus, when the bot updates it to `[ ]`, it will trigger the workflow again, but the condition `contains(github.event.comment.body, '- [x]')` will be false, preventing infinite loops.
