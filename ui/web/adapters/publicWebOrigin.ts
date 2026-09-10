import { isNativeShell, shellPublicWebOrigin } from '@ui/shell/runtime/platform'

/**
 * The origin to put in links other people will open.
 *
 * In a browser that is simply where the app is served from. Inside the Android shell it
 * is not: the WebView origin is https://localhost, which is meaningless to a recipient,
 * so the shell carries its deployment origin as build configuration.
 *
 * Returns an empty string when a shell build has no deployment configured — callers
 * must report that rather than produce a link that cannot be opened.
 */
export function resolvePublicWebOrigin(): string {
  if (isNativeShell()) return shellPublicWebOrigin()
  return globalThis.location?.origin ?? ''
}
