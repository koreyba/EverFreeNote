import {
  PLACEHOLDER_URL,
  projectRef,
  resolveSupabaseEnv,
  type SupabaseEnvResolution as Resolved,
} from '@ui/shell/scripts/supabaseEnv'

const URL_KEY = 'NEXT_PUBLIC_SUPABASE_URL'
const KEY_KEY = 'NEXT_PUBLIC_SUPABASE_ANON_KEY'

const resolve = (
  variant: 'dev' | 'stage' | 'prod',
  env: Record<string, string | undefined>,
  envFiles: Record<string, string> = {}
): Resolved => resolveSupabaseEnv({ variant, env, readFromEnvFiles: (n: string) => envFiles[n] })

describe('resolveSupabaseEnv', () => {
  it('prefers the variant-suffixed values', () => {
    const result = resolve('stage', {
      [URL_KEY]: 'https://generic.supabase.co',
      [`${URL_KEY}_STAGE`]: 'https://stageref.supabase.co',
      [`${KEY_KEY}_STAGE`]: 'stage-key',
    })

    expect(result.env[URL_KEY]).toBe('https://stageref.supabase.co')
    expect(result.env[KEY_KEY]).toBe('stage-key')
  })

  it('lets stage fall back to the generic values', () => {
    const result = resolve('stage', { [URL_KEY]: 'https://generic.supabase.co', [KEY_KEY]: 'k' })

    expect(result.env[URL_KEY]).toBe('https://generic.supabase.co')
  })

  it('refuses to build prod from inherited credentials', () => {
    // The repo-root env files point at stage; inheriting them would ship a prod-branded
    // app talking to a non-prod project, invisibly.
    expect(() => resolve('prod', { [URL_KEY]: 'https://stageref.supabase.co' })).toThrow(
      /requires NEXT_PUBLIC_SUPABASE_URL_PROD/
    )
    expect(() => resolve('prod', {}, { [URL_KEY]: 'https://stageref.supabase.co' })).toThrow(
      /requires NEXT_PUBLIC_SUPABASE_URL_PROD/
    )
  })

  it('builds prod when given explicit prod values', () => {
    const result = resolve('prod', {
      [`${URL_KEY}_PROD`]: 'https://prodref.supabase.co',
      [`${KEY_KEY}_PROD`]: 'prod-key',
    })

    expect(result.env[URL_KEY]).toBe('https://prodref.supabase.co')
    expect(result.usingPlaceholders).toBe(false)
  })

  it('leaves values defined in a root env file to Next.js, but still reports them', () => {
    const result = resolve('dev', {}, {
      [URL_KEY]: 'https://fileref.supabase.co',
      [KEY_KEY]: 'file-key',
    })

    // Setting them here would override .env.local, which Next.js loads itself.
    expect(result.env[URL_KEY]).toBeUndefined()
    expect(result.source).toContain('root env file')
    expect(result.usingPlaceholders).toBe(false)
    // Still surfaced, so the build can print which project it is about to talk to.
    expect(projectRef(result.url)).toBe('fileref')
  })

  it('falls back to placeholders when nothing supplies credentials', () => {
    const result = resolve('dev', {})

    expect(result.env[URL_KEY]).toBe(PLACEHOLDER_URL)
    expect(result.usingPlaceholders).toBe(true)
  })
})

describe('projectRef', () => {
  it.each([
    ['https://yabcuywqxgjlruuyhwin.supabase.co', 'yabcuywqxgjlruuyhwin'],
    [undefined, 'unknown'],
    ['not a url', 'unparseable'],
  ])('renders %p as %p', (url, expected) => {
    expect(projectRef(url)).toBe(expected)
  })
})
