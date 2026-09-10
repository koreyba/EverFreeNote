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
const config: CapacitorConfig = {
  appId,
  appName,
  webDir: 'www',
  server: {
    androidScheme: 'https',
  },
  android: {
    allowMixedContent: false,
  },
}

// Surfaced so scripts/add-android.js can wire the custom scheme into the manifest.
export const oauthScheme = scheme

export default config
