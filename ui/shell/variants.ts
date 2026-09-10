/**
 * Android shell variants.
 *
 * Mirrors the dev/stage/prod split that ui/mobile/app.config.ts already uses, so the
 * two Android apps can be installed side by side while the shell is proven out.
 *
 * The ids are deliberately distinct from ui/mobile's (`com.everfreenote.app*`). When
 * the shell replaces the React Native app, rename them to those ids so existing
 * installs upgrade in place rather than appearing as a second app.
 */
export type AppVariant = 'dev' | 'stage' | 'prod'

export type ShellVariant = {
  appName: string
  appId: string
  /** Custom URL scheme used for OAuth callbacks; must match Supabase Auth redirect URLs. */
  scheme: string
}

/**
 * The schemes intentionally match ui/mobile's, because those redirect URLs are already
 * registered in Supabase Auth — reusing them means the shell can authenticate without
 * any dashboard change, and it is where this ends up anyway once the shell replaces
 * the React Native app.
 *
 * The cost while both apps exist: Android shows an app chooser on the OAuth callback
 * if both are installed. Uninstall the ui/mobile build of the same variant, or set
 * NEXT_PUBLIC_SHELL_SCHEME / SHELL_SCHEME to a dedicated scheme and register it in
 * Supabase Auth -> URL Configuration.
 */
export const SHELL_VARIANTS: Record<AppVariant, ShellVariant> = {
  dev: {
    appName: 'EverFreeNote Shell Dev',
    appId: 'com.everfreenote.shell.dev',
    scheme: 'everfreenote-dev',
  },
  stage: {
    appName: 'EverFreeNote Shell Stage',
    appId: 'com.everfreenote.shell.stage',
    scheme: 'everfreenote-stage',
  },
  prod: {
    appName: 'EverFreeNote Shell',
    appId: 'com.everfreenote.shell',
    scheme: 'everfreenote',
  },
}

/** Env override, so a dedicated scheme can be used once it is registered in Supabase. */
function schemeOverride(): string | undefined {
  const raw = process.env.NEXT_PUBLIC_SHELL_SCHEME ?? process.env.SHELL_SCHEME
  const trimmed = raw?.trim()
  return trimmed && trimmed.length > 0 ? trimmed : undefined
}

export function schemeFor(variant: AppVariant): string {
  return schemeOverride() ?? SHELL_VARIANTS[variant].scheme
}

export function resolveVariant(value: string | undefined): AppVariant {
  if (value === 'dev' || value === 'stage' || value === 'prod') return value
  return 'dev'
}

/** The OAuth callback the shell registers with Android and hands to Supabase. */
export function oauthRedirectUri(variant: AppVariant): string {
  return `${schemeFor(variant)}://auth/callback`
}
