import type { CapacitorConfig } from '@capacitor/cli'

import { SHELL_VARIANTS, resolveVariant, schemeFor } from './variants'

const variant = resolveVariant(process.env.APP_VARIANT)
const { appId, appName } = SHELL_VARIANTS[variant]
const scheme = schemeFor(variant)

/**
 * Capacitor shell around the Next.js static export produced by the repo root build.
 *
 * androidScheme 'https' keeps the WebView origin at https://localhost, which the web
 * app needs for secure-context APIs it already relies on: crypto.subtle for Supabase
 * PKCE, and IndexedDB persistence in ui/web/adapters/offlineStorage.ts.
 */
/**
 * The dev variant is served over http://localhost rather than https://localhost.
 *
 * A local Supabase speaks plain http, which Android blocks outright on targetSdk 36 and
 * which an https page could not fetch anyway. http://localhost is still a secure
 * context, so crypto.subtle and IndexedDB behave exactly as in production — and an http
 * page can still reach a remote https backend, so this one mode covers both. Verified
 * on device: local backend 200, remote 401 (reached), crypto.subtle available.
 *
 * Tied to the dev variant alone, so stage and prod cannot acquire it by accident.
 */
const devHttpScheme = variant === 'dev'

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'www',
  server: {
    androidScheme: devHttpScheme ? 'http' : 'https',
    ...(devHttpScheme ? { cleartext: true } : {}),
  },
  android: {
    allowMixedContent: false,
  },
}

// Surfaced so scripts/add-android.js can wire the custom scheme into the manifest.
export const oauthScheme = scheme

export default config
