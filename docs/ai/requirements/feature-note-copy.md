---
phase: requirements
title: Requirements & Problem Understanding - Note Copy Button
description: Shared-core copy action that puts note body on the clipboard with rich/plain representations, high-fidelity self round-trip, and a reliable native path on mobile.
---

# Requirements & Problem Understanding

## Problem Statement
**What problem are we solving?**

- The copy button already exists in the UI on both web and mobile, but it has **no working functionality** — previous implementations were removed because they did not work (especially on mobile).
- Users cannot reliably copy a note's content to reuse it: pasting back into our own editor loses formatting, and pasting into other apps (Telegram, Facebook, Gmail, etc.) is inconsistent.
- **Mobile is the historical pain point.** The mobile editor is the same web TipTap editor loaded inside a `react-native-webview`. Inside the WebView, `navigator.clipboard` is unreliable (requires a secure context + user activation; the local `file://` bundle is not a secure origin; Android WebView frequently blocks it). There is currently no native clipboard dependency, so the WebView has no reliable way to write the system clipboard.
- We are building this **from scratch**. Removed code and removed docs are explicitly out of scope and must not be used as a baseline.

## Goals & Objectives
**What do we want to achieve?**

Primary goals:
- Implement copy functionality for the **entire note body** (no title, no tags), available in **both reading and editing modes**.
  - Reading mode copies the currently displayed (persisted) note body.
  - Editing mode copies the **current draft**, including unsaved changes.
- Extract platform-independent **core logic into `core/`** (a clipboard payload service). Platform layers are thin adapters: web writes the clipboard directly; mobile delegates the write to a native module.
- **Zero-loss self round-trip (fidelity bar = the stored representation):** if the editor can *store* a formatting feature, then copy → paste back into EverFreeNote must restore it with **zero loss**. The editor-self-copy sanitization profile must be a **superset** of everything the editor stores (audit it against the full TipTap extension set; fix anything currently stripped). Covers headings, bullet/ordered lists, task lists/checkboxes, text alignment, color, background/highlight, font family, font size, links, images, bold/italic/underline/strikethrough.
- **Best-effort cross-app paste:** content copied from EverFreeNote pastes into Telegram, Facebook, Gmail and other apps with the maximum format preservation those apps support.
- A robust mobile path that does not depend on `navigator.clipboard` inside the WebView.
- **One clipboard contract for all copy entry points.** The Copy button (whole body) and the web in-editor native `Ctrl+C` (current selection) produce the **same clipboard contract**: dual `text/html` + `text/plain` with the EverFreeNote self-copy marker, so a copied selection also round-trips losslessly.

Secondary goals:
- Consistent success/error feedback on both platforms.
- Reuse the existing TipTap/ProseMirror editor and the existing mobile postMessage bridge rather than introducing new transport mechanisms.

Non-goals (explicitly out of scope):
- Copying the note **title or tags**.
- A **partial-selection Copy *button*** — the button always copies the whole note body. (Native web `Ctrl+C` still copies the selection; it is in scope only as a consumer of the shared clipboard contract, not as a separate button.)
- Pixel-perfect fidelity in every third-party destination app (we follow each target app's capabilities; we do not exceed their limits).
- Changing the note storage format or database schema.
- Reworking the **paste** pipeline (`smartPaste`) as a feature — it is considered working and stays in focus only to the extent that our self-copy HTML must remain compatible with it.
- Copy of images as binary blobs / file attachments to the OS clipboard (images travel as `<img>` references inside HTML only).

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user in **reading mode**, I want a Copy button that copies the whole note body so I can reuse it elsewhere without entering selection mode.
- As a user in **editing mode**, I want Copy to use my current draft (including unsaved edits) so I can duplicate in-progress content without saving first.
- As an EverFreeNote user, I want copied content to **paste back into another EverFreeNote note with the same formatting** so duplication feels native.
- As a user pasting into **Telegram / Facebook / Gmail / a plain text field**, I want to keep as much formatting as that app supports, and at minimum get clean readable plain text.
- As a **web** user, I want to select part of a note and press `Ctrl+C` so the selected fragment pastes back into EverFreeNote losslessly (same clipboard contract as the Copy button).
- As a **mobile** user, I want Copy to actually work — every time — and not silently fail.

Key workflows:
- Web reading-mode copy of a persisted note body → paste into our editor (rich) and into external apps.
- Web editing-mode copy of a dirty draft → paste round-trip.
- Mobile (reading + editing) copy → native system clipboard write → paste round-trip and cross-app.

Edge cases to consider:
- Notes containing task lists/checkboxes, headings, alignment, font family/size, color/highlight, links, images.
- Very large notes (clipboard payload size and the chunked postMessage bridge limit on mobile).
- Empty note body (nothing meaningful to copy).
- Clipboard write rejected by the browser (permissions / capability / non-secure context).
- Browsers that expose `ClipboardItem` but reject `text/html` writes at runtime.
- Offline mobile (local `file://` editor bundle) — must still copy reliably.
- Web `Ctrl+C` on a partial selection spanning multiple block types (e.g. a heading + list items) — must round-trip via the shared contract.

## Success Criteria
**How will we know when we're done?**

- A working Copy button copies the **whole note body only**: on web in **both reading mode** (`NoteView`) **and editing mode** (`NoteEditor`); on mobile in the **single editor screen** header (`app/note/[id].tsx` — mobile has no separate reading mode).
- The clipboard always carries **two representations simultaneously**: `text/html` (rich) and `text/plain` (readable fallback).
- The `text/html` is **standard semantic HTML** (`<b> <i> <u> <s> <h1>–<h3> <ul> <ol> <li> <a> <blockquote>` etc.) — not dependent on internal CSS classes — so external apps can interpret it.
- Pasting copied content **back into the EverFreeNote editor preserves all supported formatting with zero loss** (verified for headings, lists, task lists, alignment, color, highlight, font family/size, links, images) — for both the Copy button (whole body) and a web `Ctrl+C` selection.
- Pasting into Telegram, Facebook, Gmail keeps the maximum formatting those apps support; pasting into a plain-text field yields **clean plain text** (text + line breaks only — **never markdown**: no `- `, `[ ]`, `**`, `(url)` markers; links degrade to their visible text; block boundaries become line breaks).
- **Copy works reliably** on web and Android (first-class, CI-verified) and on iOS (best-effort), both online (remote editor) and offline (local bundle), without relying on `navigator.clipboard` inside the WebView.
- A successful copy shows a brief (~1s) on-button confirmation (icon/state change that auto-reverts) — no toast. On copy failure, the user sees a clear error and the editor/reading view does not crash or lose state.
- Core payload-building logic lives in `core/` and is unit tested; web and mobile share it.

## Constraints & Assumptions
**What limitations do we need to work within?**

Technical constraints:
- **Web**: Async Clipboard API (`navigator.clipboard.write` with `ClipboardItem` for `text/html` + `text/plain`) requires a secure context (HTTPS) and a user gesture. Fallback to `navigator.clipboard.writeText(plain)` when rich write fails.
- **Mobile**: `navigator.clipboard` inside `react-native-webview` is unreliable. Best practice (and our chosen direction): the WebView builds the payload (html + plain) and sends it to React Native over the **existing postMessage bridge (with chunking for large notes)**; React Native writes to the system clipboard **natively**.
  - Requires adding the **`expo-clipboard`** dependency (currently not installed). Use `Clipboard.setStringAsync(html, { inputFormat: StringFormat.HTML })` for the rich representation plus a plain-text fallback; supported on iOS and Android.
  - The native copy is triggered by a native RN button, so user-activation / secure-context limitations of the WebView are avoided.
- **HTML should be generated from the editor model** (TipTap/ProseMirror serialize-for-clipboard), not by scraping the rendered DOM, to produce clean predictable output.
- **Self round-trip** relies on an **invisible marker** identifying EverFreeNote-origin clipboard HTML; our own paste pipeline detects the marker and restores full fidelity, while external apps ignore it.

Business/product constraints:
- The Copy **button** targets the **note body only** (decision confirmed); title/tags are out of scope. A partial-selection *button* is out of scope, but web native `Ctrl+C` selection copy is in scope as a consumer of the shared clipboard contract.
- We **do not reinvent the wheel**: we follow established clipboard practices and accept the formatting limitations of destination apps.

Assumptions:
- The existing paste pipeline (`smartPaste`) works and will accept our self-copy HTML; "same format" means fidelity for EverFreeNote-supported formatting, not byte-identical clipboard serialization.
- The existing mobile postMessage bridge (with chunked text) is the transport for moving the payload from WebView to native.
- Prior removed implementation and its docs are not a baseline; a memory note from the old attempt that suggested producing the clipboard content inside the WebView is intentionally superseded by the native-write approach (the in-WebView write is the likely cause of the historical mobile failures).

## Resolved Decisions
**Confirmed during requirements clarification:**

- **Self round-trip allowlist = full parity with the editor.** All editor nodes/marks must survive: paragraph, headings H1–H6, bullet/ordered lists + list items, task lists + task items (with checkbox state), blockquote, code block, horizontal rule, hard break, images (inline, base64 allowed); marks bold, italic, underline, strike, code, highlight (background color, multicolor), text color, font family, font size, links (href), superscript, subscript. (Derived from `ui/web/components/editorExtensions.ts`.)
- **No separate copy size limit.** Rely on the existing chunked postMessage bridge (`core/utils/editorWebViewBridge.ts`: up to ~10,000 chunks × 30,000 chars). Real notes always fit; no extra truncation/warning logic for this feature.
- **Empty note body → disable the Copy button.** No false success, no empty clipboard write.
- **text/plain = clean text, never markdown.** Text and line breaks only; no list/checkbox/link/emphasis markers.
- **Platform scope:** web + Android are **first-class and CI-verified** (mobile e2e via Maestro). iOS is **best-effort**: same shared code, manual/local verification, no CI gate.
- **Copy success feedback = brief (~1s) on-button confirmation** (icon/state change that auto-reverts), not a toast. Error feedback still uses the existing per-platform notification (web sonner `toast.error`, mobile `react-native-toast-message`/`SnackbarToast`).
- **Shared clipboard contract** applies to both the Copy button (whole body) and web native `Ctrl+C` (selection): dual `text/html` + `text/plain` with the EverFreeNote self-copy marker.

## Questions & Open Items
**What do we still need to clarify (design/verification phase):**

- **Verification (not a product decision):** confirm `expo-clipboard` HTML `inputFormat` behavior on the minimum supported iOS/Android versions, and the plain-text fallback path when the OS does not honor HTML on the clipboard.
- Confirm exact wording/localization of the **error** notification (success is the on-button confirmation, not text) is acceptable as-is (currently English, matching existing app strings).
