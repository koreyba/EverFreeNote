---
phase: requirements
title: Requirements & Problem Understanding - Editor Spellcheck
description: Define goals, user stories, and requirements for enabling text editor spellcheck
---

# Requirements & Problem Understanding - Editor Spellcheck

## Problem Statement
**What problem are we solving?**
- Users want to verify and correct spelling mistakes as they write notes in the EverFreeNote editor.
- By default, Tiptap/ProseMirror or browser configurations may disable or not enforce spell checking on rich-text content, or users may have different preferences (some prefer it enabled, others find the red underlines distracting).
- Currently, there is no global application setting to toggle spellcheck support in the editor.

## Goals & Objectives
**What do we want to achieve?**
- Enable browser-native spell checking in the rich text editor by default.
- Provide a clear, accessible toggle in the web Settings page under a new "Preferences" tab to let users turn spell checking on or off.
- Persist the user's spellcheck preference in browser `localStorage`.
- Ensure that both the main rich text editor (`RichTextEditor.tsx`) and the mobile-webview editor (`RichTextEditorWebView.tsx`) respect the setting.

## User Stories & Use Cases
**How will users interact with the solution?**
- **As a note author**, I want spell checking enabled by default so that spelling mistakes are highlighted as I type.
- **As a developer/technical writer**, I want to turn off spell checking in Settings because technical terms or code fragments get marked as errors, and the red lines are distracting.
- **As a settings user**, I want to navigate to Settings, go to a "Preferences" tab, toggle "Editor Spellcheck" using a smooth toggle switch, and have the editor immediately reflect my preference when I return to my notes.

## Success Criteria
**How will we know when we're done?**
- Browser-native spell check behaves correctly according to the user's choice: red underlines appear for incorrect spelling when enabled, and disappear completely when disabled.
- The default behavior (with no setting saved) is enabled (`true`).
- The settings page has a new "Preferences" tab containing the "Editor Spellcheck" toggle.
- Toggle state is persisted across page reloads in `localStorage` under `editor_spellcheck_enabled`.
- Both `RichTextEditor.tsx` and `RichTextEditorWebView.tsx` read and apply the setting correctly.

## Constraints & Assumptions
**What limitations do we need to work within?**
- Browser-native spell checking is used. We do not need a custom dictionaries/libraries; we rely on the browser's built-in spellcheck engine (via `spellcheck` HTML attribute).
- Spellcheck must run client-side only.
- The mobile editor WebView should also support the default of `true`, and can use its local storage for preferences if needed.
- No git worktree should be created.
