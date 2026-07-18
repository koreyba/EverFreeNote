---
phase: testing
title: Android Build Pipeline Testing Strategy
description: Test cases, manual verification checklists, and success verification criteria for the Android build pipelines.
---

# Android Build Pipeline Testing Strategy

## Test Coverage Goals
Since these are GitHub Actions CI workflows, verification is primarily manual and integration-based (verifying correct behavior on GitHub runner runs). We want to test:
- Correct trigger of workflows under various scenarios.
- Correct execution of each workflow step.
- Security boundaries (collaborator validation for comments and edits).
- Correct packaging and naming of output artifacts.

## Manual Testing & Verification Checklist

### Test Scenario 1: Manual Trigger via Actions Tab (Stage Variant)
1. Navigate to the **Actions** tab in the GitHub repository.
2. Select **Android Build** workflow.
3. Click **Run workflow**.
4. Select the target branch (e.g., `android-build-pipeline-setup`).
5. Choose `stage` under the environment/variant parameter.
6. Click **Run workflow** and wait for it to complete.
7. **Verify**:
   - The run completes successfully (green checkmark).
   - An artifact named `everfreenote-stage-release-<SHA>` is produced.
   - The downloaded zip contains a file named `everfreenote-stage-release-<SHA>.apk` (approx. 30-50MB).

### Test Scenario 2: Manual Trigger via Actions Tab (Prod Variant)
1. Repeat steps in Scenario 1 but choose `prod` as the environment parameter.
2. **Verify**:
   - The run completes successfully.
   - An artifact named `everfreenote-prod-release-<SHA>` is produced.
   - The downloaded zip contains a file named `everfreenote-prod-release-<SHA>.apk`.

### Test Scenario 3: PR Comment Trigger (Authorized User)
1. Create a Pull Request from a branch containing these workflows.
2. As a repository collaborator with write/admin permissions, post a comment: `/build-android stage`.
3. **Verify**:
   - A rocket emoji reaction (`🚀`) is added to your comment by `github-actions[bot]`.
   - The bot replies with a comment linking to the running workflow.
   - Click the link and check that the build runs on the PR's head branch and variant `stage`.
   - The build completes and uploads the correct artifact.
4. Post another comment: `/build-android prod`.
5. **Verify**:
   - The build runs on the PR's head branch and variant `prod`.

### Test Scenario 4: Interactive Checkbox Trigger (Authorized User)
1. On an open PR, find the status comment posted by `github-actions[bot]` containing the "Android Build Panel".
2. As a repository collaborator with write/admin permissions, click the checkbox for `Build Stage Release APK` (`- [ ] 🚀 Build Stage Release APK`).
3. **Verify**:
   - A rocket emoji reaction (`🚀`) is added to the status comment.
   - The checkbox immediately resets back to unchecked (`- [ ]`) state.
   - A new comment is posted by the bot linking to the triggered run.
   - The build workflow starts and builds the `stage` APK on the PR's branch.
4. Click the checkbox for `Build Prod Release APK`.
5. **Verify**:
   - Rocket reaction is added, checkbox resets.
   - A new comment is posted linking to the `prod` build.

### Test Scenario 5: Interactive Checkbox Trigger (Unauthorized User)
1. Ask a user who does not have write access to the repository to click the checkbox on the status comment.
2. **Verify**:
   - The checkbox resets back to unchecked state.
   - No workflow run is triggered.
   - A permission warning comment is posted: `⚠️ @username, you do not have permission to trigger Android builds.`

### Test Scenario 6: PR Comment Trigger (Unauthorized User)
1. Ask a user who does not have write access to the repository to comment `/build-android stage` on the PR.
2. **Verify**:
   - No workflow run is triggered.
   - No rocket emoji is added.
   - A permission warning comment is posted.
