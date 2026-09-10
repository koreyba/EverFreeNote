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

One command builds an installable APK. It runs the web build, regenerates the native
project, syncs and calls Gradle:

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools

npm --prefix ui/shell ci                       # first time only
APP_VARIANT=stage npm --prefix ui/shell run apk:debug
```

It prints the APK path and the `adb install` line to run. Rebuilding after a code
change is the same command — `android/` is a working directory, regenerated as needed.

Supabase credentials are picked up automatically from the repo-root `.env.local`, so a
stage build signs in without extra setup. Set the variables explicitly to override, and
the build warns loudly if it finds neither:

```bash
NEXT_PUBLIC_SUPABASE_URL=… NEXT_PUBLIC_SUPABASE_ANON_KEY=… \
  APP_VARIANT=stage npm --prefix ui/shell run apk:debug
```

Release builds need a keystore; the script refuses to run without one rather than
producing an APK that will not install:

```bash
keytool -genkeypair -keystore /tmp/shell.keystore -alias shell -keyalg RSA -keysize 2048 \
  -validity 365 -storepass shellshell -keypass shellshell -dname "CN=EverFreeNote, O=EverFreeNote, C=NA"
SHELL_KEYSTORE=/tmp/shell.keystore SHELL_KEYSTORE_PASSWORD=shellshell \
  SHELL_KEY_ALIAS=shell SHELL_KEY_PASSWORD=shellshell \
  APP_VARIANT=stage npm --prefix ui/shell run apk
```

CI builds a debug APK on demand through the same script — see
`.github/workflows/shell-build.yml`.

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

## Measuring on a device

```bash
# The harness route is compiled out unless this is set.
export NEXT_PUBLIC_ENABLE_PERF_HARNESS=true
APP_VARIANT=stage npm --prefix ui/shell run build:web
node ui/shell/scripts/make-harness-www.js                   # boot straight into it
PERF_NOTES=5000 node ui/shell/scripts/make-harness-www.js   # or a different list size
cd ui/shell && npx cap sync android && (cd android && ./gradlew assembleDebug)
SHELL_PKG=com.everfreenote.shell.stage ./scripts/measure.sh <apk> "label" 5
```

`measure.sh` reports cold start, in-page timings and scroll jank against whatever `adb`
is connected — emulator or a physical phone. In-page metrics are read from
`window.__perf` over the DevTools protocol, because Capacitor 8 release builds do not
forward console output to logcat. The harness route lives at `app/perf-harness/` and is
gated behind `NEXT_PUBLIC_ENABLE_PERF_HARNESS`, so normal builds ship an empty page.
