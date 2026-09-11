import variantTable from './variants.data'

/**
 * Android shell variants.
 *
 * The table itself lives in variants.data.js, which the build scripts and the Capacitor
 * config also read — see that file for why it is CommonJS. Adding a variant there is
 * enough for them; TypeScript will then point at whatever else needs updating here.
 *
 * Mirrors the dev/stage/prod split ui/mobile/app.config.ts already uses, so the two
 * Android apps can be installed side by side while the shell is proven out. The ids are
 * deliberately distinct from ui/mobile's (`com.everfreenote.app*`); when the shell
 * replaces the React Native app, rename them to those ids so existing installs upgrade
 * in place rather than appearing as a second app.
 *
 * The schemes intentionally match ui/mobile's, because those redirect URLs are already
 * registered in Supabase Auth — reusing them means the shell authenticates without any
 * dashboard change. The cost while both apps exist: Android shows an app chooser on the
 * OAuth callback if both are installed. Uninstall the ui/mobile build of the same
 * variant, or set NEXT_PUBLIC_SHELL_SCHEME / SHELL_SCHEME to a dedicated scheme and
 * register it in Supabase Auth -> URL Configuration.
 */
export type AppVariant = keyof typeof variantTable

export type ShellVariant = {
  appName: string
  appId: string
  /** Custom URL scheme used for OAuth callbacks; must match Supabase Auth redirect URLs. */
  scheme: string
}

export const SHELL_VARIANTS: Record<AppVariant, ShellVariant> = variantTable

/** A trimmed value, or undefined when it is absent or blank — so `??` can do the rest. */
export function nonEmpty(value: string | undefined): string | undefined {
  const trimmed = value?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

/** Env override, so a dedicated scheme can be used once it is registered in Supabase. */
function schemeOverride(): string | undefined {
  return nonEmpty(process.env.NEXT_PUBLIC_SHELL_SCHEME ?? process.env.SHELL_SCHEME)
}

export function schemeFor(variant: AppVariant): string {
  return schemeOverride() ?? SHELL_VARIANTS[variant].scheme
}

/**
 * Where this build's app is deployed on the web.
 *
 * Deliberately not hardcoded: a deployment hostname is configuration, and ui/mobile
 * already takes it from EXPO_PUBLIC_PUBLIC_WEB_ORIGIN rather than from code. The
 * variant-suffixed name wins, so one env file can describe every variant:
 *
 *   NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_DEV / _STAGE / _PROD
 *   NEXT_PUBLIC_PUBLIC_WEB_ORIGIN        (applies to whichever variant is building)
 *
 * Empty when unset. Callers must report that rather than fall back to the shell's own
 * https://localhost origin, which nobody else can reach.
 */
export function publicWebOriginFor(variant: AppVariant): string {
  // Typed as a complete Record, so adding a variant to variants.data.js fails to compile
  // until its variable is added here — which matters because Next.js inlines
  // NEXT_PUBLIC_* only for static property accesses, and a computed key would silently
  // be undefined in the browser bundle while still passing in Jest.
  const perVariant: Record<AppVariant, string | undefined> = {
    dev: process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_DEV,
    stage: process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_STAGE,
    prod: process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN_PROD,
  }

  for (const candidate of [perVariant[variant], process.env.NEXT_PUBLIC_PUBLIC_WEB_ORIGIN]) {
    const trimmed = candidate?.trim()
    if (trimmed) return trimmed
  }

  return ''
}

export function resolveVariant(value: string | undefined): AppVariant {
  return value && value in SHELL_VARIANTS ? (value as AppVariant) : 'dev'
}

/** The OAuth callback the shell registers with Android and hands to Supabase. */
export function oauthRedirectUri(variant: AppVariant): string {
  return `${schemeFor(variant)}://auth/callback`
}
