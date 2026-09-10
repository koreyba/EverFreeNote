import {
  MCP_FUNCTION_PATH,
  PROTECTED_RESOURCE_METADATA_SUFFIX,
  buildAuthorizationServerIssuer,
  buildProtectedResourceMetadata,
  buildResourceMetadataUrl,
  buildResourceUrl,
  buildWwwAuthenticateHeader,
  classifyMcpRoute,
  extractBearerToken,
  resolvePublicOrigin,
} from '@core/mcp/oauthResource'

describe('core/mcp/oauthResource', () => {
  describe('classifyMcpRoute', () => {
    it('recognises the MCP endpoint with and without the gateway prefix', () => {
      expect(classifyMcpRoute('/mcp')).toBe('mcp')
      expect(classifyMcpRoute('/mcp/')).toBe('mcp')
      expect(classifyMcpRoute('/functions/v1/mcp')).toBe('mcp')
      expect(classifyMcpRoute('/functions/v1/mcp/')).toBe('mcp')
    })

    it('recognises the protected resource metadata document', () => {
      expect(classifyMcpRoute(`/mcp${PROTECTED_RESOURCE_METADATA_SUFFIX}`)).toBe('metadata')
      expect(classifyMcpRoute(`/functions/v1/mcp${PROTECTED_RESOURCE_METADATA_SUFFIX}/`)).toBe('metadata')
    })

    it('rejects everything else', () => {
      expect(classifyMcpRoute('/')).toBe('unknown')
      expect(classifyMcpRoute('/mcp/other')).toBe('unknown')
      expect(classifyMcpRoute('/functions/v1/other')).toBe('unknown')
      expect(classifyMcpRoute('/functions/v1')).toBe('unknown')
      expect(classifyMcpRoute('/mcpx')).toBe('unknown')
    })
  })

  describe('resolvePublicOrigin', () => {
    const requestUrl = 'http://kong:8000/functions/v1/mcp'

    it('prefers the explicit override', () => {
      expect(
        resolvePublicOrigin({
          requestUrl,
          forwardedHost: 'proxy.example',
          supabaseUrl: 'https://ref.supabase.co',
          publicOriginOverride: 'https://api.everfreenote.app/ignored/path',
        }),
      ).toBe('https://api.everfreenote.app')
    })

    it('ignores an invalid override and falls through', () => {
      expect(
        resolvePublicOrigin({ requestUrl, publicOriginOverride: 'not a url', supabaseUrl: 'https://ref.supabase.co' }),
      ).toBe('https://ref.supabase.co')
    })

    it('uses forwarded headers, defaulting the protocol to https', () => {
      expect(resolvePublicOrigin({ requestUrl, forwardedHost: 'ref.supabase.co' })).toBe('https://ref.supabase.co')
      expect(
        resolvePublicOrigin({ requestUrl, forwardedHost: '127.0.0.1:54321, proxy', forwardedProto: 'http, https' }),
      ).toBe('http://127.0.0.1:54321')
    })

    it('falls back to SUPABASE_URL and then to the request URL', () => {
      expect(resolvePublicOrigin({ requestUrl, supabaseUrl: 'https://ref.supabase.co/' })).toBe('https://ref.supabase.co')
      expect(resolvePublicOrigin({ requestUrl })).toBe('http://kong:8000')
      expect(resolvePublicOrigin({ requestUrl, supabaseUrl: '::broken' })).toBe('http://kong:8000')
    })

    it('returns an empty string when nothing is parseable', () => {
      expect(resolvePublicOrigin({ requestUrl: 'garbage' })).toBe('')
    })
  })

  describe('URL builders', () => {
    it('builds the resource, metadata and issuer URLs from the origin', () => {
      expect(buildResourceUrl('https://ref.supabase.co/')).toBe(`https://ref.supabase.co${MCP_FUNCTION_PATH}`)
      expect(buildResourceMetadataUrl('https://ref.supabase.co/functions/v1/mcp/')).toBe(
        `https://ref.supabase.co/functions/v1/mcp${PROTECTED_RESOURCE_METADATA_SUFFIX}`,
      )
      expect(buildAuthorizationServerIssuer('https://ref.supabase.co')).toBe('https://ref.supabase.co/auth/v1')
    })
  })

  describe('buildProtectedResourceMetadata', () => {
    it('produces an RFC 9728 document with header bearer tokens', () => {
      expect(
        buildProtectedResourceMetadata({
          resourceUrl: 'https://ref.supabase.co/functions/v1/mcp/',
          authorizationServer: 'https://ref.supabase.co/auth/v1/',
        }),
      ).toEqual({
        resource: 'https://ref.supabase.co/functions/v1/mcp',
        authorization_servers: ['https://ref.supabase.co/auth/v1'],
        bearer_methods_supported: ['header'],
        resource_name: 'EverFreeNote notebook',
      })
    })

    it('includes scopes and a custom name when provided', () => {
      const metadata = buildProtectedResourceMetadata({
        resourceUrl: 'https://x/functions/v1/mcp',
        authorizationServer: 'https://x/auth/v1',
        resourceName: 'Custom',
        scopesSupported: ['notes:read'],
      })
      expect(metadata.resource_name).toBe('Custom')
      expect(metadata.scopes_supported).toEqual(['notes:read'])
    })

    it('omits scopes_supported for an empty list', () => {
      const metadata = buildProtectedResourceMetadata({
        resourceUrl: 'https://x/functions/v1/mcp',
        authorizationServer: 'https://x/auth/v1',
        scopesSupported: [],
      })
      expect(metadata).not.toHaveProperty('scopes_supported')
    })
  })

  describe('buildWwwAuthenticateHeader', () => {
    it('points at the resource metadata', () => {
      expect(buildWwwAuthenticateHeader({ resourceMetadataUrl: 'https://x/m' })).toBe(
        'Bearer resource_metadata="https://x/m"',
      )
    })

    it('adds error and description, neutralising quotes and newlines', () => {
      expect(
        buildWwwAuthenticateHeader({
          resourceMetadataUrl: 'https://x/m',
          error: 'invalid_token',
          errorDescription: 'Token "expired"\r\nreally',
        }),
      ).toBe('Bearer resource_metadata="https://x/m", error="invalid_token", error_description="Token  expired   really"')
    })
  })

  describe('extractBearerToken', () => {
    it('extracts the token case-insensitively and trims whitespace', () => {
      expect(extractBearerToken('Bearer abc.def')).toBe('abc.def')
      expect(extractBearerToken('  bearer   abc  ')).toBe('abc')
    })

    it('returns null for missing or malformed headers', () => {
      expect(extractBearerToken(null)).toBeNull()
      expect(extractBearerToken(undefined)).toBeNull()
      expect(extractBearerToken('')).toBeNull()
      expect(extractBearerToken('Basic abc')).toBeNull()
      expect(extractBearerToken('Bearer')).toBeNull()
      expect(extractBearerToken('Bearer ')).toBeNull()
      expect(extractBearerToken('Bearer two tokens')).toBeNull()
    })
  })
})
