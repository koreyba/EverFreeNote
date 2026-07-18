---
phase: implementation
title: Android Build Pipeline Implementation Guide
description: Technical implementation details, directory structures, and script commands used in the Android build pipelines.
---

# Android Build Pipeline Implementation Guide

## Development Setup

### Prerequisites
- GitHub Actions runner: `ubuntu-latest`
- Node.js: `24`
- Java Development Kit (JDK): `17`
- Android SDK: Preinstalled on `ubuntu-latest`.

## Code Structure

- `.github/workflows/android-build.yml` - Manual Android build workflow.
- `.github/workflows/pr-build-trigger.yml` - PR comment listener and dispatcher.
- `scripts/render-pr-status-comment.js` - Modifies status comment to append the interactive build trigger panel.

## Implementation Notes

### Interactive Checkbox Panel rendering
In `scripts/render-pr-status-comment.js`, inside the `renderComment` function, we append:
```javascript
  lines.push(
    "",
    "### 🤖 Android Build Panel",
    "Check a box below to trigger a release build:",
    "- [ ] 🚀 Build Stage Release APK",
    "- [ ] 🚀 Build Prod Release APK"
  );
```

### Parsing Toggled Checkboxes & Commands
In `pr-build-trigger.yml`, we determine the target environment by scanning the event comment body:
```bash
COMMENT_BODY="${{ github.event.comment.body }}"

if [[ "$COMMENT_BODY" == *"- [x] 🚀 Build Stage Release APK"* || "$COMMENT_BODY" == *"/build-android stage"* ]]; then
  ENV="stage"
elif [[ "$COMMENT_BODY" == *"- [x] 🚀 Build Prod Release APK"* || "$COMMENT_BODY" == *"/build-android prod"* ]]; then
  ENV="prod"
fi
```

### Resetting Checkboxes via GitHub API
If triggered via a checkbox click (which fires `edited`), the workflow immediately PATCHes the comment to reset all checkboxes to unchecked state. This allows clicking the checkbox again in the future:
```bash
if [ "${{ github.event.action }}" = "edited" ]; then
  BODY="${{ github.event.comment.body }}"
  NEW_BODY=$(echo "$BODY" | sed 's/- \[x\] 🚀 Build Stage Release APK/- \[ \] 🚀 Build Stage Release APK/g' | sed 's/- \[x\] 🚀 Build Prod Release APK/- \[ \] 🚀 Build Prod Release APK/g')
  gh api -X PATCH repos/${{ github.repository }}/issues/comments/${{ github.event.comment.id }} -f body="$NEW_BODY"
fi
```

### Verifying Collaborator Permissions
We verify the permission of the executor of the action (`github.event.sender.login` instead of `github.event.comment.user.login` because the comment author for the status comment is the bot, but the person who checked the checkbox is the sender):
```bash
USER_LOGIN="${{ github.event.sender.login }}"
PERMISSION=$(gh api repos/${{ github.repository }}/collaborators/${USER_LOGIN}/permission --jq .permission)
```
