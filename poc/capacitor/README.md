# Capacitor shell POC

Throwaway proof of concept: run the **existing, unmodified** Next.js static export as
an Android app, to decide whether the separate React Native UI in `ui/mobile` can be
retired. Measurements and conclusions live in
[`docs/ai/analysis/capacitor-shell-poc.md`](../../docs/ai/analysis/capacitor-shell-poc.md).

Nothing here is production code. `android/` and `www/` are generated and gitignored;
`npx cap add android` recreates the native project from `capacitor.config.ts`.

## Setup

Requires JDK 21 (Capacitor 8 rejects 17) and the Android SDK command line tools —
Android Studio is not needed.

```bash
export JAVA_HOME=/opt/homebrew/opt/openjdk@21
export ANDROID_HOME=/opt/homebrew/share/android-commandlinetools
npm install
npx cap add android            # first time only
echo "sdk.dir=$ANDROID_HOME" > android/local.properties
```

## Build

```bash
node scripts/build-web.js      # npm run build at the repo root, then stage out/ -> www/
npx cap sync android
cd android && ./gradlew assembleDebug
```

Release builds are signed with a throwaway keystore so startup can be measured without
`debuggable=true` skewing it. Point `POC_KEYSTORE` at a generated keystore:

```bash
keytool -genkeypair -keystore /tmp/poc.keystore -alias poc -keyalg RSA -keysize 2048 \
  -validity 365 -storepass pocpoc -keypass pocpoc -dname "CN=POC, O=POC, C=NA"
POC_KEYSTORE=/tmp/poc.keystore ./gradlew assembleRelease
```

Supabase credentials are optional — `build-web.js` injects placeholders when
`NEXT_PUBLIC_SUPABASE_URL` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unset, which is enough
for the perf harness. Set them for a build you intend to sign into.

## Measuring

`scripts/make-harness-www.js` makes the shell boot straight into `/perf-harness/`
(the route lives in the main app at `app/perf-harness/`, gated behind
`NEXT_PUBLIC_ENABLE_PERF_HARNESS`). Then:

```bash
./scripts/measure.sh <apk> "<label>" 5     # cold start, in-page timings, scroll jank
PERF_NOTES=5000 node scripts/make-harness-www.js   # change the synthetic list size
```

`measure.sh` targets whatever `adb` is connected — emulator or a physical phone.
In-page metrics are read from `window.__perf` over the DevTools protocol
(`scripts/cdp.js`), because Capacitor 8 release builds do not forward console output
to logcat.

## Cleanup

Delete `poc/` and the `app/perf-harness/` route, and drop `"poc"` from the `exclude`
list in the root `tsconfig.json`.
