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
