import { Capacitor } from '@capacitor/core'

import { oauthRedirectUri, resolveVariant, schemeFor } from '@ui/shell/variants'

/**
 * True when the web bundle is running inside the Android shell rather than a browser.
 * Everything under runtime/ is a no-op on the web; guard native work with this.
 */
export function isNativeShell(): boolean {
  return Capacitor.isNativePlatform()
}

/**
 * Which shell variant this bundle was built for. Baked in at build time by
 * scripts/build-web.js so the runtime can derive the matching OAuth scheme.
 */
export function shellVariant() {
  return resolveVariant(process.env.NEXT_PUBLIC_APP_VARIANT)
}

/** `everfreenote-shell-stage://auth/callback` and friends. */
export function shellOAuthRedirectUri(): string {
  return oauthRedirectUri(shellVariant())
}

export function shellScheme(): string {
  return schemeFor(shellVariant())
}
