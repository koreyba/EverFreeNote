# ui/shell — Android shell

Runs the EverFreeNote **web build** as an Android app via Capacitor. There is no
mobile-specific web bundle: `scripts/build-web.js` stages exactly what
`npm run build` produces at the repo root, so the shell and the website ship the
same code.

Design and rationale: [`docs/ai/design/feature-capacitor-android-shell.md`](../../docs/ai/design/feature-capacitor-android-shell.md).
Measurements that motivated it: [`docs/ai/analysis/capacitor-shell-poc.md`](../../docs/ai/analysis/capacitor-shell-poc.md).

This does **not** replace `ui/mobile` yet — both Android apps can be installed side by
side while the shell is proven out.

## Layout

| Path | What it is |
|---|---|
| `variants.ts` | dev/stage/prod app ids and OAuth schemes |
| `capacitor.config.ts` | Capacitor config, variant-aware |
| `runtime/` | TypeScript that ships **inside the web bundle** and talks to the native layer |
| `scripts/` | build, native project generation, on-device measurement |
| `android/`, `www/` | generated, gitignored — recreated by `scripts/add-android.js` |

`android/` is intentionally not committed. Everything the stock Capacitor project needs
on top of the generator — the OAuth intent-filter and the release signing config — is
applied by `scripts/add-android.js`, so the native project is reproducible from a
reviewed script rather than from a large vendored directory.

## Requirements

- JDK **21** (Capacitor 8 rejects 17 with `invalid source release: 21`)
- Android SDK command line tools — Android Studio is not required
- Node 24

## Build

One script per build, mirroring `ui/mobile`'s `android:*` naming. Each runs the web
build, regenerates the native project, syncs and calls Gradle, then prints the APK path
and the `adb install` line:

| Script | What it builds |
|---|---|
| `android:dev` | dev debug — for a local backend, see below |
| `android:stage` | stage debug — for on-device debugging |
| `android:stage:release` | stage release — the candidate you hand to someone |
| `android:prod` | prod debug |
| `android:prod:release` | prod release — what ships |

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools

npm --prefix ui/shell ci          # first time only
npm --prefix ui/shell run android:stage
```

Rebuilding after a code change is the same command — `android/` is a working directory,
regenerated as needed, including when you switch variants.

Supabase credentials come from the repo-root `.env.local`, so a stage build signs in
without extra setup. Prod is the exception: it requires `NEXT_PUBLIC_SUPABASE_URL_PROD`
and `NEXT_PUBLIC_SUPABASE_ANON_KEY_PROD` explicitly, because inheriting the root env
files would ship a prod-branded app talking to stage. Every build prints the project it
resolved — read that line, because the labels cannot be trusted on their own: a local
`ui/mobile/.env` was found with stage and prod pointing at each other's projects (see
the warning in `ui/mobile/.env.example`). Production is `pmlloiywmuglbjkhrggo`, whose
Supabase project is named "EverFreeNote" and whose Site URL is `everfreenote.pages.dev`.

Release builds need a keystore; the script refuses to run without one rather than
producing an APK that cannot be installed:

```bash
keytool -genkeypair -keystore /tmp/shell.keystore -alias shell -keyalg RSA -keysize 2048 \
  -validity 365 -storepass shellshell -keypass shellshell -dname "CN=EverFreeNote, O=EverFreeNote, C=NA"
SHELL_KEYSTORE=/tmp/shell.keystore SHELL_KEYSTORE_PASSWORD=shellshell \
  SHELL_KEY_ALIAS=shell SHELL_KEY_PASSWORD=shellshell \
  npm --prefix ui/shell run android:stage:release
```

CI runs the same scripts — see `.github/workflows/shell-build.yml`, which takes a
variant and a build type. A release build there needs `SHELL_KEYSTORE_BASE64` and its
password secrets.

## Building for one deployment among many

`stage` and `prod` are two Supabase projects. Everything that is not production — every
branch preview included — talks to the stage project, so a build for a branch is a
**stage build**, not a new variant: same database, same OAuth scheme (that scheme is
what Supabase has registered). Only two things differ, and both are env overrides:

```bash
APP_VARIANT=stage \
  SHELL_APP_ID=com.everfreenote.shell.branch.my-feature \
  SHELL_APP_NAME="EFN my-feature" \
  NEXT_PUBLIC_PUBLIC_WEB_ORIGIN=https://my-feature.everfreenote.pages.dev \
  npm --prefix ui/shell run android:stage
```

`SHELL_APP_ID` lets it sit on a device next to the stage build instead of replacing it;
`NEXT_PUBLIC_PUBLIC_WEB_ORIGIN` points its share links at that branch's deployment.

Worth knowing: the APK **embeds** the web build, it does not load the deployment. So a
branch app is built from that branch's code; the branch URL only matters for share
links. And because every such app registers the same `everfreenote-stage://` scheme,
Android asks which app should take the OAuth callback when more than one is installed.

Adding a whole new variant — a fourth Supabase project, say — is a different job: add it
to `variants.data.js`, then follow the type errors in `variants.ts`, add its
`android:<name>` scripts, and register `<scheme>://auth/callback` in that project.

## Web-facing URLs

The WebView origin is `https://localhost`, which is meaningless outside the app, so
anything a recipient will open must use the deployment origin instead. That origin is
configuration, never code — same as `ui/mobile`'s `EXPO_PUBLIC_PUBLIC_WEB_ORIGIN`:

```
NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_DEV / _STAGE / _PROD
NEXT_PUBLIC_PUBLIC_WEB_ORIGIN                      # whichever variant is building
```

`ui/web/adapters/publicWebOrigin.ts` resolves it; the browser keeps using its own
origin. When it is unset the build says so, and sharing reports it rather than handing
out a `https://localhost` link nobody can open.

## Saving files

An `<a download>` click does nothing in an Android WebView — no file, no prompt, no
error. `ui/web/adapters/fileDownload.ts` routes exports through the share sheet in the
shell (`@capacitor/filesystem` + `@capacitor/share`), matching what ui/mobile does.

## OAuth

Sign-in opens in an Android Custom Tab, because Google rejects OAuth inside embedded
WebViews. The provider redirects to the variant's custom scheme, Android routes it back
to the app, and `runtime/NativeShellProvider.tsx` exchanges the code for a session in
the WebView — which is where Supabase stored the PKCE verifier when the flow started.

Each variant's redirect URL must exist in Supabase Auth → URL Configuration:

| Variant | Redirect URL |
|---|---|
| dev | `everfreenote-dev://auth/callback` |
| stage | `everfreenote-stage://auth/callback` |
| prod | `everfreenote://auth/callback` |

These are the same schemes `ui/mobile` uses, so they are already registered — no
dashboard change was needed. The cost while both apps exist: if both are installed,
Android asks which app should handle the callback. Set `SHELL_SCHEME` (build) and
`NEXT_PUBLIC_SHELL_SCHEME` (runtime) to a dedicated scheme to avoid that, and register
it in Supabase first.

## Developing against a local backend

The dev variant is served from `http://localhost` rather than `https://localhost`. A
local Supabase speaks plain http, which Android blocks outright on targetSdk 36 and
which an https page could not fetch anyway. `http://localhost` is still a secure
context, so `crypto.subtle` and IndexedDB behave as they do in production — and an http
page can still reach a remote https backend, so the one mode covers both cases. That is
the whole reason the dev variant exists; point it at a remote project and you have
`android:stage` with a different name.

```bash
npm run db:start                    # local Supabase
npm run db:init-users               # needs NEXT_PUBLIC_ENABLE_TEST_AUTH=true,
                                    # SUPABASE_SERVICE_KEY and TEST_USER_PASSWORD
adb reverse tcp:54321 tcp:54321     # the device reaches the host's Supabase
npm --prefix ui/shell run android:dev
```

Point `NEXT_PUBLIC_SUPABASE_URL` at `http://localhost:54321` for that build. The test
login buttons appear when `NEXT_PUBLIC_ENABLE_TEST_AUTH=true`.

## Measuring on a device

```bash
# The harness route is compiled out unless this is set.
export NEXT_PUBLIC_ENABLE_PERF_HARNESS=true
APP_VARIANT=stage npm --prefix ui/shell run build:web
node ui/shell/scripts/make-harness-www.js                   # boot straight into it
PERF_NOTES=5000 node ui/shell/scripts/make-harness-www.js   # or a different list size
npm --prefix ui/shell run android:stage
SHELL_PKG=com.everfreenote.shell.stage ./scripts/measure.sh <apk> "label" 5
```

`measure.sh` reports cold start, in-page timings and scroll jank against whatever `adb`
is connected — emulator or a physical phone. In-page metrics are read from
`window.__perf` over the DevTools protocol, because Capacitor 8 release builds do not
forward console output to logcat. The harness route lives at `app/perf-harness/` and is
gated behind `NEXT_PUBLIC_ENABLE_PERF_HARNESS`, so normal builds ship an empty page.
