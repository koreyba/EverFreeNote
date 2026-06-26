# Mobile E2E with Maestro

This is a deliberately small Maestro setup for the mobile app.

## Structure

- `flows/`
  - end-user flows that we actually run in CI or locally
- `flows/helpers/`
  - reusable building blocks shared across flows

## First scenario

`note-copy-smoke.yaml` verifies the mobile clipboard copy transport in isolation:

1. Open a dedicated dev harness screen inside the app.
2. Trigger the same mobile clipboard writer used by the note screen.
3. Read both `text/html` and `text/plain` back from the native clipboard.
4. Assert that headings survive in both formats.

This first test intentionally avoids note creation, sync, and editor input complexity so we can
get a stable signal on the clipboard layer before expanding into full note-editing flows.

## Local Run

Prerequisites:

- Maestro CLI installed and available on `PATH`
- Android emulator or device connected
- Dev build of the mobile app installed

Run:

```powershell
./scripts/maestro/run-copy-smoke.ps1
```

Override defaults when needed:

```powershell
./scripts/maestro/run-copy-smoke.ps1 -AppId "com.everfreenote.app.stage" -DeepLinkUrl "everfreenote-stage://dev/maestro/clipboard"
```

## CI Run

The flow also runs on GitHub Actions via
[`.github/workflows/mobile-e2e.yml`](../.github/workflows/mobile-e2e.yml) on pull
requests that touch `ui/mobile/**` or `.maestro/**` (and on `main`). The workflow:

1. Builds a self-contained `devRelease` APK with gradle (`assembleDevRelease`,
   `x86_64` only). `devRelease` embeds the JS bundle, so the app runs without a
   Metro dev server. No Next.js / WebView-editor build is needed because the
   clipboard harness never opens the editor.
2. Boots an Android emulator (API 34, hardware-accelerated via KVM).
3. Installs the APK and runs this flow with Maestro.

Notes:

- **Android only.** iOS e2e needs macOS runners and stays a local-only workflow.
- Supabase config is baked at build time with placeholder values (the app boots
  but makes no network calls). Override with the `EXPO_PUBLIC_SUPABASE_URL`
  repo Variable and `EXPO_PUBLIC_SUPABASE_ANON_KEY` Secret if a real backend is
  ever needed.
