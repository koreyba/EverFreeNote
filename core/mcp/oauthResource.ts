// OAuth 2.0 "protected resource" helpers for the MCP Edge Function.
//
// The MCP authorization spec treats the MCP server as an OAuth resource server
// (RFC 9728 metadata + RFC 6750 bearer challenges) and Supabase Auth as the
// authorization server. Everything here is pure so it can be unit-tested in
// Node and reused verbatim from Deno.

/** Path of the Edge Function relative to the Supabase API origin. */
export const MCP_FUNCTION_PATH = '/functions/v1/mcp'

/** Well-known suffix, served under the function path (the function cannot serve the project root). */
export const PROTECTED_RESOURCE_METADATA_SUFFIX = '/.well-known/oauth-protected-resource'

export type ProtectedResourceMetadata = {
  resource: string
  authorization_servers: string[]
  bearer_methods_supported: string[]
  resource_name: string
  scopes_supported?: string[]
}

export type McpRoute = 'mcp' | 'metadata' | 'unknown'

export type BearerChallengeError = 'invalid_request' | 'invalid_token' | 'insufficient_scope'

const trimTrailingSlashes = (value: string) => value.replace(/\/+$/, '')

/** Classifies a request path as the MCP endpoint, the metadata document, or something else. */
export function classifyMcpRoute(pathname: string): McpRoute {
  const withoutGatewayPrefix = pathname.replace(/^\/functions\/v1(?=\/)/, '')
  const normalized = trimTrailingSlashes(withoutGatewayPrefix) || '/'

  if (normalized === '/mcp') return 'mcp'
  if (normalized === `/mcp${PROTECTED_RESOURCE_METADATA_SUFFIX}`) return 'metadata'
  return 'unknown'
}

export type PublicOriginSource = {
  requestUrl: string
  forwardedHost?: string | null
  forwardedProto?: string | null
  supabaseUrl?: string | null
  publicOriginOverride?: string | null
}

const firstHeaderValue = (value: string | null | undefined) => value?.split(',')[0]?.trim() ?? ''

const safeOrigin = (value: string): string | null => {
  try {
    return new URL(value).origin
  } catch {
    return null
  }
}

/**
 * Resolves the origin that AI clients use to reach this project.
 * Order: explicit override → X-Forwarded-* headers → SUPABASE_URL → request URL.
 */
export function resolvePublicOrigin(source: PublicOriginSource): string {
  const override = source.publicOriginOverride?.trim()
  if (override) {
    const origin = safeOrigin(override)
    if (origin) return origin
  }

  const forwardedHost = firstHeaderValue(source.forwardedHost)
  if (forwardedHost) {
    const proto = firstHeaderValue(source.forwardedProto) || 'https'
    const origin = safeOrigin(`${proto}://${forwardedHost}`)
    if (origin) return origin
  }

  const supabaseOrigin = source.supabaseUrl ? safeOrigin(source.supabaseUrl) : null
  if (supabaseOrigin) return supabaseOrigin

  return safeOrigin(source.requestUrl) ?? ''
}

export function buildResourceUrl(publicOrigin: string): string {
  return `${trimTrailingSlashes(publicOrigin)}${MCP_FUNCTION_PATH}`
}

export function buildResourceMetadataUrl(resourceUrl: string): string {
  return `${trimTrailingSlashes(resourceUrl)}${PROTECTED_RESOURCE_METADATA_SUFFIX}`
}

/** Supabase Auth issuer for a given API origin. */
export function buildAuthorizationServerIssuer(publicOrigin: string): string {
  return `${trimTrailingSlashes(publicOrigin)}/auth/v1`
}

export function buildProtectedResourceMetadata(params: {
  resourceUrl: string
  authorizationServer: string
  resourceName?: string
  scopesSupported?: string[]
}): ProtectedResourceMetadata {
  const metadata: ProtectedResourceMetadata = {
    resource: trimTrailingSlashes(params.resourceUrl),
    authorization_servers: [trimTrailingSlashes(params.authorizationServer)],
    bearer_methods_supported: ['header'],
    resource_name: params.resourceName ?? 'EverFreeNote notebook',
  }

  if (params.scopesSupported && params.scopesSupported.length > 0) {
    metadata.scopes_supported = [...params.scopesSupported]
  }

  return metadata
}

const quoteHeaderValue = (value: string) => `"${value.replace(/["\\\r\n]/g, ' ').trim()}"`

/**
 * Builds the `WWW-Authenticate` challenge that tells MCP clients where to find
 * the protected-resource metadata (and, optionally, why the request failed).
 */
export function buildWwwAuthenticateHeader(params: {
  resourceMetadataUrl: string
  error?: BearerChallengeError
  errorDescription?: string
}): string {
  const parts = [`resource_metadata=${quoteHeaderValue(params.resourceMetadataUrl)}`]

  if (params.error) {
    parts.push(`error=${quoteHeaderValue(params.error)}`)
  }
  if (params.errorDescription) {
    parts.push(`error_description=${quoteHeaderValue(params.errorDescription)}`)
  }

  return `Bearer ${parts.join(', ')}`
}

/** Extracts the token from an `Authorization: Bearer …` header; `null` when absent or malformed. */
export function extractBearerToken(authorizationHeader: string | null | undefined): string | null {
  if (!authorizationHeader) return null

  const match = /^\s*Bearer\s+(.+?)\s*$/i.exec(authorizationHeader)
  if (!match) return null

  const token = match[1]
  return token && !/\s/.test(token) ? token : null
}
