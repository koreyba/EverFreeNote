---
phase: design
title: System Design & Architecture - Note Copy Button
description: Shared-core copy action producing dual text/html + text/plain clipboard payloads, zero-loss self round-trip via an EverFreeNote marker, and a native write path on mobile.
---

# System Design & Architecture

Requirements: `docs/ai/requirements/feature-note-copy.md`.

## Architecture Overview
**What is the high-level system structure?**

The copy feature is split into a platform-independent **core payload builder** (runs where a DOM exists: web page and the mobile editor WebView) and thin **platform write adapters**. Web writes the clipboard directly via the async Clipboard API. Mobile builds the payload **inside the WebView** and ships the finished `{ html, text }` over the existing chunked postMessage bridge to React Native, which performs the **native** clipboard write (`expo-clipboard`). React Native never runs the DOM-dependent core.

```mermaid
flowchart TD
  subgraph Web[Web · browser DOM]
    WBtn["Copy button (NoteView / NoteEditor)"] --> WBuild["NoteClipboardService.buildPayload(bodyHtml)"]
    WCtrlC["Native Ctrl+C (selection)"] --> WSer["ProseMirror copy hook → selection HTML"]
    WSer --> WWrap["wrap with self-copy marker + plain text"]
    WBuild --> WWrite["navigator.clipboard.write(ClipboardItem html+plain)"]
    WWrap --> WWrite
    WWrite -->|reject| WFallback["clipboard.writeText(plain)"]
  end

  subgraph Mobile[Mobile]
    MBtn["Native Copy button (header)"] --> MReq["post REQUEST_COPY_PAYLOAD"]
    MReq --> WV
    subgraph WV[Editor WebView · DOM]
      WVBuild["NoteClipboardService.buildPayload(whole body)"]
    end
    WV -->|COPY_PAYLOAD {html,text} chunked| RN["React Native handler"]
    RN --> Native["expo-clipboard.setStringAsync(html, HTML) + plain fallback"]
    Native --> MFeedback["brief ~1s on-button confirmation"]
  end

  WWrite --> CB[(System Clipboard\ntext/html + text/plain)]
  Native --> CB
  CB --> Paste["Paste target"]
  Paste --> Self["EverFreeNote editor → smartPaste detects marker → zero-loss restore"]
  Paste --> Ext["Telegram / Facebook / Gmail → best-effort by their HTML support"]
  Paste --> Plain["Plain field → clean text (no markdown)"]
```

Key components and responsibilities:
- **`NoteClipboardService` (core, new):** turn body/selection HTML into `{ html, text }` — wrap rich HTML in the EverFreeNote self-copy marker; produce clean plain text (no markdown).
- **`NoteCopyService` (core, exists):** already detects/unwraps the self-copy marker on paste; reused unchanged on the paste side.
- **Web write adapter (`ui/web`):** `ClipboardItem` write + `writeText` fallback; wired to the existing Copy buttons and to a ProseMirror copy hook for `Ctrl+C`.
- **Mobile:** native Copy button + WebView `REQUEST_COPY_PAYLOAD`/`COPY_PAYLOAD` bridge messages + `expo-clipboard` native write.
- **`SanitizationService` / `smartPaste` (core, exists):** the self-copy sanitize path must be audited to a **superset** of stored formatting (see Design Decisions).

Technology stack: TipTap/ProseMirror (editor model + clipboard serialization), async Clipboard API (`ClipboardItem`), `expo-clipboard` (native RN write), existing `editorWebViewBridge` chunked transport.

## Data Models
**What data do we need to manage?**

Clipboard payload (new core type):

```ts
type NoteClipboardPayload = {
  html: string // self-copy-marked rich HTML: <div data-everfreenote-copy="note-body">…</div>
  text: string // clean plain text, line breaks only, never markdown
}
```

- Self-copy marker: existing `data-everfreenote-copy="note-body"` (constants in `core/services/noteCopy.ts`).
- No persistence, no schema change. Data flows: editor model → HTML → payload → OS clipboard → (paste) smartPaste → editor model.

## API Design
**How do components communicate?**

Core (new):
- `NoteClipboardService.buildPayload(bodyHtml: string): NoteClipboardPayload`
- `NoteClipboardService.htmlToPlainText(html: string): string` (clean text; blocks → newlines; no markers)

Web adapter (new):
- `copyNotePayloadToClipboard(payload): Promise<void>` — `ClipboardItem` write, fallback `writeText(payload.text)`, throws on total failure.
- ProseMirror copy hook (editor prop) applying the same contract to the current selection.

Mobile bridge (new messages, extend `EditorWebView` ↔ WebView):
- RN → WebView: `REQUEST_COPY_PAYLOAD`
- WebView → RN: `COPY_PAYLOAD` with `{ html, text }` (uses existing chunked send/consume).
- RN handler writes via `expo-clipboard.setStringAsync(html, { inputFormat: StringFormat.HTML })`, plus plain-text fallback path.

No auth/network involved.

## Component Breakdown
**What are the major building blocks?**

- **Web:** `NoteView.tsx` / `NoteEditor.tsx` Copy buttons → adapter; editor `editorProps` copy hook in `RichTextEditor`/`RichTextEditorWebView`; brief on-button confirmation state.
- **Mobile:** new native Copy button in the `app/note/[id].tsx` header (alongside delete/more); WebView payload producer; RN native write + button confirmation. (Mobile is a single editor screen — no separate reading mode.)
- **Core:** `NoteClipboardService` (build), `NoteCopyService` (detect/unwrap, exists), `SanitizationService`/`smartPaste` self-copy superset fixes.

## Design Decisions
**Why did we choose this approach?**

1. **Native clipboard write on mobile, not `navigator.clipboard` in the WebView.** The WebView only builds the payload; RN writes via `expo-clipboard`. Avoids the secure-context/user-activation failures that broke prior mobile copy.
2. **Build the payload inside the WebView (not in RN).** Plain-text generation and sanitization are DOM-dependent (DOMPurify/DOMParser); RN has no DOM. The WebView has one, so the whole payload is produced there and RN stays a dumb writer.
3. **Standard semantic HTML + invisible self-copy marker.** External apps read standard HTML; our paste pipeline reads the marker for zero-loss restore.
4. **One clipboard contract for button + Ctrl+C.** A ProseMirror copy hook reuses `NoteClipboardService` so a selection round-trips identically to a whole-body copy.
5. **Sanitizer/paste superset audit (required for zero-loss).** Current gaps found that must be fixed on the self-copy path:
   - `editor-self-copy` allowed tags are missing **`sup` / `sub`** (Superscript/Subscript are stored by the editor but stripped on paste).
   - `smartPaste` `filterUnsafeUrls` allows only `http/https` images, stripping **`data:` (base64) images** — must be permitted on the self-copy path.
   - Confirm the self-copy style allowlist covers `color`, `background-color`, `font-family`, `font-size`, `text-align` (present today in `SELF_COPY_STYLE_ALLOWLIST` — keep in sync with the editor).
   - Net rule: the self-copy sanitize+paste path must be a **superset** of everything `editor.getHTML()` emits.

Alternatives considered: scraping rendered DOM (rejected — noisy, theme-coupled HTML); `@react-native-clipboard/clipboard` (acceptable, but `expo-clipboard` matches the Expo setup and supports HTML `inputFormat`).

## Non-Functional Requirements
**How should the system perform?**

- **Reliability:** web + Android first-class (CI via Maestro); iOS best-effort. Copy must work online and offline (local `file://` bundle) on mobile.
- **Large notes:** rely on the existing chunked bridge (~10k × 30k chars); no extra size limit.
- **Security:** generated HTML stays sanitized; the self-copy superset must not weaken the **default** external-paste profile (looser rules apply only when the EverFreeNote marker is present).
- **UX:** empty body → Copy disabled; success → brief (~1s) on-button confirmation (no toast); failure → existing per-platform error notification, no crash/state loss.
- **Verification (open):** `expo-clipboard` HTML `inputFormat` behavior + plain fallback on min iOS/Android versions.
