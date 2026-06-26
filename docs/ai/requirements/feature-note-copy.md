---
phase: requirements
title: Requirements & Problem Understanding
description: Clarify the problem space, gather requirements, and define success criteria
---

# Requirements & Problem Understanding

> Feature: **note-copy** — copying a note to the clipboard, the clipboard
> contract it produces, and round-trip fidelity when pasting back into
> EverFreeNote. The inbound transformation of *external* content is owned by the
> separate **smart-paste** feature (see `feature-smart-paste.md`); this feature
> only requires that smart-paste keeps honoring the self-copy marker.

## Problem Statement
**What problem are we solving?**

- When a user copies a note and pastes it back into EverFreeNote (the same note
  or another note in the same notebook), the result must be **identical** —
  every bit of formatting, font, size, and color preserved. The rule is simple:
  **if we already store it, we must be able to paste it back.** Today this is not
  guaranteed, especially on mobile, where rich formatting can be lost.
- When a user copies a note and pastes it into another app (messenger, web HTML
  editor), the result must be sensible: rich where the target understands HTML,
  clean readable plain text where it does not.
- The current mobile implementation leans on an in-memory cache that matches
  copied content by plain text. It is fragile (in-memory only, 2-minute TTL,
  fuzzy text matching), works only same-device/same-session, and masks whether
  the real system clipboard actually round-trips. It feels like the app is
  "always on the fallback path".
- Affected: all users who copy notes — power users moving structured notes
  between EverFreeNote, messengers, and publishing tools especially.

## Goals & Objectives
**What do we want to achieve?**

- **Primary goals**
  - **Round-trip fidelity (zero loss).** Copy a note → paste back into
    EverFreeNote → result is identical. The fidelity bar is the **stored
    representation**: anything the editor can create and store —
    formatting, font family, font size, color, highlight, alignment, headings,
    lists, task lists, links, sub/superscript, code blocks, horizontal rules,
    images — must survive the copy→paste round-trip without loss. If the editor
    stores it, copy must restore it. This is the definition of "copy works 100%".
  - **Plain-text correctness.** Pasting into a plain-text target (Telegram,
    Facebook) yields clean, readable text with no markup artifacts.
  - **Platform parity.** Web and mobile produce the **same** clipboard payload
    via a single shared builder (`NoteCopyService.buildPayload`). Parity is about
    the **contract and fidelity**, not the copy scope or trigger (see below).
- **Secondary goals**
  - Opportunistic rich paste into external HTML editors (WordPress, Google Docs,
    Word) — works when the target accepts `text/html`, but is **not** a hard
    requirement.
  - Cross-context round-trip (e.g. copy on mobile, paste on web) via the real
    system clipboard rather than an app-side cache.
- **Non-goals (explicitly out of scope)**
  - Changing the **smart-paste transformation** logic (markdown/HTML/plain
    detection from external sources). NOTE: removing the mobile native paste
    *transport* fallback (see Constraints) is **in scope**; the smart-paste
    transformation itself is not. We only require smart-paste to keep detecting
    the self-copy marker before generic sanitization.
  - Producing **markdown** on copy. Plain text stays clean text, not markdown,
    because the must-have plain target is messengers.
  - Including the note **title or tags** in the copy. Copy covers the note
    **body** only (see Copy scope).
  - Copying from contexts where the editor is not present (e.g. the notes list).
  - Changing the note storage format.

## User Stories & Use Cases
**How will users interact with the solution?**

- As a user, I want to copy a note and paste it back into EverFreeNote (this note
  or another in my notebook) and see it **exactly** as stored, so I trust copy
  fully.
- As a user, I want to copy a note and paste it into Telegram/Facebook and get
  clean, readable text without `**`, `#`, or HTML noise.
- As a user, I want to copy a note and paste it into a web HTML editor
  (WordPress) and keep headings/lists/formatting when that editor supports it.
- As a user on mobile, I want copy/paste to behave the same as on web.
- As a user, I want a clear, immediate confirmation that the copy happened.
- **Copy scope:** the explicit "Copy note" action copies the **entire note
  body** (the editor HTML). Title and tags are not included. In the web editor,
  an in-editor `Ctrl/Cmd+C` copies the current **selection** (standard editor
  behavior); both triggers produce the same clipboard contract.
- **Feedback:** the copy action gives immediate visual feedback — preferably a
  brief (~1s) animation of the Copy button; a notification/toast is an
  acceptable alternative.
- Edge cases: empty note (copy is a no-op), very large note, copy while the
  editor is still loading, paste of partial selections, paste from an external
  source (handled by smart-paste, must not be broken).

## Success Criteria
**How will we know when we're done?**

- **Acceptance criteria**
  - Copy always writes **two** clipboard flavors: `text/html` (wrapped with the
    `data-everfreenote-copy="note-body"` marker) and `text/plain` (clean text).
  - **Zero-loss self round-trip:** copy → paste back into EverFreeNote preserves
    every formatting feature the editor can store, on **both** web and mobile.
    No supported formatting is dropped.
  - Paste into a plain-text target shows clean text (no markdown/HTML artifacts).
  - Self-copy content is detected by the marker before strict sanitization;
    external content still goes through smart-paste.
  - Empty-note copy is a safe no-op (nothing copied, no error).
  - Copy produces immediate feedback (brief button animation ~1s, or toast).
  - **Security:** copied HTML is sanitized (no scripts/unsafe attributes);
    external paste keeps strict sanitization via smart-paste.
  - Plain-text fallback never throws; if rich is unavailable the user still gets
    correct plain text.
- **Performance**
  - Copy/paste handling stays responsive with no added native round-trips on the
    happy path under Option A. The paste-transform side reuses the smart-paste
    targets (≤200ms for ≤10k chars, ≤500ms for ≤100k chars on reference
    hardware).
- **Measurable outcome / verification**
  - The mobile Maestro clipboard flow asserts both `text/html` and `text/plain`
    survive a copy → read round-trip; an extended flow covers the real editor
    copy → paste round-trip.
  - Instrumentation confirms which clipboard path actually fires on a real
    Android device (see Design — Option A verification).

## Constraints & Assumptions
**What limitations do we need to work within?**

- **The clipboard standard (contract).** Two levels:
  - *Public* (for everyone): always write `text/html` + `text/plain`.
  - *Private* (for us): marker `data-everfreenote-copy="note-body"` embedded
    inside the `text/html`, used to recognize our own content on paste. This is
    the standard professional pattern (Word, Google Docs, Notion, and
    ProseMirror's own `data-pm-slice` all do equivalent things). A `data-*`
    attribute on a wrapper `<div>` is benign for external consumers.
- **Round-trip bar = stored representation.** The self-copy sanitization profile
  (`editor-self-copy`) must be a **superset** of everything the editor can store.
  If it strips a feature the editor produces, that is a defect for this feature
  (see Open Items).
- **No markdown on copy.** `text/plain` is clean text, not markdown. A single
  `text/plain` flavor cannot be both clean (for messengers) and markdown (for
  markdown editors), and a separate `text/markdown` flavor is impossible on
  mobile (`expo-clipboard` exposes only `text/html` + `text/plain`).
- **Platform clipboard limits.** `expo-clipboard` exposes only `text/html` and
  `text/plain`; custom MIME types are not available on mobile. Therefore the
  marker-in-HTML approach is the only mechanism that works uniformly on web and
  mobile.
- **Platform scope.** Web + Android are first-class and CI-verified (Maestro on
  Android). **iOS is best-effort:** the shared editor code applies, but iOS is
  verified manually/locally, not in CI (macOS runners are costly on free GitHub).
- **Large notes.** Copy has no hard size cap but must stay responsive; the paste
  side aligns with the smart-paste 100k-character threshold behavior.
- **Assumption (to be verified):** the Android WebView exposes `text/html` on the
  editor's `handlePaste` event. Copy stays a native write (reliable), so the
  single load-bearing assumption is on the **paste** side (Option A). See Design.

## Questions & Open Items
**What do we still need to clarify?**

- Does the current Android WebView (RN WebView 13.15, Android 14+) expose
  `text/html` on the editor's paste event? **Decision:** copy stays a native
  write; we remove only the read-side crutch (in-memory cache + native
  `CLIPBOARD_PASTE_REQUEST`) and test pure Option A on paste (comment out, do not
  delete yet). If real-device testing shows a gap, we revisit with a robust
  native read (exact token key + persistence), not the in-memory cache.
- **Verify the `editor-self-copy` profile is a superset of stored formatting.**
  Audit it against the full TipTap extension set the editor uses; any feature it
  strips breaks the zero-loss round-trip and must be fixed.
- How much "structure hinting" should `text/plain` keep (bullets `- `,
  checkboxes `- [x]`, `---` for `<hr>`)? Current behavior is light and readable;
  treat as a detail, not a blocker.
- Cross-device round-trip (mobile → web) — confirm it works once the real system
  clipboard path is the only path.
- iOS clipboard parity (WKWebView) — confirm during best-effort manual testing.
