# Expo Go testing notes (mobile)

This project is commonly tested on a **real phone** using **Expo Go**.

## Note editor content (WebView)
The note body is rendered inside a `WebView` by loading the web route `.../editor-webview` (port `3000`).

If the note body is blank on the phone:
1. Start the web app from the repo root so it is reachable from your phone over LAN:
   ```powershell
   npm run dev:full
   ```
2. Make sure the phone and the dev machine are on the same Wi‑Fi network.
3. Verify the phone can open `http://<DEV_MACHINE_IP>:3000/editor-webview` in a mobile browser.

## Overriding the editor URL
You can override the editor page URL used by the mobile app via:

```env
EXPO_PUBLIC_EDITOR_WEBVIEW_URL=http://<DEV_MACHINE_IP>:3000/editor-webview
```

This is useful when:
- The Expo packager host is not the same as the web server host.
- You are using a different port / remote environment.

## Large notes
Very large note bodies are transferred between the native app and the editor page using chunked `postMessage` messages to avoid platform message-size limits.
