/**
 * Resolve which Supabase project a shell build should talk to.
 *
 * The repo-root .env / .env.local point at stage, so a prod build that fell back to
 * them would produce a prod-branded app silently talking to stage. Variant-suffixed
 * variables mirror ui/mobile/app.config.ts (EXPO_PUBLIC_SUPABASE_URL_STAGE / _PROD):
 *
 *   dev    NEXT_PUBLIC_SUPABASE_URL
 *   stage  NEXT_PUBLIC_SUPABASE_URL_STAGE, falling back to NEXT_PUBLIC_SUPABASE_URL
 *   prod   NEXT_PUBLIC_SUPABASE_URL_PROD — required, never inherited
 */
const PLACEHOLDER_URL = 'https://placeholder.supabase.co'
const PLACEHOLDER_KEY = 'placeholder-anon-key'

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL'
const ANON_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'
const KEYS = [URL_KEY, ANON_KEY]

/**
 * @param {object} options
 * @param {'dev'|'stage'|'prod'} options.variant
 * @param {Record<string, string | undefined>} options.env  process.env
 * @param {(name: string) => string | undefined} options.readFromEnvFiles  value from a root env file
 * @returns {{ env: Record<string, string>, source: string, usingPlaceholders: boolean, url: string | undefined }}
 */
function resolveSupabaseEnv({ variant, env, readFromEnvFiles }) {
  const resolved = {}
  /** The effective URL, including one left to Next.js, so the build can print its ref. */
  let effectiveUrl
  let source

  for (const key of KEYS) {
    const suffixed = `${key}_${variant.toUpperCase()}`

    if (env[suffixed]) {
      resolved[key] = env[suffixed]
      if (key === URL_KEY) effectiveUrl = env[suffixed]
      source = `${suffixed} (environment)`
      continue
    }

    if (variant === 'prod') {
      // No fallback for prod: inheriting a stage value here is the failure this exists
      // to prevent, and it would not be visible in the resulting APK.
      throw new Error(
        `Building the prod shell requires ${suffixed}. The repo-root env files point at stage, ` +
          `and inheriting them would ship a prod app talking to a non-prod project.`
      )
    }

    if (env[key]) {
      resolved[key] = env[key]
      if (key === URL_KEY) effectiveUrl = env[key]
      source = source ?? `${key} (environment)`
      continue
    }

    const fromFile = readFromEnvFiles(key)
    if (fromFile) {
      // Deliberately not copied into the child environment: Next.js loads the root env
      // file itself, and an explicit variable would take precedence over it. The value
      // is still read so the build can report which project it resolves to.
      if (key === URL_KEY) effectiveUrl = fromFile
      source = source ?? 'root env file'
      continue
    }

    resolved[key] = key === URL_KEY ? PLACEHOLDER_URL : PLACEHOLDER_KEY
    if (key === URL_KEY) effectiveUrl = PLACEHOLDER_URL
    source = source ?? 'placeholders'
  }

  return {
    env: resolved,
    source: source ?? 'placeholders',
    usingPlaceholders: effectiveUrl === PLACEHOLDER_URL,
    url: effectiveUrl,
  }
}

/** The project ref, for printing — never the key. Refs are public; they ship in every bundle. */
function projectRef(url) {
  if (!url) return 'unknown'
  try {
    return new URL(url).hostname.split('.')[0]
  } catch {
    return 'unparseable'
  }
}

module.exports = { resolveSupabaseEnv, projectRef, PLACEHOLDER_URL, PLACEHOLDER_KEY }
