// Supabase Edge Function `mcp` — remote MCP server for the notebook.
//
// Authorization follows the MCP spec: this function is an OAuth resource
// server, Supabase Auth (OAuth 2.1 Server) is the authorization server.
//   * GET  /mcp/.well-known/oauth-protected-resource  → RFC 9728 metadata (public)
//   * POST /mcp without a valid bearer token           → 401 + WWW-Authenticate
//   * POST /mcp with a Supabase user JWT               → Streamable HTTP JSON-RPC
//
// Data access happens through a client that carries the user's token, so RLS
// is enforced by Postgres. The service-role key is never used here.
//
// Deploy with gateway JWT verification disabled (see supabase/config.toml):
//   supabase functions deploy mcp --no-verify-jwt

import { createClient } from '@supabase/supabase-js'
import { WebStandardStreamableHTTPServerTransport } from '@modelcontextprotocol/sdk/server/webStandardStreamableHttp.js'

import { createNotebookMcpServer } from '@core/mcp/notebookServer.ts'
import { createSupabaseNotebookRepository } from '@core/mcp/supabaseNotebookRepository.ts'
import {
  buildAuthorizationServerIssuer,
  buildProtectedResourceMetadata,
  buildResourceMetadataUrl,
  buildResourceUrl,
  buildWwwAuthenticateHeader,
  classifyMcpRoute,
  extractBearerToken,
  resolvePublicOrigin,
  type BearerChallengeError,
} from '@core/mcp/oauthResource.ts'

const CORS_HEADERS: Record<string, string> = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers':
    'authorization, x-client-info, apikey, content-type, accept, mcp-protocol-version, mcp-session-id, last-event-id',
  'Access-Control-Allow-Methods': 'GET, POST, DELETE, OPTIONS',
  'Access-Control-Expose-Headers': 'mcp-session-id, mcp-protocol-version, www-authenticate',
}

const jsonResponse = (body: unknown, status = 200, extraHeaders: Record<string, string> = {}) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS_HEADERS, 'Content-Type': 'application/json', ...extraHeaders },
  })

const unauthorized = (resourceMetadataUrl: string, error?: BearerChallengeError, description?: string) =>
  jsonResponse(
    { error: error ?? 'unauthorized', error_description: description ?? 'Authentication required' },
    401,
    { 'WWW-Authenticate': buildWwwAuthenticateHeader({ resourceMetadataUrl, error, errorDescription: description }) },
  )

const withCors = (response: Response): Response => {
  const headers = new Headers(response.headers)
  for (const [name, value] of Object.entries(CORS_HEADERS)) {
    headers.set(name, value)
  }
  return new Response(response.body, { status: response.status, statusText: response.statusText, headers })
}

const handleRequest = async (req: Request): Promise<Response> => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: CORS_HEADERS })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY')
  if (!supabaseUrl || !anonKey) {
    console.error('mcp: missing SUPABASE_URL or SUPABASE_ANON_KEY')
    return jsonResponse({ error: 'Function not configured' }, 500)
  }

  const route = classifyMcpRoute(new URL(req.url).pathname)
  if (route === 'unknown') {
    return jsonResponse({ error: 'Not found' }, 404)
  }

  const publicOrigin = resolvePublicOrigin({
    requestUrl: req.url,
    forwardedHost: req.headers.get('x-forwarded-host'),
    forwardedProto: req.headers.get('x-forwarded-proto'),
    supabaseUrl,
    publicOriginOverride: Deno.env.get('MCP_PUBLIC_ORIGIN'),
  })
  const resourceUrl = buildResourceUrl(publicOrigin)
  const authorizationServer = Deno.env.get('MCP_AUTH_ISSUER')?.trim() || buildAuthorizationServerIssuer(publicOrigin)

  if (route === 'metadata') {
    if (req.method !== 'GET' && req.method !== 'HEAD') {
      return jsonResponse({ error: 'Method not allowed' }, 405)
    }
    // Optional, comma-separated (e.g. "openid,email,offline_access"): lets clients request
    // refresh tokens without a code change. Omitted by default so Supabase applies its defaults.
    const scopesSupported = (Deno.env.get('MCP_SCOPES_SUPPORTED') ?? '')
      .split(',')
      .map((scope) => scope.trim())
      .filter(Boolean)
    return jsonResponse(buildProtectedResourceMetadata({ resourceUrl, authorizationServer, scopesSupported }), 200, {
      'Cache-Control': 'public, max-age=300',
    })
  }

  const resourceMetadataUrl = buildResourceMetadataUrl(resourceUrl)
  const token = extractBearerToken(req.headers.get('Authorization'))
  if (!token) {
    return unauthorized(resourceMetadataUrl)
  }

  // Anon key + the user's token: every query below runs under RLS as that user.
  const supabase = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: `Bearer ${token}` } },
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
  })

  const { data, error } = await supabase.auth.getUser(token)
  if (error || !data?.user) {
    return unauthorized(resourceMetadataUrl, 'invalid_token', 'The access token is invalid or has expired')
  }
  const userId = data.user.id

  const server = createNotebookMcpServer(createSupabaseNotebookRepository(supabase, userId))
  // Stateless: Edge Functions are short-lived and multi-instance, so no session ids and plain JSON responses.
  const transport = new WebStandardStreamableHTTPServerTransport({
    sessionIdGenerator: undefined,
    enableJsonResponse: true,
  })

  try {
    await server.connect(transport)
    const response = await transport.handleRequest(req, {
      authInfo: { token, clientId: 'supabase-oauth', scopes: [], extra: { userId } },
    })
    return withCors(response)
  } catch (err) {
    console.error('mcp: request handling failed', err)
    return jsonResponse({ error: 'Internal error' }, 500)
  }
}

Deno.serve(handleRequest)
