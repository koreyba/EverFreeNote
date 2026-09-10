---
phase: design
title: System Design & Architecture — Capacitor Android shell
description: Running the existing web build as an Android app, as a candidate replacement for the React Native UI
---

# System Design & Architecture: Capacitor Android Shell

## Context

EverFreeNote maintains two UIs over one core: `ui/web` (~23k lines) and `ui/mobile`
(~15.5k lines of React Native), against a shared `core` of ~7.9k. Every user-facing
feature is therefore built twice — `docs/ai/design/` contains `feature-mobile-tags`,
`feature-mobile-bulk-edit`, `feature-mobile-note-deletion`, `feature-mobile-settings-menu`
and more, each a second implementation of something the web already has.

The React Native app already renders the hardest part — the Tiptap editor — inside a
WebView loading the web build (`feature-offline-webview-bundle`). What the native layer
still owns is lists, search, settings and auth: the screens where nativeness buys least.

`docs/ai/analysis/capacitor-shell-poc.md` measured whether the web build could simply
*be* the Android app. It can: scroll jank of 1.2–4.1% that does not degrade from 1000 to
5000 notes, a 6.3 MB APK, and an interactive list in well under a second.

## Decision

Add `ui/shell`: a Capacitor 8 shell whose web root is the unmodified root static export.
Keep `ui/mobile` untouched until the shell demonstrates parity in real use.

```mermaid
graph TB
    subgraph "shared"
        Core[core/<br/>services, types, adapters contracts]
    end

    subgraph "web bundle — one build, two destinations"
        Web[ui/web + app/<br/>Next.js output: 'export']
        Runtime[ui/shell/runtime/<br/>native integration]
        Core --> Web
        Runtime -.mounted by app/layout.tsx.-> Web
    end

    Web -->|npm run build| Out[out/]
    Out -->|browser| Site[Cloudflare Pages]
    Out -->|scripts/build-web.js| WWW[ui/shell/www]
    WWW -->|cap sync| APK[Android APK]

    subgraph "still separate"
        Mobile[ui/mobile<br/>React Native]
        Core --> Mobile
    end
```

## Key design points

### The shell ships the same bundle as the website

`scripts/build-web.js` runs the repo-root `npm run build` and stages `out/` into `www/`.
There is no shell-specific web build and no second bundler configuration. The variant
(`APP_VARIANT`) is passed through as `NEXT_PUBLIC_APP_VARIANT` so the runtime can derive
its own OAuth scheme.

`androidScheme: 'https'` keeps the WebView origin at `https://localhost`, which the web
app needs for secure-context APIs it already depends on: `crypto.subtle` for Supabase
PKCE, and IndexedDB persistence in `ui/web/adapters/offlineStorage.ts`.

### Native integration lives in the web bundle, behind a runtime guard

`ui/shell/runtime/` is TypeScript compiled into the web bundle, not into the native
project. `NativeShellProvider` is mounted unconditionally in `app/layout.tsx` and
returns early in a browser, so the website is unaffected. The native OAuth adapter is
loaded with a dynamic import, so `@capacitor/browser` only lands in the chunk that needs it.

### OAuth goes out through a Custom Tab and comes back through a custom scheme

```mermaid
sequenceDiagram
    participant U as User
    participant W as WebView (https://localhost)
    participant T as Custom Tab
    participant S as Supabase
    participant A as Android

    U->>W: Continue with Google
    W->>S: signInWithOAuth(skipBrowserRedirect)
    S-->>W: provider URL (PKCE verifier stored in WebView)
    W->>T: Browser.open(url)
    T->>S: Google consent, then callback
    S-->>A: everfreenote-<variant>://auth/callback?code=…
    A->>W: appUrlOpen event
    W->>S: exchangeCodeForSession(code)
    S-->>W: session
```

Two properties matter. The flow must leave the WebView — Google rejects OAuth in
embedded WebViews with `disallowed_useragent`. And the exchange must happen back in the
WebView, because that is where Supabase stored the PKCE verifier.

`skipBrowserRedirect: true` is what makes both platforms go through the same adapter:
Supabase hands back a URL instead of navigating, and `resolveOAuthAdapter()` decides
whether that URL is opened by navigating the page or by a Custom Tab. This finally uses
the `webOAuthAdapter` that already existed in the codebase but was never called.

### Variants reuse ui/mobile's schemes

`everfreenote-dev` / `everfreenote-stage` / `everfreenote` are already registered in
Supabase Auth, so the shell authenticates with no dashboard change — and these are the
schemes it would inherit anyway once it replaces the React Native app. App ids stay
distinct (`com.everfreenote.shell*`) so both apps can be installed together.

Trade-off: with both installed, Android shows an app chooser on the callback.
`SHELL_SCHEME` / `NEXT_PUBLIC_SHELL_SCHEME` override it for anyone who prefers a
dedicated scheme.

### The native project is generated, not committed

Unlike `ui/mobile/android`, `ui/shell/android` is gitignored. The two modifications a
stock Capacitor project needs — the OAuth intent-filter and the release signing config —
are applied by `scripts/add-android.js`. A reviewed script is easier to audit than a
vendored directory, and CI regenerates it on every run. If native customization grows
beyond what a patch script can express, commit the directory instead.

## Testing

`ui/shell/tests/unit/` runs inside the existing `unit-web` Jest project, since the
runtime executes in the same jsdom environment. Covered: variant and scheme resolution
including the env override, platform detection, the Custom Tab adapter, and every branch
of the callback handler — success, provider error, failed exchange, foreign scheme,
missing code, already-dismissed tab, back-button behaviour and listener cleanup.

`ui/web/tests/unit/adapters/oauth.test.ts` covers platform resolution from the web side.

On-device verification is `scripts/measure.sh` plus a synthetic deep link:

```bash
adb shell am start -a android.intent.action.VIEW \
  -d "everfreenote-stage://auth/callback?code=<code>"
```

which exercises the whole return leg without any credentials.

## What this does not decide

Retiring `ui/mobile`. That needs the shell used in earnest first — editor typing
latency at full scope, offline behaviour over days rather than minutes, keyboard and
safe-area handling across screens, and a Play Store review under the "minimum
functionality" policy.

## Ecosystem note

Ionic has discontinued its commercial products (Appflow, Identity Vault, Auth Connect,
Secure Storage, Portals) while stating that Ionic Framework and Capacitor remain open
source and maintained as part of the OutSystems mobile stack. None of the discontinued
products are used here: auth is Supabase PKCE through the system browser, storage is
IndexedDB, CI is GitHub Actions. The residual risk is that some plugin territory is now
served mainly by a single third-party vendor (Capgo), which matters only if OTA updates
or hardened secure storage are ever needed.
