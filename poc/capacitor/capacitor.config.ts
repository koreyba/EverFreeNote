import type { CapacitorConfig } from '@capacitor/cli'

/**
 * POC shell around the existing Next.js static export (`output: 'export'`).
 *
 * The web bundle is copied into `www/` by `scripts/build-web.js`; nothing here
 * reaches out to the network at boot, so the app starts fully offline.
 *
 * androidScheme 'https' keeps the WebView origin at https://localhost, which is
 * required for secure-context APIs the web app already relies on (crypto.subtle
 * for Supabase PKCE, IndexedDB persistence in ui/web/adapters/offlineStorage.ts).
 */
const config: CapacitorConfig = {
  appId: 'com.everfreenote.poc',
  appName: 'EverFreeNote POC',
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  // POC-only: keep console output and DevTools available in release builds so the
  // harness can be measured on a non-debuggable APK (debuggable=true skews startup).
  loggingBehavior: 'production',
  android: {
    // Keep the POC honest: no cleartext, same posture a release build would need.
    allowMixedContent: false,
    webContentsDebuggingEnabled: true,
  },
}

export default config
