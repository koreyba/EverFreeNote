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
 * Local-backend mode, dev variant only.
 *
 * A local Supabase serves plain http, which Android blocks outright on targetSdk 36 —
 * and an https page could not fetch it anyway. Serving the app from http://localhost
 * solves both: same scheme, and localhost is still a secure context, so crypto.subtle
 * and IndexedDB behave exactly as they do in production.
 *
 * Gated on an explicit variable *and* the dev variant, so a stage or prod build cannot
 * acquire it by accident.
 */
const localBackend = variant === 'dev' && process.env.SHELL_LOCAL_HTTP === 'true'

const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'www',
  server: {
    androidScheme: localBackend ? 'http' : 'https',
    ...(localBackend ? { cleartext: true } : {}),
  },
  android: {
    allowMixedContent: false,
  },
}

// Surfaced so scripts/add-android.js can wire the custom scheme into the manifest.
export const oauthScheme = scheme

export default config
