---
phase: requirements
title: Android Build Pipeline Requirements
description: Requirements for a manual GitHub Actions build pipeline to compile Android APKs (Stage and Prod) and trigger builds from PR comments or interactive checkboxes.
---

# Android Build Pipeline Requirements

## Problem Statement
Currently, there is no automated pipeline to build Android APKs from the React Native project inside `ui/mobile`. Developers and QA testers must build APKs locally, which is slow, inconsistent, and requires setting up local Android SDK environments. 
We need a manual CI pipeline to compile Android APKs for non-debug variants from a given branch, publish the resulting APKs as workflow artifacts, and allow developers to trigger these builds directly from Pull Requests via comments or interactive checkboxes in a bot status comment.

## Goals & Objectives
- **Manual Trigger**: Build Android APKs on-demand from any branch using a manual trigger (`workflow_dispatch`).
- **Release Separation**: Support two distinct build variants:
  - **Stage Release** (`stageRelease` variant, targeting `com.everfreenote.app.stage`).
  - **Prod Release** (`prodRelease` variant, targeting `com.everfreenote.app`).
- **Exclude Debug Builds**: Debug builds must not be built by this pipeline.
- **Publish Artifacts**: Upload the compiled APKs to GitHub Actions artifacts with descriptive, user-friendly names containing the variant, branch/ref, and commit SHA.
- **PR Comment Trigger**: Support triggering the build directly from a PR comment (e.g. `/build-android stage` or `/build-android prod`), which will automatically trigger the build pipeline for that PR's branch.
- **Interactive Checkbox Trigger**: Support triggering the build by checking a checkbox in the bot's durable status comment. The bot must reset the checkbox to unselected immediately after triggering.

## User Stories & Use Cases
1. **Manual Build via Actions Tab**:
   - As a developer, I want to go to the "Actions" tab, select "Android Build Pipeline", choose the target branch, specify the build variant ("stage" or "prod"), and run the build. When it completes, I want to download the compiled APK from the run summary.
2. **Comment Trigger via Pull Request**:
   - As a developer/reviewer, I want to comment `/build-android stage` on an open PR. The bot should react to my comment, start the build on the PR's branch, and post a comment with a link to the running workflow. When it finishes, I want to download the APK.
3. **Interactive Control Panel in PR**:
   - As a developer/reviewer, I want to open a PR, see a status comment from the bot containing "Android Build Panel", and click a checkbox (e.g. `[ ] 🚀 Build Stage Release APK`). The bot should automatically reset the checkbox, react to the action, and trigger the build.

## Success Criteria
- Successful build of both `stageRelease` and `prodRelease` APKs.
- Clear separation of stage and prod inputs (the pipeline builds only the selected variant).
- Artifacts are published with filenames like `everfreenote-stage-release-<commit-sha>.apk`.
- Build does not fail due to Windows-specific path overrides (e.g. `org.gradle.java.home` in `gradle.properties`).
- PR comments with invalid commands or unauthorized users do not trigger builds.
- Toggling checkboxes on the bot comment triggers the build and resets the checkboxes.

## Constraints & Assumptions
- The mobile package (`ui/mobile`) has a Next.js web bundle dependency. Thus, the Next.js web application must be built and bundled (`npm run prepare:webview-bundle`) before Gradle runs.
- GitHub Actions runners run on Ubuntu (`ubuntu-latest`).
- Standard signing configurations for release builds can use the debug keystore for testing purposes (as configured in `app/build.gradle`), but the workflow must support signing configuration parameters if needed in the future.
- The `issue_comment` trigger runs in the context of the default branch (`main` or `develop`). It must fetch the PR head branch and trigger the build on that branch.

## Questions & Open Items
- Do we need to sign the production release with a production keystore in this phase?
  - *Decision*: Since no production keystore is specified yet in `app/build.gradle` (it currently defaults to debug keystore for release builds), we will use the existing configuration. We should ensure the pipeline supports adding keystore secrets in the future.
